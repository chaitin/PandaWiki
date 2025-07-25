package utils

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"
	"sync"

	"github.com/JohannesKaufmann/html-to-markdown/v2/converter"
	"github.com/JohannesKaufmann/html-to-markdown/v2/plugin/base"
	"github.com/JohannesKaufmann/html-to-markdown/v2/plugin/commonmark"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"golang.org/x/sync/semaphore"
)

type EpubConverter struct {
	logger      *log.Logger
	mu          sync.Mutex
	minioClient *s3.MinioClient
	// relative path -> oss path
	resources map[string]string
	// id -> relative path
	resourcesIdMap map[string]Item
	// relative path -> id
	relativePath map[string]string
}

func NewEpubConverter(logger *log.Logger, minio *s3.MinioClient) *EpubConverter {
	return &EpubConverter{
		logger:         logger.WithModule("epubConverter"),
		minioClient:    minio,
		resources:      make(map[string]string),
		resourcesIdMap: make(map[string]Item),
		relativePath:   make(map[string]string),
	}
}

func (e *EpubConverter) Convert(ctx context.Context, kbID string, data *multipart.FileHeader) (string, []byte, error) {
	reader, err := data.Open()
	if err != nil {
		return "", nil, err
	}
	defer reader.Close()
	zipReader, err := zip.NewReader(reader, data.Size)
	if err != nil {
		return "", nil, err
	}
	if err := valid(zipReader); err != nil {
		return "", nil, err
	}

	// read ./path/to/content.opf
	var p *Package
	if p, err = getOpf(zipReader); err != nil {
		return "", nil, err
	}

	for _, item := range p.Manifest.Items {
		e.resourcesIdMap[item.ID] = item
		e.relativePath[item.Href] = item.ID
	}

	// resolve resource file
	if err := e.uploadFile(ctx, kbID, zipReader); err != nil {
		return "", nil, err
	}

	conv := converter.NewConverter(
		converter.WithPlugins(
			base.NewBasePlugin(),
			commonmark.NewCommonmarkPlugin(
				commonmark.WithStrongDelimiter("__"),
			),
		),
	)
	conv.Register.TagType("a", converter.TagTypeRemove, converter.PriorityStandard)

	res := make(map[string]*bytes.Buffer)
	var toc []map[string]string
	for _, zipfile := range zipReader.File {
		ext := strings.ToLower(filepath.Ext(zipfile.Name))
		if ext == ".ncx" {
			file, err := zipfile.Open()
			if err != nil {
				return "", nil, err
			}
			defer file.Close()
			toc, err = ParseNCX(file)
			if err != nil {
				return "", nil, err
			}
		}
		file, err := zipfile.Open()
		if err != nil {
			return "", nil, err
		}
		defer file.Close()
		htmlStr, err := io.ReadAll(file)
		if err != nil {
			return "", nil, err
		}
		mdStr, err := conv.ConvertString((string(htmlStr)))
		if err != nil {
			return "", nil, err
		}
		e.logger.Info("convert File", "file name", clearFileName(zipfile.Name))
		res[clearFileName(zipfile.Name)] = bytes.NewBufferString(mdStr)
	}
	// page sequence
	result := bytes.NewBuffer(nil)
	for _, href := range p.Guide.References {
		if r, ok := res[clearFileName(href.Href)]; ok {
			if _, err := io.Copy(result, r); err != nil {
				return "", nil, err
			}
			result.WriteString("\n\n")
		}
	}
	result.WriteString("# 目录\n\n")
	for _, v := range toc {
		fmt.Fprintf(result, "- [%s](#%s)\n", v["title"], v["playOrder"])
	}
	temp := make(map[string]string)
	for _, v := range toc {
		temp[v["src"]] = v["playOrder"]
	}
	for _, itemRef := range p.Spine.ItemRefs {
		title := temp[e.resourcesIdMap[itemRef.IDRef].Href]
		e.logger.Debug("add File", "file name", clearFileName(e.resourcesIdMap[itemRef.IDRef].Href))
		if r, ok := res[clearFileName(e.resourcesIdMap[itemRef.IDRef].Href)]; ok {
			result.WriteString("<span id=" + title + "></span>\n\n")
			if _, err := io.Copy(result, r); err != nil {
				return "", nil, err
			}
			result.WriteString("\n\n")
		}
	}
	str, err := e.exchangeUrl(ctx, result.String())
	return p.Metadata.Title, str, err
}

func clearFileName(str string) string {
	str = filepath.Base(str)
	return strings.Split(str, "#")[0]
}

func (e *EpubConverter) uploadFile(ctx context.Context, kbID string, zipReader *zip.Reader) error {
	var wg sync.WaitGroup
	errCh := make(chan error, len(zipReader.File))
	sem := semaphore.NewWeighted(10) // 控制并发数为10

	for _, f := range zipReader.File {
		if isSkippableFile(f.Name) {
			continue
		}

		if err := sem.Acquire(ctx, 1); err != nil {
			return err // 如果获取信号量失败（如context取消），直接返回错误
		}

		wg.Add(1)

		go func(f *zip.File) {
			defer func() {
				sem.Release(1)
				wg.Done()
			}()

			if err := e.processFile(ctx, f, kbID); err != nil {
				errCh <- err
			}
		}(f)
	}

	go func() {
		wg.Wait()
		close(errCh)
	}()

	return <-errCh // 返回第一个错误（或 nil）
}

func (e *EpubConverter) processFile(ctx context.Context, f *zip.File, kbID string) error {
	file, err := f.Open()
	if err != nil {
		return fmt.Errorf("打开文件 %s 失败: %v", f.Name, err)
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(f.Name))
	ossPath := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), ext)

	e.mu.Lock()
	e.resources[f.Name] = fmt.Sprintf("/%s/%s", domain.Bucket, ossPath)
	e.mu.Unlock()
	_, err = e.minioClient.PutObject(
		ctx,
		domain.Bucket,
		ossPath,
		file,
		f.FileInfo().Size(),
		minio.PutObjectOptions{
			ContentType:  e.resourcesIdMap[e.relativePath[f.Name]].MediaType,
			UserMetadata: map[string]string{"originalname": filepath.Base(f.Name)},
		},
	)
	return err
}

func isSkippableFile(name string) bool {
	skipExts := map[string]bool{".html": true, ".css": true, ".xml": true /* 其他扩展名 */}
	return name == "META-INF/container.xml" || name == "mimetype" || skipExts[filepath.Ext(name)]
}

func (e *EpubConverter) exchangeUrl(ctx context.Context, content string) ([]byte, error) {
	// 将字符串转换为字节切片
	mdContent := []byte(content)

	// 定义 getUrl 函数，使用资源映射表替换 URL
	getUrl := func(ctx context.Context, originUrl *string) (string, error) {
		if originUrl == nil {
			return "", fmt.Errorf("originUrl is nil")
		}

		// 查找资源映射
		if newUrl, exists := e.resources[*originUrl]; exists {
			return newUrl, nil
		}

		// 未找到映射，返回原始 URL
		return *originUrl, nil
	}

	// 使用 ExchangeMarkDownImageUrl 处理 Markdown
	processedContent, err := ExchangeMarkDownImageUrl(
		ctx,
		mdContent,
		getUrl,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange URLs: %w", err)
	}

	return []byte(processedContent), nil
}

// 获取 <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
func getFullPath(zipReader *zip.Reader) (string, error) {
	// 定义 XML 结构体来匹配 container.xml 的内容
	type Rootfile struct {
		FullPath  string `xml:"full-path,attr"`
		MediaType string `xml:"media-type,attr"`
	}
	type Rootfiles struct {
		Rootfile []Rootfile `xml:"rootfile"`
	}

	type Container struct {
		XMLName   xml.Name  `xml:"container"`
		Xmlns     string    `xml:"xmlns,attr"`
		Version   string    `xml:"version,attr"`
		Rootfiles Rootfiles `xml:"rootfiles"`
	}

	for _, f := range zipReader.File {
		if f.Name == "META-INF/container.xml" {
			// parse container.xml
			r, err := f.Open()
			if err != nil {
				return "", err
			}
			defer r.Close()
			de := xml.NewDecoder(r)
			var c Container
			if err := de.Decode(&c); err != nil {
				return "", fmt.Errorf("failed to decode container.xml: %w", err)
			}
			if c.Rootfiles.Rootfile[0].FullPath == "" {
				return "", errors.New("full-path not found in container.xml")
			}
			return c.Rootfiles.Rootfile[0].FullPath, nil
		}
	}
	return "", errors.New("container.xml not found")
}

func valid(zipReader *zip.Reader) error {
	for _, f := range zipReader.File {
		if f.Name == "mimetype" {
			r, err := f.Open()
			if err != nil {
				return err
			}
			defer r.Close()
			var buf bytes.Buffer
			if _, err := buf.ReadFrom(r); err != nil {
				return fmt.Errorf("failed to read mimetype: %w", err)
			}
			if buf.String() != "application/epub+zip" {
				return errors.New("invalid mimetype")
			}
		}
	}
	return nil
}

// Package represents the root element of the OPF file
type Package struct {
	XMLName  xml.Name `xml:"package"`
	Spine    Spine    `xml:"spine"` // 内容
	Guide    Guide    `xml:"guide"` // 封面
	Manifest struct { // 资源清单
		Items []Item `xml:"item"` // 资源
	} `xml:"manifest"`
	Metadata struct { // 元数据
		Title string `xml:"dc:title"` // 标题
	} `xml:"metadata"`
}

// Spine represents the spine section of the OPF file
type Spine struct {
	Toc      string    `xml:"toc,attr"`
	ItemRefs []ItemRef `xml:"itemref"`
}

// ItemRef represents an itemref in the spine section
type ItemRef struct {
	IDRef string `xml:"idref,attr"`
}

// Guide represents the guide section of the OPF file
type Guide struct {
	References []Reference `xml:"reference"`
}

// Reference represents a reference in the guide section
type Reference struct {
	Href  string `xml:"href,attr"`
	Title string `xml:"title,attr"`
	Type  string `xml:"type,attr"`
}

// Item represents an item in the manifest section
type Item struct {
	ID        string `xml:"id,attr"`
	Href      string `xml:"href,attr"`
	MediaType string `xml:"media-type,attr"`
}

func getOpf(zipReader *zip.Reader) (*Package, error) {
	// read ./META_INF/container.xml
	opfPath, err := getFullPath(zipReader)
	if err != nil {
		return nil, err
	}
	// read ./OEBPS/content.opf
	for _, f := range zipReader.File {
		if f.Name == opfPath {
			r, err := f.Open()
			if err != nil {
				return nil, err
			}
			defer r.Close()
			var p Package
			de := xml.NewDecoder(r)
			if err := de.Decode(&p); err != nil {
				return nil, fmt.Errorf("解码OPF文件失败: %v", err)
			}
			return &p, nil
		}
	}
	return nil, errors.New("content.opf not found")
}

// NCX 结构体定义
type NCX struct {
	XMLName xml.Name `xml:"ncx"`
	NavMap  NavMap   `xml:"navMap"`
}

type NavMap struct {
	NavPoints []NavPoint `xml:"navPoint"`
}

type NavPoint struct {
	ID        string   `xml:"id,attr"`
	PlayOrder string   `xml:"playOrder,attr"`
	NavLabel  NavLabel `xml:"navLabel"`
	Content   Content  `xml:"content"`
}

type NavLabel struct {
	Text string `xml:"text"`
}

type Content struct {
	Src string `xml:"src,attr"`
}

// ParseNCX 解析 NCX 文件并返回目录信息
func ParseNCX(r io.Reader) ([]map[string]string, error) {
	var ncx NCX
	if err := xml.NewDecoder(r).Decode(&ncx); err != nil {
		return nil, fmt.Errorf("解析NCX失败: %v", err)
	}

	var toc []map[string]string
	for _, np := range ncx.NavMap.NavPoints {
		entry := map[string]string{
			"id":        np.ID,
			"playOrder": np.PlayOrder,
			"title":     np.NavLabel.Text,
			"src":       np.Content.Src,
		}
		toc = append(toc, entry)
	}

	return toc, nil
}
