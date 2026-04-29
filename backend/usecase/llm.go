package usecase

import (
	"context"
	"errors"
	"fmt"
	"io"
	"slices"
	"strings"
	"time"

	modelkit "github.com/chaitin/ModelKit/v2/usecase"
	"github.com/cloudwego/eino-ext/components/model/deepseek"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/components/prompt"
	"github.com/cloudwego/eino/schema"
	"github.com/pkoukk/tiktoken-go"
	"github.com/samber/lo"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/rag"
	"github.com/chaitin/panda-wiki/utils"
)

type LLMUsecase struct {
	rag                rag.RAGService
	conversationRepo   *pg.ConversationRepository
	kbRepo             *pg.KnowledgeBaseRepository
	nodeRepo           *pg.NodeRepository
	modelRepo          *pg.ModelRepository
	promptRepo         *pg.PromptRepo
	categoryPromptRepo *pg.CategoryPromptRepo
	config             *config.Config
	logger             *log.Logger
	modelkit           *modelkit.ModelKit
}

const (
	summaryChunkTokenLimit = 30720 // 30KB tokens per chunk
	summaryMaxChunks       = 4     // max chunks to process for summary
)

func NewLLMUsecase(config *config.Config, rag rag.RAGService, conversationRepo *pg.ConversationRepository, kbRepo *pg.KnowledgeBaseRepository, nodeRepo *pg.NodeRepository, modelRepo *pg.ModelRepository, promptRepo *pg.PromptRepo, categoryPromptRepo *pg.CategoryPromptRepo, logger *log.Logger) *LLMUsecase {
	tiktoken.SetBpeLoader(&utils.Localloader{})
	modelkit := modelkit.NewModelKit(logger.Logger)
	return &LLMUsecase{
		config:             config,
		rag:                rag,
		conversationRepo:   conversationRepo,
		kbRepo:             kbRepo,
		nodeRepo:           nodeRepo,
		modelRepo:          modelRepo,
		promptRepo:         promptRepo,
		categoryPromptRepo: categoryPromptRepo,
		logger:             logger.WithModule("usecase.llm"),
		modelkit:           modelkit,
	}
}

func (u *LLMUsecase) BuildConversationMessageWithRAG(
	ctx context.Context,
	conversationID string,
	kbID string,
	groupIDs []int,
	systemPrompt string,
	topK int,
) ([]*schema.Message, []*domain.RankedNodeChunks, error) {
	messages := make([]*schema.Message, 0)
	rankedNodes := make([]*domain.RankedNodeChunks, 0)

	msgs, err := u.conversationRepo.GetConversationMessagesByID(ctx, conversationID)
	if err != nil {
		u.logger.Error("get conversation messages failed", log.Error(err))
		return nil, nil, errors.New("get conversation messages failed")
	}
	if len(msgs) > 0 {
		historyMessages := make([]*schema.Message, 0)
		for _, msg := range msgs {
			switch msg.Role {
			case schema.Assistant:
				historyMessages = append(historyMessages, schema.AssistantMessage(msg.Content, nil))
			case schema.User:
				content := u.formatMessageWithImages(msg.Content, msg.ImagePaths)
				historyMessages = append(historyMessages, schema.UserMessage(content))
			default:
				continue
			}
		}
		if len(historyMessages) > 0 {
			question := historyMessages[len(historyMessages)-1].Content
			var rewrittenQuery string
			if systemPrompt == "" {
				if settingPrompt, err := u.promptRepo.GetPrompt(ctx, kbID); err != nil {
					u.logger.Error("get prompt from settings failed", log.Error(err))
				} else {
					if settingPrompt != "" {
						systemPrompt = settingPrompt
					} else {
						systemPrompt = domain.SystemDefaultPrompt
					}
				}
			}

			template := prompt.FromMessages(schema.GoTemplate,
				schema.SystemMessage(systemPrompt),
				schema.UserMessage(domain.UserQuestionFormatter),
			)
			kb, err := u.kbRepo.GetKnowledgeBaseByID(ctx, kbID)
			if err != nil {
				u.logger.Error("get kb failed", log.Error(err))
				return nil, nil, errors.New("get kb failed")
			}
			rewrittenQuery, rankedNodes, err = u.GetRankNodes(ctx, GetRankNodesRequest{
				DatasetID:           kb.DatasetID,
				Question:            question,
				GroupIDs:            groupIDs,
				SimilarityThreshold: 0.2,
				HistoryMessages:     historyMessages[:len(historyMessages)-1],
				TopK:                topK,
			})
			if err != nil {
				u.logger.Error("get rank nodes failed", log.Error(err))
				return nil, nil, errors.New("get rank nodes failed")
			}
			documents := domain.FormatNodeChunks(rankedNodes, kb.AccessSettings.BaseURL)
			u.logger.Debug("documents", log.String("documents", documents))

			formattedMessages, err := template.Format(ctx, map[string]any{
				"CurrentDate": time.Now().Format("2006-01-02"),
				"Question":    rewrittenQuery,
				"Documents":   documents,
			})
			if err != nil {
				u.logger.Error("format messages failed", log.Error(err))
				return nil, nil, errors.New("format messages failed")
			}
			messages = slices.Insert(formattedMessages, 1, historyMessages[:len(historyMessages)-1]...)
		}
	}
	return messages, rankedNodes, nil
}

func (u *LLMUsecase) ChatWithAgent(
	ctx context.Context,
	chatModel model.BaseChatModel,
	messages []*schema.Message,
	usage *schema.TokenUsage,
	onChunk func(ctx context.Context, dataType, chunk string) error,
) error {
	resp, err := chatModel.Stream(ctx, messages)
	if err != nil {
		return fmt.Errorf("stream failed: %w", err)
	}
	firstReasoning := false
	firstData := false

	for {
		msg, err := resp.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("recv failed: %w", err)
		}
		reasoning, ok := deepseek.GetReasoningContent(msg)
		if ok {
			if !firstReasoning {
				firstReasoning = true
				reasoning = "<think>" + reasoning
			}
			if err := onChunk(ctx, "data", reasoning); err != nil {
				return fmt.Errorf("on chunk reasoning: %w", err)
			}
			continue
		}
		if firstReasoning && !firstData {
			firstData = true
			msg.Content = "</think>\n" + msg.Content
			if err := onChunk(ctx, "data", msg.Content); err != nil {
				return fmt.Errorf("on chunk data: %w", err)
			}
			continue
		}
		if err := onChunk(ctx, "data", msg.Content); err != nil {
			return fmt.Errorf("on chunk data: %w", err)
		}

		// set to usage
		if msg.ResponseMeta.Usage != nil {
			*usage = *msg.ResponseMeta.Usage
		}
	}

	return nil
}

func (u *LLMUsecase) Generate(
	ctx context.Context,
	chatModel model.BaseChatModel,
	messages []*schema.Message,
) (string, error) {
	resp, err := chatModel.Generate(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("generate failed: %w", err)
	}
	return resp.Content, nil
}

func (u *LLMUsecase) SummaryNode(ctx context.Context, model *domain.Model, kbID, name, content string, docKind domain.NodeDocVisualKind, imageDataURL string) (string, error) {
	modelkitModel, err := model.ToModelkitModel()
	if err != nil {
		return "", err
	}
	chatModel, err := u.modelkit.GetChatModel(ctx, modelkitModel)
	if err != nil {
		return "", err
	}

	switch docKind {
	case domain.NodeDocVisualVideo:
		return u.summaryVideoDoc(ctx, chatModel, name, content)
	case domain.NodeDocVisualImage:
		return u.summaryImageDoc(ctx, model, chatModel, kbID, name, imageDataURL)
	default:
		return u.summaryTextDocWithChunks(ctx, chatModel, name, content)
	}
}

func (u *LLMUsecase) summaryTextDocWithChunks(ctx context.Context, chatModel model.BaseChatModel, name, content string) (string, error) {
	chunks, err := u.SplitByTokenLimit(content, summaryChunkTokenLimit)
	if err != nil {
		return "", err
	}
	if len(chunks) > summaryMaxChunks {
		u.logger.Debug("trim summary chunks for large document", log.String("node", name), log.Int("original_chunks", len(chunks)), log.Int("used_chunks", summaryMaxChunks))
		chunks = chunks[:summaryMaxChunks]
	}

	summaries := make([]string, 0, len(chunks))
	for idx, chunk := range chunks {
		summary, err := u.requestSummary(ctx, chatModel, name, chunk)
		if err != nil {
			u.logger.Error("Failed to generate summary for chunk", log.Int("chunk_index", idx), log.Error(err))
			continue
		}
		if summary == "" {
			u.logger.Warn("Empty summary returned for chunk", log.Int("chunk_index", idx))
			continue
		}
		summaries = append(summaries, summary)
	}

	if len(summaries) == 0 {
		return "", fmt.Errorf("failed to generate summary for document %s", name)
	}

	joined := strings.Join(summaries, "\n\n")
	finalSummary, err := u.requestSummary(ctx, chatModel, name, joined)
	if err != nil {
		u.logger.Error("Failed to generate final summary, using aggregated summaries", log.Error(err))
		if len(joined) > 500 {
			return joined[:500] + "...", nil
		}
		return joined, nil
	}
	return finalSummary, nil
}

func (u *LLMUsecase) summaryVideoDoc(ctx context.Context, chatModel model.BaseChatModel, name, content string) (string, error) {
	excerpt := StripTagsToPlain(content)
	if len(excerpt) > 6000 {
		excerpt = excerpt[:6000]
	}
	summary, err := u.Generate(ctx, chatModel, []*schema.Message{
		{
			Role: "system",
			Content: "你是文档摘要助手。该文档为「视频」类型，正文通常以视频嵌入为主。" +
				"请生成一段不超过 120 字的中文摘要：明确说明这是一段视频类内容；" +
				"再结合文档标题与下方摘录的可读文字（若有）概括视频主题或用途。" +
				"不要输出 HTML、iframe 等标签名，不要编造摘录中不存在的情节。",
		},
		{
			Role:    "user",
			Content: fmt.Sprintf("文档名称：%s\n正文文字摘录：\n%s", name, excerpt),
		},
	})
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(u.trimThinking(summary)), nil
}

// 未命中任何配置品类时：尽量客观、细致地描述画面，便于检索
const defaultImageDocSummarySystem = `你是图像理解与知识库摘要助手。请根据用户给出的文档标题与图片内容，输出一段用于检索与展示的中文摘要。
要求：
1. 用自然连贯的一段话描述，不要使用 Markdown 或列表符号。
2. 详细说明图片中的主要物品或主体是什么；描述物品的颜色、形状、大致大小（可结合画面占比或常见参照）。
3. 判断画面中是否有文字；若有，简要写出关键文字内容（如标题、标语、品牌名）；若无，明确说明未检测到可读文字。
4. 全文不超过 320 字。`

func imageSummaryUserParts(docName, imageDataURL string) []schema.ChatMessagePart {
	return []schema.ChatMessagePart{
		{Type: schema.ChatMessagePartTypeText, Text: fmt.Sprintf("文档名称：%s", docName)},
		{
			Type: schema.ChatMessagePartTypeImageURL,
			ImageURL: &schema.ChatMessageImageURL{
				URL: imageDataURL,
			},
		},
	}
}

func pickCategoryFromClassifyOutput(raw string, categories []domain.CategoryPromptItem) *domain.CategoryPromptItem {
	line := strings.TrimSpace(strings.Split(raw, "\n")[0])
	line = strings.Trim(line, "`\"'“”")
	if line == "" {
		return nil
	}
	up := strings.ToUpper(line)
	if up == "NONE" || up == "NULL" || line == "无" || line == "无匹配" || line == "都不符合" {
		return nil
	}
	for i := range categories {
		n := strings.TrimSpace(categories[i].Name)
		if n != "" && n == line {
			return &categories[i]
		}
	}
	for i := range categories {
		n := strings.TrimSpace(categories[i].Name)
		if n != "" && strings.Contains(line, n) {
			return &categories[i]
		}
	}
	return nil
}

func (u *LLMUsecase) classifyImageDocCategory(
	ctx context.Context,
	chatModel model.BaseChatModel,
	docName, imageDataURL string,
	categories []domain.CategoryPromptItem,
) (*domain.CategoryPromptItem, error) {
	var b strings.Builder
	num := 0
	for i := range categories {
		n := strings.TrimSpace(categories[i].Name)
		if n == "" {
			continue
		}
		num++
		b.WriteString(fmt.Sprintf("%d. %s\n", num, n))
	}
	list := strings.TrimSpace(b.String())
	if list == "" {
		return nil, nil
	}
	system := `你是图像分类助手。请根据文档标题与图片，判断该文档最符合下面「品类」中的哪一种。
规则：
1. 若明显属于某一类，请只输出该品类在列表中的准确名称（与列表中该行的文字完全一致），不要输出序号、标点、解释或其他文字。
2. 若均不符合、无法判断或与所有品类都不贴切，请只输出：NONE`
	userParts := imageSummaryUserParts(docName, imageDataURL)
	out, err := u.Generate(ctx, chatModel, []*schema.Message{
		{Role: "system", Content: system + "\n\n可选品类：\n" + list},
		{Role: "user", MultiContent: userParts},
	})
	if err != nil {
		return nil, err
	}
	out = strings.TrimSpace(u.trimThinking(out))
	u.logger.Debug("image doc category classify", log.String("raw", out))
	return pickCategoryFromClassifyOutput(out, categories), nil
}

func (u *LLMUsecase) summaryImageDoc(ctx context.Context, dm *domain.Model, chatModel model.BaseChatModel, kbID, docName, imageDataURL string) (string, error) {
	if imageDataURL == "" {
		return "", fmt.Errorf("no image data for vision summary")
	}
	// 手动配置的模型需显式开启多模态；自动模式（无持久化模型 ID）仍尝试调用。
	if dm.ID != "" && !dm.Parameters.SupportImages {
		return "", fmt.Errorf("当前对话模型未开启「支持图片/多模态」，请在模型设置的高级参数中开启 support_images 后再生成图片文档摘要")
	}

	systemForSummary := defaultImageDocSummarySystem
	if kbID != "" && u.categoryPromptRepo != nil {
		cats, err := u.categoryPromptRepo.GetByKBID(ctx, kbID)
		if err != nil {
			u.logger.Error("load category prompts for image summary failed", log.Error(err))
		} else if len(cats) > 0 {
			usable := lo.Filter(cats, func(c domain.CategoryPromptItem, _ int) bool {
				return strings.TrimSpace(c.Name) != "" && strings.TrimSpace(c.Content) != ""
			})
			if len(usable) > 0 {
				matched, err := u.classifyImageDocCategory(ctx, chatModel, docName, imageDataURL, usable)
				if err != nil {
					u.logger.Warn("image category classify failed, fallback to default image summary", log.Error(err))
				} else if matched != nil {
					systemForSummary = strings.TrimSpace(matched.Content) +
						"\n\n输出要求：请输出一段用于知识库检索与展示的中文摘要，单段纯文本，不要使用 Markdown 或小标题，全文不超过 320 字。"
					u.logger.Info("image summary using category prompt", log.String("category", matched.Name))
				} else {
					u.logger.Info("image summary no category match, using detailed visual description")
				}
			}
		}
	}

	userParts := imageSummaryUserParts(docName, imageDataURL)
	summary, err := u.Generate(ctx, chatModel, []*schema.Message{
		{Role: "system", Content: systemForSummary},
		{Role: "user", MultiContent: userParts},
	})
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(u.trimThinking(summary)), nil
}

func (u *LLMUsecase) trimThinking(summary string) string {
	if !strings.HasPrefix(summary, "<think>") {
		return summary
	}
	endIndex := strings.Index(summary, "</think>")
	if endIndex == -1 {
		return summary
	}
	return strings.TrimSpace(summary[endIndex+len("</think>"):])
}

func (u *LLMUsecase) requestSummary(ctx context.Context, chatModel model.BaseChatModel, name, content string) (string, error) {
	summary, err := u.Generate(ctx, chatModel, []*schema.Message{
		{
			Role:    "system",
			Content: "你是文档总结助手，请根据文档内容总结出文档的摘要。摘要是纯文本，应该简洁明了，不要超过160个字。",
		},
		{
			Role:    "user",
			Content: fmt.Sprintf("文档名称：%s\n文档内容：%s", name, content),
		},
	})
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(u.trimThinking(summary)), nil
}

func (u *LLMUsecase) SplitByTokenLimit(text string, maxTokens int) ([]string, error) {
	if maxTokens <= 0 {
		return nil, fmt.Errorf("maxTokens must be greater than 0")
	}
	encoding, err := tiktoken.GetEncoding("cl100k_base")
	if err != nil {
		return nil, fmt.Errorf("failed to get encoding: %w", err)
	}
	tokens := encoding.Encode(text, nil, nil)
	if len(tokens) <= maxTokens {
		return []string{text}, nil
	}

	// 预先计算需要的片段数量并分配空间
	numChunks := (len(tokens) + maxTokens - 1) / maxTokens // 向上取整
	result := make([]string, 0, numChunks)

	for i := 0; i < len(tokens); i += maxTokens {
		end := i + maxTokens
		if end > len(tokens) {
			end = len(tokens)
		}

		chunk := tokens[i:end]
		decodedChunk := encoding.Decode(chunk)
		result = append(result, decodedChunk)
	}

	return result, nil
}

type GetRankNodesRequest struct {
	DatasetID           string
	Question            string
	GroupIDs            []int
	SimilarityThreshold float64
	HistoryMessages     []*schema.Message
	MaxChunksPerDoc     int
	TopK                int
}

func (u *LLMUsecase) GetRankNodes(ctx context.Context, req GetRankNodesRequest) (string, []*domain.RankedNodeChunks, error) {
	var rankedNodes []*domain.RankedNodeChunks
	topK := req.TopK
	if topK <= 0 {
		topK = 10
	}
	// get related documents from raglite
	rewrittenQuery, records, err := u.rag.QueryRecords(ctx, &rag.QueryRecordsRequest{
		DatasetID:           req.DatasetID,
		Query:               req.Question,
		GroupIDs:            req.GroupIDs,
		SimilarityThreshold: req.SimilarityThreshold,
		HistoryMsgs:         req.HistoryMessages,
		MaxChunksPerDoc:     req.MaxChunksPerDoc,
		TopK:                topK,
	})
	if err != nil {
		return "", nil, fmt.Errorf("get records from raglite failed: %w", err)
	}
	u.logger.Info("get related documents from raglite", log.Any("record_count", len(records)))
	rankedNodesMap := make(map[string]*domain.RankedNodeChunks)
	// get raw node by doc_id
	if len(records) > 0 {
		docIDs := lo.Uniq(lo.Map(records, func(item *domain.NodeContentChunk, _ int) string {
			return item.DocID
		}))
		u.logger.Info("node chunk doc ids", log.Any("docIDs", docIDs))
		docIDNode, err := u.nodeRepo.GetNodeReleasesWithPathsByDocIDs(ctx, docIDs)
		if err != nil {
			return "", nil, fmt.Errorf("get nodes by ids failed: %w", err)
		}
		u.logger.Info("get node release by doc ids", log.Any("docIDNode", lo.Keys(docIDNode)))
		for _, record := range records {
			if nodeChunk, ok := rankedNodesMap[record.DocID]; !ok {
				if docNode, ok := docIDNode[record.DocID]; ok {
					rankNodeChunk := &domain.RankedNodeChunks{
						NodeID:        docNode.NodeID,
						NodeName:      docNode.Name,
						NodeSummary:   docNode.Meta.Summary,
						NodeEmoji:     docNode.Meta.Emoji,
						NodePathNames: docNode.PathNames,
						Chunks:        []*domain.NodeContentChunk{record},
					}
					rankedNodes = append(rankedNodes, rankNodeChunk)
					rankedNodesMap[record.DocID] = rankNodeChunk
				}
			} else {
				nodeChunk.Chunks = append(nodeChunk.Chunks, record)
			}
		}
	}
	return rewrittenQuery, rankedNodes, nil
}

// formatMessageWithImages converts image paths to markdown format and appends to message
func (u *LLMUsecase) formatMessageWithImages(message string, imagePaths []string) string {
	if len(imagePaths) == 0 {
		return message
	}
	var builder strings.Builder
	builder.WriteString(message)
	for _, path := range imagePaths {
		builder.WriteString("\n")
		builder.WriteString(fmt.Sprintf("![](%s)", path))
	}
	return builder.String()
}
