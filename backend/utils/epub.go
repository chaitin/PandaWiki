package utils

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"regexp"
	"strings"

	htmltomarkdown "github.com/JohannesKaufmann/html-to-markdown/v2"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
)

type EpubConverter struct {
	logger      *log.Logger
	minioClient *s3.MinioClient
	//relative path -> oss path
	resources map[string]string
	//id -> relative path
	resourcesIdMap map[string]Item
	//relative path -> id
	relavitePath map[string]string
}

func NewEpubConverter(logger *log.Logger, minio *s3.MinioClient) *EpubConverter {
	return &EpubConverter{
		logger:         logger.WithModule("epubConverter"),
		minioClient:    minio,
		resources:      make(map[string]string),
		resourcesIdMap: make(map[string]Item),
		relavitePath:   make(map[string]string),
	}
}

func (e *EpubConverter) Convert(ctx context.Context, kbID string, data []byte) (string, []byte, error) {
	zipReader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", nil, err
	}
	if err := valid(zipReader); err != nil {
		return "", nil, err
	}

	//read ./OEBPS/content.opf
	var p *Package
	if p, err = getOpf(zipReader); err != nil {
		return "", nil, err
	}

	for _, item := range p.Manifest.Items {
		e.resourcesIdMap[item.ID] = item
		e.relavitePath[item.Href] = item.ID
	}
	if kbID == "" {
		kbID = "default_kbID"
	}
	//reslove resource file
	if err := e.uploadFile(ctx, kbID, zipReader); err != nil {
		return "", nil, err
	}

	res := make(map[string]*bytes.Buffer)
	for _, f := range zipReader.File {
		ext := strings.ToLower(filepath.Ext(f.Name))
		if ext != ".html" && ext != ".hml" && ext != ".xhtml" {
			continue
		}
		F, err := f.Open()
		if err != nil {
			return "", nil, err
		}
		defer F.Close()
		htmlStr, err := io.ReadAll(F)
		if err != nil {
			return "", nil, err
		}
		mdStr, err := htmltomarkdown.ConvertString(preprocess(string(htmlStr)))
		if err != nil {
			return "", nil, err
		}
		res[filepath.Base(f.Name)] = bytes.NewBufferString(mdStr)
	}
	//page sequence
	result := &bytes.Buffer{}
	for _, itemRef := range p.Spine.ItemRefs {
		io.Copy(result, res[e.resourcesIdMap[itemRef.IDRef].Href])
		result.WriteString("\n\n")
	}
	str, err := e.exchangeUrl(result.String())
	return p.Metadata.Title, str, err
}

func (e *EpubConverter) uploadFile(ctx context.Context, kbID string, zipReader *zip.Reader) error {

	for _, f := range zipReader.File {
		if f.Name == "META-INF/container.xml" || f.Name == "mimetype" {
			continue
		}

		ext := strings.ToLower(filepath.Ext(f.Name))

		if ext == ".html" || ext == ".hml" || ext == ".css" || ext == ".xml" || ext == ".nck" || ext == ".opf" {
			continue
		}
		//图片 视频 音频
		F, err := f.Open()
		if err != nil {
			return err
		}

		go func() {
			defer F.Close()
			ossPath := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), ext)
			e.resources[f.Name] = fmt.Sprintf("/%s/%s", domain.Bucket, ossPath)
			_, name := filepath.Split(f.Name)
			e.minioClient.PutObject(
				ctx,
				domain.Bucket,
				ossPath,
				F,
				f.FileInfo().Size(),
				minio.PutObjectOptions{
					ContentType: e.resourcesIdMap[e.relavitePath[f.Name]].MediaType,
					UserMetadata: map[string]string{
						"originalname": name,
					},
				},
			)
		}()

	}
	return nil
}

func (e *EpubConverter) exchangeUrl(content string) ([]byte, error) {
	re := regexp.MustCompile(`!\[\]\((.*?)\)`)
	// 替换匹配到的内容，保留捕获的 URL
	newContent := re.ReplaceAllStringFunc(content, func(match string) string {
		// 提取捕获的 URL
		url := re.ReplaceAllString(match, `$1`)
		// 返回替换后的字符串，保留原来的 URL
		if e.resources[url] != "" {
			return fmt.Sprintf(`![](%s)`, e.resources[url])
		}
		return fmt.Sprintf(`![](%s)`, url)
	})
	return []byte(newContent), nil
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
			//parse container.xml
			r, err := f.Open()
			if err != nil {
				return "", err
			}
			defer r.Close()
			de := xml.NewDecoder(r)
			var c Container
			de.Decode(&c)
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
			buf.ReadFrom(r)
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
	Guide    Guide    `xml:"guide"` //封面
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
	//read ./META_INF/container.xml
	opfPath, err := getFullPath(zipReader)
	if err != nil {
		return nil, err
	}
	//read ./OEBPS/content.opf
	for _, f := range zipReader.File {
		if f.Name == opfPath {
			r, err := f.Open()
			if err != nil {
				return nil, err
			}
			defer r.Close()
			var p Package
			de := xml.NewDecoder(r)
			de.Decode(&p)
			return &p, nil
		}
	}
	return nil, errors.New("content.opf not found")
}

func preprocess(html string) string {
	// 匹配自闭合 <a> 标签（如 <a /> 或 <a href="/" />）
	re := regexp.MustCompile(`<a\s+([^>]*?)/>`)
	// 替换为 <a $1></a>
	html = re.ReplaceAllString(html, `<a $1></a>`)
	// 匹配 <a> 标签中的 href 属性
	re = regexp.MustCompile(`\s+href="[^"]*"`)
	// 替换为空字符串，即移除 href 属性
	html = re.ReplaceAllString(html, "")
	return html
}
