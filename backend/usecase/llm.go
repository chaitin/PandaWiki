package usecase

import (
	"context"
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
	rag              rag.RAGService
	conversationRepo *pg.ConversationRepository
	kbRepo           *pg.KnowledgeBaseRepository
	nodeRepo         *pg.NodeRepository
	modelRepo        *pg.ModelRepository
	promptRepo       *pg.PromptRepo
	config           *config.Config
	logger           *log.Logger
	modelkit         *modelkit.ModelKit
}

const (
	summaryChunkTokenLimit = 30720 // 30KB tokens per chunk
	summaryMaxChunks       = 4     // max chunks to process for summary
)

func NewLLMUsecase(config *config.Config, rag rag.RAGService, conversationRepo *pg.ConversationRepository, kbRepo *pg.KnowledgeBaseRepository, nodeRepo *pg.NodeRepository, modelRepo *pg.ModelRepository, promptRepo *pg.PromptRepo, logger *log.Logger) *LLMUsecase {
	tiktoken.SetBpeLoader(&utils.Localloader{})
	modelkit := modelkit.NewModelKit(logger.Logger)
	return &LLMUsecase{
		config:           config,
		rag:              rag,
		conversationRepo: conversationRepo,
		kbRepo:           kbRepo,
		nodeRepo:         nodeRepo,
		modelRepo:        modelRepo,
		promptRepo:       promptRepo,
		logger:           logger.WithModule("usecase.llm"),
		modelkit:         modelkit,
	}
}

func (u *LLMUsecase) FormatConversationMessages(
	ctx context.Context,
	conversationID string,
	kbID string,
	groupIDs []int,
	systemPrompt string,
) ([]*schema.Message, []*domain.RankedNodeChunks, error) {
	messages := make([]*schema.Message, 0)
	rankedNodes := make([]*domain.RankedNodeChunks, 0)

	msgs, err := u.conversationRepo.GetConversationMessagesByID(ctx, conversationID)
	if err != nil {
		return nil, nil, fmt.Errorf("get conversation messages failed: %w", err)
	}
	if len(msgs) > 0 {
		historyMessages := make([]*schema.Message, 0)
		for _, msg := range msgs {
			switch msg.Role {
			case schema.Assistant:
				historyMessages = append(historyMessages, schema.AssistantMessage(msg.Content, nil))
			case schema.User:
				historyMessages = append(historyMessages, schema.UserMessage(msg.Content))
			default:
				continue
			}
		}
		if len(historyMessages) > 0 {
			question := historyMessages[len(historyMessages)-1].Content

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
				return nil, nil, fmt.Errorf("get kb failed: %w", err)
			}
			rankedNodes, err = u.GetRankNodes(ctx, kb.DatasetID, question, groupIDs, 0, historyMessages[:len(historyMessages)-1])
			if err != nil {
				return nil, nil, fmt.Errorf("get rank nodes failed: %w", err)
			}
			documents := domain.FormatNodeChunks(rankedNodes, kb.AccessSettings.BaseURL)
			u.logger.Debug("documents", log.String("documents", documents))

			formattedMessages, err := template.Format(ctx, map[string]any{
				"CurrentDate": time.Now().Format("2006-01-02"),
				"Question":    question,
				"Documents":   documents,
			})
			if err != nil {
				return nil, nil, fmt.Errorf("format messages failed: %w", err)
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

func (u *LLMUsecase) SummaryNode(ctx context.Context, model *domain.Model, name, content string) (string, error) {
	modelkitModel, err := model.ToModelkitModel()
	if err != nil {
		return "", err
	}
	chatModel, err := u.modelkit.GetChatModel(ctx, modelkitModel)
	if err != nil {
		return "", err
	}

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

	// Join all summaries and generate final summary
	joined := strings.Join(summaries, "\n\n")
	finalSummary, err := u.requestSummary(ctx, chatModel, name, joined)
	if err != nil {
		u.logger.Error("Failed to generate final summary, using aggregated summaries", log.Error(err))
		// Fallback: return the joined summaries directly
		if len(joined) > 500 {
			return joined[:500] + "...", nil
		}
		return joined, nil
	}
	return finalSummary, nil
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

func (u *LLMUsecase) GetRankNodes(
	ctx context.Context,
	datasetID string,
	question string,
	groupIDs []int,
	similarityThreshold float64,
	historyMessages []*schema.Message,
) ([]*domain.RankedNodeChunks, error) {
	var rankedNodes []*domain.RankedNodeChunks
	// get related documents from raglite
	records, err := u.rag.QueryRecords(ctx, &rag.QueryRecordsRequest{
		DatasetID:           datasetID,
		Query:               question,
		GroupIDs:            groupIDs,
		SimilarityThreshold: similarityThreshold,
		HistoryMsgs:         historyMessages,
	})
	if err != nil {
		return nil, fmt.Errorf("get records from raglite failed: %w", err)
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
			return nil, fmt.Errorf("get nodes by ids failed: %w", err)
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
	return rankedNodes, nil
}
