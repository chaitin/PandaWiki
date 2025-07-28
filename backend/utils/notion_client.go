package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/jomei/notionapi"
	"github.com/minio/minio-go/v7"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/s3"
)

// Block represents a Notion block
type ImageBlock struct {
	Object      string `json:"object"`
	ID          string `json:"id"`
	ParentID    string `json:"parent_id"`
	HasChildren bool   `json:"has_children"`
	Type        string `json:"type"`
	Image       Image  `json:"image"`
}

// Image represents an image block in Notion
type Image struct {
	Caption []interface{} `json:"caption"`
	Type    string        `json:"type"`
	File    File          `json:"file"`
}

// File represents the file details of an image block
type File struct {
	URL string `json:"url"`
}

type NotionClient struct {
	kbID        string
	root        *ProcessorTree
	token       string
	client      *notionapi.Client
	logger      *log.Logger
	minioClient *s3.MinioClient
}

func (c *NotionClient) GetTreeRes() ([]byte, error) {
	return c.root.GetResult()
}

func NewNotionClient(token string, logger *log.Logger, kbID string, minioClient *s3.MinioClient) *NotionClient {
	return &NotionClient{
		kbID:        kbID,
		minioClient: minioClient,
		root:        NewProcessorTree(),
		token:       token,
		logger:      logger.WithModule("usecase.NotionClient"),
		client:      notionapi.NewClient(notionapi.Token(token)),
	}
}

// titleContain 表示按标题搜索含有titleContain的页面
func (c *NotionClient) GetList(ctx context.Context, titleContain string) ([]domain.PageInfo, error) {
	res, err := c.client.Search.Do(ctx, &notionapi.SearchRequest{
		Query: titleContain,
		Filter: notionapi.SearchFilter{
			Property: "object",
			Value:    "page",
		},
	})
	if err != nil {
		return nil, err
	}
	var result []domain.PageInfo
	for _, page := range res.Results {
		var id, title string
		switch page.GetObject().String() {
		case "page":
			page := page.(*notionapi.Page)
			id = page.ID.String()
			if titleProp, ok := page.Properties["title"].(*notionapi.TitleProperty); ok {
				if len(titleProp.Title) > 0 {
					title = titleProp.Title[0].PlainText
				}
			} else if titleProp, ok := page.Properties["Name"].(*notionapi.TitleProperty); ok {
				if len(titleProp.Title) > 0 {
					title = titleProp.Title[0].PlainText
				}
			}
		case "block":
			id = page.(notionapi.Block).GetID().String()
		case "database":
			id = page.(*notionapi.Database).ID.String()
		default:
		}
		if title != "" {
			result = append(result, domain.PageInfo{
				Id:    id,
				Title: title,
			})
		}
	}
	return result, nil
}

func (c *NotionClient) GetPageContent(ctx context.Context, Page domain.PageInfo) (*domain.Page, error) {
	err := c.getBlock(ctx, Page.Id, "", c.root.root)
	if err != nil {
		return nil, fmt.Errorf("get Page %s error: %s", Page.Id, err.Error())
	}
	res, err := c.GetTreeRes()
	if err != nil {
		return nil, fmt.Errorf("get Page %s content error: %s", Page.Id, err.Error())
	}
	c.logger.Debug("get Page content", log.String("page_id", Page.Id), log.String("content", string(res)))

	return &domain.Page{
		ID:      Page.Id,
		Title:   Page.Title,
		Content: string(res),
	}, nil
}

func (c *NotionClient) getBlock(ctx context.Context, id string, prefix string, node *Node) error {
	b, err := c.client.Block.Get(ctx, notionapi.BlockID(id))
	if err != nil {
		c.logger.Error("get block error", log.String("block_id", id), log.Error(err))
		return fmt.Errorf("get block %s error: %s", id, err.Error())
	}
	if b.GetType() == notionapi.BlockType(notionapi.BlockTypeUnsupported) {
		c.logger.Error("get block error", log.String("block_id", id), log.Error(err), log.String("block_type", b.GetType().String()))
		return nil
	}
	res := c.BlockToMarkdown(ctx, b)
	err = c.root.Add(node, []byte(prefix+res))
	// if type is table, return
	if b.GetType() == notionapi.BlockType(notionapi.BlockTypeTableBlock) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("add data %s error: %s", id, err.Error())
	}
	if !b.GetHasChildren() {
		return nil
	}

	children, err := c.client.Block.GetChildren(ctx, notionapi.BlockID(id), &notionapi.Pagination{})
	if err != nil {
		c.logger.Info("get block's children error", log.String("block_id", id), log.Error(err))
		return fmt.Errorf("get block's children %s error: %s", id, err.Error())
	}
	wg := sync.WaitGroup{}
	for _, children := range children.Results {

		Id := children.GetID().String()
		if children.GetType().String() == string(notionapi.BlockTypeBulletedListItem) {
			prefix += "	"
		}
		nowNode, err := c.root.GetNode(node)
		if err != nil {
			return fmt.Errorf("get node %s error: %s", id, err.Error())
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := c.getBlock(ctx, Id, prefix, nowNode); err != nil {
				c.logger.Error("get block's children error", log.String("block_id", id), log.Error(err))
			}
		}()

	}
	wg.Wait()
	return nil
}

func (c *NotionClient) GetPages(ctx context.Context, req []domain.PageInfo) ([]*notionapi.Page, error) {
	var result []*notionapi.Page

	for _, r := range req {
		page, err := c.client.Page.Get(ctx, notionapi.PageID(r.Id))
		if err != nil {
			return nil, err
		}
		result = append(result, page)
	}
	return result, nil
}

func (c *NotionClient) BlockToMarkdown(ctx context.Context, block notionapi.Block) string {
	switch block.GetType() {
	case notionapi.BlockTypeHeading1:
		return fmt.Sprintf("# %s\n", block.GetRichTextString())
	case notionapi.BlockTypeParagraph:
		return fmt.Sprintf("%s\n", block.GetRichTextString())
	case notionapi.BlockTypeHeading2:
		return fmt.Sprintf("## %s\n", block.GetRichTextString())
	case notionapi.BlockTypeHeading3:
		return fmt.Sprintf("### %s\n", block.GetRichTextString())
	case notionapi.BlockTypeBulletedListItem:
		return fmt.Sprintf("- %s\n", block.GetRichTextString())
	case notionapi.BlockTypeNumberedListItem:
		num := c.getNumberedListNumber(ctx, block)
		return fmt.Sprintf("%d. %s\n", num, block.GetRichTextString())
	case notionapi.BlockTypeToggle:
		return fmt.Sprintf("::: toggle\n%s\n:::\n", block.GetRichTextString())
	case notionapi.BlockTypeQuote:
		return fmt.Sprintf("> %s\n", block.GetRichTextString())
	case notionapi.BlockTypeCode:
		return fmt.Sprintf("```\n%s\n```\n", block.GetRichTextString())
	case notionapi.BlockTypeTableRowBlock:

		cells := block.(*notionapi.TableRowBlock).TableRow.Cells
		nums := len(cells)
		buf := strings.Builder{}
		buf.WriteString("| ")
		for i := 0; i < nums; i++ {
			if len(cells[i]) > 0 {
				buf.WriteString(cells[i][0].PlainText)
			}
			if i != nums-1 {
				buf.WriteString(" | ")
			}
		}
		buf.WriteString(" |\n")
		return buf.String()

	case notionapi.BlockTypeTableBlock:
		ch, _ := c.client.Block.GetChildren(ctx, notionapi.BlockID(block.GetID().String()), &notionapi.Pagination{})

		var res strings.Builder

		for i, temp := range ch.Results {
			res.Write([]byte(c.BlockToMarkdown(ctx, temp)))
			if i == 0 {
				len := len(temp.(*notionapi.TableRowBlock).TableRow.Cells)
				for j := 0; j < len; j++ {
					res.Write([]byte("| --- "))
				}
				res.Write([]byte("|\n"))
			}
		}
		return res.String()

	case notionapi.BlockTypeDivider:
		return "---\n"
	case notionapi.BlockTypeVideo:
		url := block.(*notionapi.AudioBlock).Audio.GetURL()
		return fmt.Sprintf("<iframe src=\"%s\" width=\"300\" height=\"200\" frameborder=\"0\" allowfullscreen></iframe>", url)
	case notionapi.BlockTypeEmbed:
		url := block.(notionapi.EmbedBlock).Embed.URL
		return fmt.Sprintf("{%s}", url)
	case notionapi.BlockTypeCallout:
		return fmt.Sprintf("⚠️ %s\n", block.GetRichTextString())
	case notionapi.BlockTypeToDo:
		if block.(*notionapi.ToDoBlock).ToDo.Checked {
			return fmt.Sprintf("- [x] %s\n", block.GetRichTextString())
		}
		return fmt.Sprintf("- [ ] %s\n", block.GetRichTextString())
	case notionapi.BlockTypeImage:
		url, err := c.getImageURL(ctx, block)
		if err != nil {
			return err.Error()
		}
		return fmt.Sprintf("![%s](%s)\n", "", url)
	default:
		return ""
	}
}

func (c *NotionClient) getImageURL(ctx context.Context, block notionapi.Block) (string, error) {
	url := "https://api.notion.com/v1/blocks/" + block.GetID().String()
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Add("Authorization", "Bearer "+c.token)
	req.Header.Add("Notion-Version", "2021-08-16")
	req.Header.Add("Content-Type", "application/json")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var data ImageBlock
	err = json.NewDecoder(resp.Body).Decode(&data)
	if err != nil {
		return "", err
	}

	return c.UploadImage(ctx, data.Image.File.URL, c.kbID)
}

// 获取当前ListBlock的序号
func (c *NotionClient) getNumberedListNumber(ctx context.Context, block notionapi.Block) int {
	parentId := block.GetParent().BlockID.String()
	children, err := c.client.Block.GetChildren(ctx, notionapi.BlockID(parentId), &notionapi.Pagination{})
	if err != nil {
		return 1
	}
	i := 0
	for _, child := range children.Results {

		if child.GetID().String() == block.GetID().String() {
			return i + 1
		}
		if child.GetType() == notionapi.BlockTypeNumberedListItem {
			i++
		}
	}
	return i
}

func (c *NotionClient) UploadImage(ctx context.Context, imageURL string, kbID string) (string, error) {
	resp, err := http.Get(imageURL)
	if err != nil {
		return "", fmt.Errorf("failed to fetch image: %v", err)
	}
	defer resp.Body.Close()

	// 检查状态码
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP request failed with status: %s", resp.Status)
	}

	// 获取图片名称（从 URL 路径中提取）
	parsedURL, err := url.Parse(imageURL)
	if err != nil {
		return "", fmt.Errorf("failed to parse URL: %v", err)
	}
	_, filename := filepath.Split(parsedURL.Path)
	// 解码可能的 URL 编码（如中文文件名）
	decodedName, err := url.PathUnescape(filename)
	if err != nil {
		decodedName = filename // 如果解码失败，使用原始名称
	}

	// 获取 Content-Type
	contentType := resp.Header.Get("Content-Type")

	ext := strings.ToLower(filepath.Ext(decodedName))
	if contentType == "" {
		// 如果未提供 Content-Type，尝试从文件名推断
		contentType = mime.TypeByExtension(ext)
		if contentType == "" {
			contentType = "application/octet-stream"
		}
	}
	if kbID == "" {
		kbID = "default_kbID"
	}
	imgName := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), ext)

	if _, err := c.minioClient.PutObject(
		ctx,
		domain.Bucket,
		imgName,
		resp.Body,
		resp.ContentLength,
		minio.PutObjectOptions{
			ContentType: contentType,
			UserMetadata: map[string]string{
				"originalname": decodedName,
			},
		},
	); err != nil {
		return "", fmt.Errorf("failed to upload image to MinIO: %v", err)
	}
	return fmt.Sprintf("/%s/%s", domain.Bucket, imgName), nil
}
