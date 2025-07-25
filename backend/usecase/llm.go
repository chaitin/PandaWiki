package usecase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/cloudwego/eino-ext/components/model/deepseek"
	"github.com/cloudwego/eino-ext/components/model/gemini"
	"github.com/cloudwego/eino-ext/components/model/ollama"
	"github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/components/prompt"
	"github.com/cloudwego/eino/schema"
	"github.com/ollama/ollama/api"
	"github.com/pkoukk/tiktoken-go"
	"github.com/samber/lo"
	"github.com/samber/lo/parallel"
	"google.golang.org/genai"

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
	config           *config.Config
	logger           *log.Logger
}

func NewLLMUsecase(config *config.Config, rag rag.RAGService, conversationRepo *pg.ConversationRepository, kbRepo *pg.KnowledgeBaseRepository, nodeRepo *pg.NodeRepository, modelRepo *pg.ModelRepository, logger *log.Logger) *LLMUsecase {
	return &LLMUsecase{
		config:           config,
		rag:              rag,
		conversationRepo: conversationRepo,
		kbRepo:           kbRepo,
		nodeRepo:         nodeRepo,
		modelRepo:        modelRepo,
		logger:           logger.WithModule("usecase.llm"),
	}
}

func (u *LLMUsecase) GetChatModel(ctx context.Context, model *domain.Model) (model.BaseChatModel, error) {
	// config chat model
	var temperature float32 = 0.0
	config := &openai.ChatModelConfig{
		APIKey:      model.APIKey,
		BaseURL:     model.BaseURL,
		Model:       string(model.Model),
		Temperature: &temperature,
	}
	if model.Provider == domain.ModelProviderBrandAzureOpenAI {
		config.ByAzure = true
		config.APIVersion = model.APIVersion
		if config.APIVersion == "" {
			config.APIVersion = "2024-10-21"
		}
	}
	if model.APIHeader != "" {
		client := getHttpClientWithAPIHeaderMap(model.APIHeader)
		if client != nil {
			config.HTTPClient = client
		}
	}
	switch model.Provider {
	case domain.ModelProviderBrandDeepSeek:
		chatModel, err := deepseek.NewChatModel(ctx, &deepseek.ChatModelConfig{
			BaseURL:     model.BaseURL,
			APIKey:      model.APIKey,
			Model:       model.Model,
			Temperature: temperature,
		})
		if err != nil {
			return nil, fmt.Errorf("create chat model failed: %w", err)
		}
		return chatModel, nil
	case domain.ModelProviderBrandGemini:
		client, err := genai.NewClient(ctx, &genai.ClientConfig{
			APIKey: model.APIKey,
		})
		if err != nil {
			return nil, fmt.Errorf("create genai client failed: %w", err)
		}

		chatModel, err := gemini.NewChatModel(ctx, &gemini.Config{
			Client: client,
			Model:  model.Model,
			ThinkingConfig: &genai.ThinkingConfig{
				IncludeThoughts: true,
				ThinkingBudget:  nil,
			},
		})
		if err != nil {
			return nil, fmt.Errorf("create chat model failed: %w", err)
		}
		return chatModel, nil
	case domain.ModelProviderBrandOllama:
		baseUrl, err := utils.URLRemovePath(config.BaseURL)
		if err != nil {
			return nil, fmt.Errorf("ollama url parse failed: %w", err)
		}

		chatModel, err := ollama.NewChatModel(ctx, &ollama.ChatModelConfig{
			BaseURL: baseUrl,
			Timeout: config.Timeout,
			Model:   config.Model,
			Options: &api.Options{
				Temperature: temperature,
			},
		})
		if err != nil {
			return nil, fmt.Errorf("create chat model failed: %w", err)
		}
		return chatModel, nil
	default:
		chatModel, err := openai.NewChatModel(ctx, config)
		if err != nil {
			return nil, fmt.Errorf("create chat model failed: %w", err)
		}
		return chatModel, nil
	}
}

func (u *LLMUsecase) FormatConversationMessages(
	ctx context.Context,
	conversationID string,
	kbID string,
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

			template := prompt.FromMessages(schema.GoTemplate,
				schema.SystemMessage(domain.SystemPrompt),
				schema.UserMessage(domain.UserQuestionFormatter),
			)
			// query dataset id from kb
			kb, err := u.kbRepo.GetKnowledgeBaseByID(ctx, kbID)
			if err != nil {
				return nil, nil, fmt.Errorf("get kb failed: %w", err)
			}
			// get related documents from raglite
			records, err := u.rag.QueryRecords(ctx, []string{kb.DatasetID}, question)
			if err != nil {
				return nil, nil, fmt.Errorf("get records from raglite failed: %w", err)
			}
			u.logger.Info("get related documents from raglite", log.Any("record_count", len(records)))
			rankedNodesMap := make(map[string]*domain.RankedNodeChunks)
			// get raw node by doc_id
			if len(records) > 0 {
				docIDs := lo.Uniq(lo.Map(records, func(item *domain.NodeContentChunk, _ int) string {
					return item.DocID
				}))
				u.logger.Info("docIDs", log.Any("docIDs", docIDs))
				docIDNode, err := u.nodeRepo.GetNodeReleasesByDocIDs(ctx, docIDs)
				if err != nil {
					return nil, nil, fmt.Errorf("get nodes by ids failed: %w", err)
				}
				u.logger.Info("get nodes by ids", log.Any("docIDNode", docIDNode))
				for _, record := range records {
					if nodeChunk, ok := rankedNodesMap[record.DocID]; !ok {
						if docNode, ok := docIDNode[record.DocID]; ok {
							rankNodeChunk := &domain.RankedNodeChunks{
								NodeID:      docNode.NodeID,
								NodeName:    docNode.Name,
								NodeSummary: docNode.Meta.Summary,
								Chunks:      []*domain.NodeContentChunk{record},
							}
							rankedNodes = append(rankedNodes, rankNodeChunk)
							rankedNodesMap[record.DocID] = rankNodeChunk
						}
					} else {
						nodeChunk.Chunks = append(nodeChunk.Chunks, record)
					}
				}
			}
			u.logger.Info("ranked nodes", log.Int("rankedNodesCount", len(rankedNodes)))
			documents := domain.FormatNodeChunks(rankedNodes, kb.AccessSettings.BaseURL)
			u.logger.Info("documents", log.String("documents", documents))

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

func (u *LLMUsecase) CheckModel(ctx context.Context, req *domain.CheckModelReq) (*domain.CheckModelResp, error) {
	checkResp := &domain.CheckModelResp{}

	if req.Type == domain.ModelTypeEmbedding || req.Type == domain.ModelTypeRerank {
		url := req.BaseURL
		reqBody := map[string]any{}
		if req.Type == domain.ModelTypeEmbedding {
			reqBody = map[string]any{
				"model":           req.Model,
				"input":           "PandaWiki is a platform for creating and sharing knowledge bases.",
				"encoding_format": "float",
			}
			url = req.BaseURL + "/embeddings"
		}
		if req.Type == domain.ModelTypeRerank {
			reqBody = map[string]any{
				"model": req.Model,
				"documents": []string{
					"PandaWiki is a platform for creating and sharing knowledge bases.",
					"PandaWiki is a platform for creating and sharing knowledge bases.",
					"PandaWiki is a platform for creating and sharing knowledge bases.",
				},
				"query": "PandaWiki",
			}
			url = req.BaseURL + "/rerank"
		}
		body, err := json.Marshal(reqBody)
		if err != nil {
			checkResp.Error = fmt.Sprintf("marshal request body failed: %s", err.Error())
			return checkResp, nil
		}
		request, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(body))
		if err != nil {
			checkResp.Error = fmt.Sprintf("new request failed: %s", err.Error())
			return checkResp, nil
		}
		request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", req.APIKey))
		request.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(request)
		if err != nil {
			checkResp.Error = fmt.Sprintf("send request failed: %s", err.Error())
			return checkResp, nil
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			checkResp.Error = fmt.Sprintf("request failed: %s", resp.Status)
			return checkResp, nil
		}
		return checkResp, nil
	}

	chatModel, err := u.GetChatModel(ctx, &domain.Model{
		Provider:   req.Provider,
		Model:      req.Model,
		APIKey:     req.APIKey,
		APIHeader:  req.APIHeader,
		BaseURL:    req.BaseURL,
		APIVersion: req.APIVersion,
		Type:       req.Type,
	})
	if err != nil {
		checkResp.Error = err.Error()
		return checkResp, nil
	}
	resp, err := chatModel.Generate(ctx, []*schema.Message{
		schema.SystemMessage("You are a helpful assistant."),
		schema.UserMessage("hi"),
	})
	if err != nil {
		checkResp.Error = err.Error()
		return checkResp, nil
	}
	content := resp.Content
	if content == "" {
		checkResp.Error = "generate failed"
		return checkResp, nil
	}
	checkResp.Content = content
	return checkResp, nil
}

type headerTransport struct {
	headers map[string]string
	base    http.RoundTripper
}

func (t *headerTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	for k, v := range t.headers {
		req.Header.Set(k, v)
	}
	return t.base.RoundTrip(req)
}

func getHttpClientWithAPIHeaderMap(header string) *http.Client {
	headerMap := utils.GetHeaderMap(header)
	if len(headerMap) > 0 {
		// create http client with custom transport for headers
		client := &http.Client{
			Timeout: 0,
		}
		// Wrap the transport to add headers
		client.Transport = &headerTransport{
			headers: headerMap,
			base:    http.DefaultTransport,
		}
		return client
	}
	return nil
}

func (u *LLMUsecase) SummaryNode(ctx context.Context, model *domain.Model, name, content string) (string, error) {
	chatModel, err := u.GetChatModel(ctx, model)
	if err != nil {
		return "", err
	}
	chunks, err := u.SplitByTokenLimit(content, int(math.Floor(1024*32*0.95)))
	if err != nil {
		return "", err
	}

	summaries := parallel.Map(chunks, func(chunk string, _ int) string {
		summary, err := u.Generate(ctx, chatModel, []*schema.Message{
			{
				Role:    "system",
				Content: "你是文档总结助手，请根据文档内容总结出文档的摘要。摘要是纯文本，应该简洁明了，不要超过160个字。",
			},
			{
				Role:    "user",
				Content: fmt.Sprintf("文档名称：%s\n文档内容：%s", name, chunk),
			},
		})
		if err != nil {
			u.logger.Error("Failed to generate summary for chunk: ", log.Error(err))
			return ""
		}
		if strings.HasPrefix(summary, "<think>") {
			// remove <think> body </think>
			endIndex := strings.Index(summary, "</think>")
			if endIndex != -1 {
				summary = strings.TrimSpace(summary[endIndex+8:]) // 8 is length of "</think>"
			}
		}
		return summary
	})
	// 使用lo.Filter处理错误
	defeatSummary := lo.Filter(summaries, func(summary string, index int) bool {
		return summary == ""
	})
	if len(defeatSummary) > 0 {
		return "", fmt.Errorf("failed to generate summaries for all chunks: %d/%d", len(defeatSummary), len(chunks))
	}

	contents, err := u.SplitByTokenLimit(strings.Join(summaries, "\n\n"), int(math.Floor(1024*32*0.95)))
	if err != nil {
		return "", err
	}
	summary, err := u.Generate(ctx, chatModel, []*schema.Message{
		{
			Role:    "system",
			Content: "你是文档总结助手，请根据文档内容总结出文档的摘要。摘要是纯文本，应该简洁明了，不要超过160个字。",
		},
		{
			Role:    "user",
			Content: fmt.Sprintf("文档名称：%s\n文档内容：%s", name, contents[0]),
		},
	})
	if err != nil {
		return "", err
	}
	if strings.HasPrefix(summary, "<think>") {
		// remove <think> body </think>
		endIndex := strings.Index(summary, "</think>")
		if endIndex != -1 {
			summary = strings.TrimSpace(summary[endIndex+8:]) // 8 is length of "</think>"
		}
	}
	return summary, nil
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
