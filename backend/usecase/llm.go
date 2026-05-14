package usecase

import (
	"context"
	"encoding/json"
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

// BuildRAGOption 可选行为开关；零值即旧行为。
type BuildRAGOption struct {
	// PinnedNodeIDs 非空时，把 RAG 限定到这些文档（工作模式识别成功后传入）。
	PinnedNodeIDs []string
	// IdentifiedDocName 非空时，会注入到 system prompt 末尾，提示模型仅依据该文档作答。
	IdentifiedDocName string
}

func (u *LLMUsecase) BuildConversationMessageWithRAG(
	ctx context.Context,
	conversationID string,
	kbID string,
	groupIDs []int,
	systemPrompt string,
	topK int,
	retrievalAugment string,
	qaMode string,
	opts ...BuildRAGOption,
) ([]*schema.Message, []*domain.RankedNodeChunks, error) {
	var opt BuildRAGOption
	if len(opts) > 0 {
		opt = opts[0]
	}
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
			if ra := strings.TrimSpace(retrievalAugment); ra != "" {
				question = strings.TrimSpace(question) + "\n\n—— 附图检索辅助信息 ——\n" + ra
			}
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

			systemPrompt = domain.AugmentSystemPromptWithQaMode(systemPrompt, qaMode)
			if name := strings.TrimSpace(opt.IdentifiedDocName); name != "" {
				systemPrompt = strings.TrimSpace(systemPrompt) +
					"\n\n【已识别文档】用户在工作模式中已收敛到唯一文档「" + name + "」，回答时请仅基于该文档的内容，不要引用知识库中其他文档。"
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
			var workModeDirRoots []string
			if strings.TrimSpace(qaMode) == domain.QaModeWork {
				var rerr error
				workModeDirRoots, rerr = u.nodeRepo.GetWorkModeDirectoryRootNodeIDs(ctx, kbID)
				if rerr != nil {
					u.logger.Warn("get work mode directory roots failed, skip path filter", log.Error(rerr))
					workModeDirRoots = nil
				}
			}
			rankReq := GetRankNodesRequest{
				DatasetID:                kb.DatasetID,
				Question:                 question,
				GroupIDs:                 groupIDs,
				SimilarityThreshold:      0.2,
				HistoryMessages:          historyMessages[:len(historyMessages)-1],
				TopK:                     topK,
				WorkModeDirectoryRootIDs: workModeDirRoots,
				PinnedNodeIDs:            opt.PinnedNodeIDs,
			}
			// 锚定文档时放宽 TopK 与相似度阈值，确保该文档命中
			if len(opt.PinnedNodeIDs) > 0 {
				rankReq.SimilarityThreshold = 0.0
				if rankReq.TopK < 20 {
					rankReq.TopK = 20
				}
			}
			rewrittenQuery, rankedNodes, err = u.GetRankNodes(ctx, rankReq)
			if err != nil {
				u.logger.Error("get rank nodes failed", log.Error(err))
				return nil, nil, errors.New("get rank nodes failed")
			}
			// 锚定文档若未在 vector top-K 中（常见原因：正文/摘要里没有用户问句关键词），
			// 直接从 node_releases 抓全文注入为单 chunk，避免上下文为空。
			if len(opt.PinnedNodeIDs) > 0 {
				rankedNodes = u.ensurePinnedDocsInRanked(ctx, rankedNodes, opt.PinnedNodeIDs)
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

func buildCategoryList(categories []domain.CategoryPromptItem) string {
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
	return strings.TrimSpace(b.String())
}

func (u *LLMUsecase) GetWorkModeCategoryPrompts(ctx context.Context, kbID string) ([]domain.CategoryPromptItem, error) {
	if u.categoryPromptRepo == nil || kbID == "" {
		return nil, nil
	}
	cats, err := u.categoryPromptRepo.GetByKBID(ctx, kbID)
	if err != nil {
		return nil, err
	}
	return lo.Filter(cats, func(c domain.CategoryPromptItem, _ int) bool {
		return strings.TrimSpace(c.Name) != ""
	}), nil
}

// GetConversationMessages 转发到 conversationRepo，便于 chat.go 在工作模式状态机中读取历史。
func (u *LLMUsecase) GetConversationMessages(ctx context.Context, conversationID string) ([]*domain.ConversationMessage, error) {
	if u.conversationRepo == nil || strings.TrimSpace(conversationID) == "" {
		return nil, nil
	}
	return u.conversationRepo.GetConversationMessagesByID(ctx, conversationID)
}

func (u *LLMUsecase) BuildWorkModeQuestionContext(ctx context.Context, conversationID, currentQuestion string) (string, error) {
	msgs, err := u.conversationRepo.GetConversationMessagesByID(ctx, conversationID)
	if err != nil {
		return "", err
	}
	lines := make([]string, 0, 6)
	start := len(msgs) - 6
	if start < 0 {
		start = 0
	}
	for _, msg := range msgs[start:] {
		content := strings.TrimSpace(msg.Content)
		if content == "" && len(msg.ImagePaths) == 0 {
			continue
		}
		role := "用户"
		if msg.Role == schema.Assistant {
			role = "助手"
		}
		if len(msg.ImagePaths) > 0 {
			content = strings.TrimSpace(content + "（用户本轮包含附图）")
		}
		lines = append(lines, role+"："+content)
	}
	if len(lines) == 0 && strings.TrimSpace(currentQuestion) != "" {
		lines = append(lines, "用户："+strings.TrimSpace(currentQuestion))
	}
	return strings.Join(lines, "\n"), nil
}

func (u *LLMUsecase) ClassifyTextQuestionCategory(
	ctx context.Context,
	chatModel model.BaseChatModel,
	questionContext string,
	categories []domain.CategoryPromptItem,
) (*domain.CategoryPromptItem, error) {
	list := buildCategoryList(categories)
	if list == "" {
		return nil, nil
	}
	system := `你是文本问题分类助手。请根据用户当前问题及必要的上一轮上下文，判断它最符合下面「品类」中的哪一种。
规则：
1. 若明显属于某一类，请只输出该品类在列表中的准确名称（与列表中该行的文字完全一致），不要输出序号、标点、解释或其他文字。
2. 若均不符合、无法判断或用户只是补充上一轮缺失属性但无法看出品类，请只输出：NONE`
	out, err := u.Generate(ctx, chatModel, []*schema.Message{
		{Role: "system", Content: system + "\n\n可选品类：\n" + list},
		{Role: "user", Content: strings.TrimSpace(questionContext)},
	})
	if err != nil {
		return nil, err
	}
	out = strings.TrimSpace(u.trimThinking(out))
	u.logger.Debug("work mode text category classify", log.String("raw", out))
	return pickCategoryFromClassifyOutput(out, categories), nil
}

type workModeMissingAttributesResp struct {
	MissingAttributes []string `json:"missing_attributes"`
}

func extractJSONObject(raw string) string {
	s := strings.TrimSpace(raw)
	if i := strings.Index(s, "{"); i >= 0 {
		if j := strings.LastIndex(s, "}"); j >= i {
			return s[i : j+1]
		}
	}
	return strings.TrimSpace(s)
}

func parseWorkModeMissingAttributes(raw string, attrs []string) []string {
	raw = strings.TrimSpace(raw)
	raw = extractJSONObject(raw)
	if raw == "" {
		return nil
	}
	allowed := make(map[string]struct{}, len(attrs))
	for _, attr := range attrs {
		allowed[strings.TrimSpace(attr)] = struct{}{}
	}
	addAllowed := func(values []string) []string {
		out := make([]string, 0, len(values))
		seen := map[string]struct{}{}
		for _, value := range values {
			v := strings.TrimSpace(value)
			if _, ok := allowed[v]; !ok {
				continue
			}
			if _, ok := seen[v]; ok {
				continue
			}
			seen[v] = struct{}{}
			out = append(out, v)
		}
		return out
	}
	var obj workModeMissingAttributesResp
	if err := json.Unmarshal([]byte(raw), &obj); err == nil {
		return addAllowed(obj.MissingAttributes)
	}
	var arr []string
	if err := json.Unmarshal([]byte(raw), &arr); err == nil {
		return addAllowed(arr)
	}
	norm := strings.ReplaceAll(raw, "，", ",")
	norm = strings.ReplaceAll(norm, "、", ",")
	return addAllowed(strings.Split(norm, ","))
}

// 工作模式：候选检索（用于差异化追问）。返回 0/1/多 个候选；调用方决定是否追问。
// 门控目的是「检测歧义」，因此放宽阈值与 TopK，避免把潜在候选误过滤。
const (
	workModeGateRetrieveTopK = 8
	// 若一篇文档命中字面包含品类名，加权后多半会主导，但其它相似品类文档（美国/日本/韩国信封）
	// 在短查询「白色信封」下相似度可能在 0.1 上下；阈值设 0 让 raglite 自己排序后由我们按 TopK 截断。
	workModeGateSimilarityThreshold = 0.0
)

// GetCategoryTaggedDocs 枚举所有 meta.work_mode_category 与给定品类匹配的文档。
// 用于补齐向量 top-K 可能漏掉的结构化打标候选。
func (u *LLMUsecase) GetCategoryTaggedDocs(ctx context.Context, kbID, categoryName string) ([]*domain.RankedNodeChunks, error) {
	if u.nodeRepo == nil {
		return nil, nil
	}
	return u.nodeRepo.GetWorkModeDocsByCategory(ctx, kbID, categoryName)
}

// MergeRankedNodesByID 按 NodeID 去重合并两组候选，保持 a 的顺序在前、b 的补齐在后。
func MergeRankedNodesByID(a, b []*domain.RankedNodeChunks) []*domain.RankedNodeChunks {
	seen := make(map[string]struct{}, len(a)+len(b))
	out := make([]*domain.RankedNodeChunks, 0, len(a)+len(b))
	push := func(list []*domain.RankedNodeChunks) {
		for _, n := range list {
			if n == nil || n.NodeID == "" {
				continue
			}
			if _, ok := seen[n.NodeID]; ok {
				continue
			}
			seen[n.NodeID] = struct{}{}
			out = append(out, n)
		}
	}
	push(a)
	push(b)
	return out
}

func (u *LLMUsecase) RetrieveCandidateNodesForWorkMode(
	ctx context.Context,
	kbID string,
	groupIDs []int,
	question string,
) ([]*domain.RankedNodeChunks, error) {
	if strings.TrimSpace(question) == "" {
		return nil, nil
	}
	kb, err := u.kbRepo.GetKnowledgeBaseByID(ctx, kbID)
	if err != nil {
		return nil, err
	}
	workModeDirRoots, werr := u.nodeRepo.GetWorkModeDirectoryRootNodeIDs(ctx, kbID)
	if werr != nil {
		u.logger.Warn("get work mode directory roots failed, skip path filter", log.Error(werr))
		workModeDirRoots = nil
	}
	_, ranked, err := u.GetRankNodes(ctx, GetRankNodesRequest{
		DatasetID:                  kb.DatasetID,
		Question:                   question,
		GroupIDs:                   groupIDs,
		SimilarityThreshold:        workModeGateSimilarityThreshold,
		HistoryMessages:          nil,
		TopK:                       workModeGateRetrieveTopK,
		MaxChunksPerDoc:            1,
		WorkModeDirectoryRootIDs:   workModeDirRoots,
	})
	if err != nil {
		return nil, err
	}
	return ranked, nil
}

// attrValueMatches 对 candidate 的某属性值与用户已收集的值做宽松匹配。
// 任一为空视为不冲突；忽略大小写与首尾空白；包含关系也视为匹配（容忍单位等口语差异）。
func attrValueMatches(candidateVal, userVal string) bool {
	a := strings.ToLower(strings.TrimSpace(candidateVal))
	b := strings.ToLower(strings.TrimSpace(userVal))
	if a == "" || b == "" {
		return true
	}
	if a == b {
		return true
	}
	return strings.Contains(a, b) || strings.Contains(b, a)
}

// NarrowCandidatesByAttributes 用「meta.attributes 精确匹配」收敛候选文档：
//   - 已收集属性为空时，原样返回；
//   - 当全部候选都未填写结构化属性时，回退到原候选（让上层走文本差异判别）；
//   - 至少有候选有结构化属性时，过滤掉与已收集值冲突的候选；
//
// 二次保留（无结构化属性的候选）按以下策略：若过滤后仍有命中结构化匹配的候选，
// 则只保留命中结构化匹配的；若全部被过滤，回退到原候选避免错杀。
func (u *LLMUsecase) NarrowCandidatesByAttributes(
	ctx context.Context,
	kbID string,
	candidates []*domain.RankedNodeChunks,
	collected map[string]string,
) ([]*domain.RankedNodeChunks, error) {
	if len(candidates) == 0 || len(collected) == 0 {
		return candidates, nil
	}
	if u.nodeRepo == nil {
		return candidates, nil
	}
	ids := make([]string, 0, len(candidates))
	for _, c := range candidates {
		if c != nil && c.NodeID != "" {
			ids = append(ids, c.NodeID)
		}
	}
	metaMap, err := u.nodeRepo.GetNodeMetaByNodeIDs(ctx, kbID, ids)
	if err != nil {
		return candidates, err
	}
	hasAnyStructured := false
	for _, m := range metaMap {
		if len(m.Attributes) > 0 {
			hasAnyStructured = true
			break
		}
	}
	if !hasAnyStructured {
		return candidates, nil
	}
	kept := make([]*domain.RankedNodeChunks, 0, len(candidates))
	for _, c := range candidates {
		if c == nil {
			continue
		}
		meta, ok := metaMap[c.NodeID]
		if !ok || len(meta.Attributes) == 0 {
			continue
		}
		conflict := false
		for k, v := range collected {
			if cv, has := meta.Attributes[k]; has {
				if !attrValueMatches(cv, v) {
					conflict = true
					break
				}
			}
		}
		if !conflict {
			kept = append(kept, c)
		}
	}
	if len(kept) == 0 {
		u.logger.Debug("narrow by attributes: zero match, fallback to original candidates",
			log.Int("collected", len(collected)),
			log.Int("origin", len(candidates)),
		)
		return candidates, nil
	}
	return kept, nil
}

// formatWorkModeCandidateBriefs 把候选文档做成「文档名 + 摘要/首段」短描述列表，供 LLM 比对差异。
func formatWorkModeCandidateBriefs(candidates []*domain.RankedNodeChunks) string {
	if len(candidates) == 0 {
		return ""
	}
	var b strings.Builder
	for i, c := range candidates {
		name := strings.TrimSpace(c.NodeName)
		brief := strings.TrimSpace(c.NodeSummary)
		if brief == "" && len(c.Chunks) > 0 {
			brief = strings.TrimSpace(c.Chunks[0].Content)
		}
		brief = strings.ReplaceAll(brief, "\n", " ")
		if utf8RuneLen(brief) > 240 {
			brief = string([]rune(brief)[:240]) + "…"
		}
		b.WriteString(fmt.Sprintf("%d. 文档名：%s\n   摘要：%s\n", i+1, name, brief))
	}
	return strings.TrimSpace(b.String())
}

func utf8RuneLen(s string) int { return len([]rune(s)) }

// WorkModeListDistinguishingMissing 基于候选文档之间的实际差异 + 用户已陈述
// 判断「真正需要用户补充」的属性维度（避免对所有配置属性做无差别追问）。
func (u *LLMUsecase) WorkModeListDistinguishingMissing(
	ctx context.Context,
	chatModel model.BaseChatModel,
	category domain.CategoryPromptItem,
	candidates []*domain.RankedNodeChunks,
	questionContext string,
	retrievalAugment string,
) ([]string, error) {
	attrs := splitCategoryCommaAttrs(category.Attributes)
	if len(attrs) == 0 || len(candidates) < 2 {
		return nil, nil
	}
	briefs := formatWorkModeCandidateBriefs(candidates)
	system := `你是工作模式下的差异化属性核对助手。后台为某品类配置了若干属性维度，知识库可能存在多份相似文档。
请判断：在「后台属性列表」中，哪些属性同时满足以下两个条件，需要让用户补充才能定位到唯一文档：
1. 该属性在「候选文档」之间存在差异（不同文档表述不同）；
2. 用户尚未在问题、上下文或附图理解中明确给出该属性的具体值。

规则：
- 候选文档之间无差异（都相同或都未提及）的属性不要列出，追问无意义。
- 用户已经明确给出的属性不要列出。
- 输出严格 JSON：{"missing_attributes":["属性1"]}。
- missing_attributes 中只能使用后台属性列表里的原文；若没有需要追问的，输出 {"missing_attributes":[]}。`
	user := fmt.Sprintf(
		"命中品类：%s\n后台属性列表：%s\n\n候选文档：\n%s\n\n对话上下文：\n%s",
		strings.TrimSpace(category.Name),
		strings.Join(attrs, "、"),
		briefs,
		strings.TrimSpace(questionContext),
	)
	if strings.TrimSpace(retrievalAugment) != "" {
		user += "\n\n附图理解与属性要点：\n" + strings.TrimSpace(retrievalAugment)
	}
	out, err := u.Generate(ctx, chatModel, []*schema.Message{
		{Role: "system", Content: system},
		{Role: "user", Content: user},
	})
	if err != nil {
		return nil, err
	}
	out = strings.TrimSpace(u.trimThinking(out))
	u.logger.Debug("work mode distinguishing missing attrs",
		log.String("raw", out),
		log.String("category", category.Name),
		log.Int("candidates", len(candidates)),
	)
	return parseWorkModeMissingAttributes(out, attrs), nil
}

func (u *LLMUsecase) WorkModeListMissingAttributes(
	ctx context.Context,
	chatModel model.BaseChatModel,
	category domain.CategoryPromptItem,
	questionContext string,
	retrievalAugment string,
) ([]string, error) {
	attrs := splitCategoryCommaAttrs(category.Attributes)
	if len(attrs) == 0 {
		return nil, nil
	}
	system := `你是工作模式下的属性完备性检查助手。请判断用户已陈述的信息是否明确覆盖后台配置的所有属性维度。
规则：
1. 只能基于用户当前问题、最近对话上下文，以及可选的附图理解信息判断；不要臆测。
2. 若某属性未提及、无法从上下文或附图理解中明确推出，就视为缺失。
3. 输出严格 JSON，格式为：{"missing_attributes":["属性1","属性2"]}。
4. missing_attributes 中只能使用后台属性列表里的原文；若没有缺失，输出 {"missing_attributes":[]}。`
	user := fmt.Sprintf("命中品类：%s\n后台属性列表：%s\n\n对话上下文：\n%s",
		strings.TrimSpace(category.Name),
		strings.Join(attrs, "、"),
		strings.TrimSpace(questionContext),
	)
	if strings.TrimSpace(retrievalAugment) != "" {
		user += "\n\n附图理解与属性要点：\n" + strings.TrimSpace(retrievalAugment)
	}
	out, err := u.Generate(ctx, chatModel, []*schema.Message{
		{Role: "system", Content: system},
		{Role: "user", Content: user},
	})
	if err != nil {
		return nil, err
	}
	out = strings.TrimSpace(u.trimThinking(out))
	u.logger.Debug("work mode missing attrs", log.String("raw", out), log.String("category", category.Name))
	return parseWorkModeMissingAttributes(out, attrs), nil
}

// workModeCollectedAttributesResp LLM 抽取已收集属性时的输出形式。
type workModeCollectedAttributesResp struct {
	Collected map[string]string `json:"collected"`
}

// parseWorkModeCollectedAttributes 解析 LLM 输出的 {"collected": {...}}，
// 仅保留 attrs 集合内的键，且去掉空值；非法 JSON 时返回 nil。
func parseWorkModeCollectedAttributes(raw string, attrs []string) map[string]string {
	raw = extractJSONObject(strings.TrimSpace(raw))
	if raw == "" {
		return nil
	}
	allowed := make(map[string]struct{}, len(attrs))
	for _, a := range attrs {
		allowed[strings.TrimSpace(a)] = struct{}{}
	}
	var obj workModeCollectedAttributesResp
	if err := json.Unmarshal([]byte(raw), &obj); err != nil || obj.Collected == nil {
		// 兼容直接给出 {"尺寸":"500ml"} 的简化形式
		var flat map[string]string
		if jErr := json.Unmarshal([]byte(raw), &flat); jErr != nil {
			return nil
		}
		obj.Collected = flat
	}
	out := make(map[string]string, len(obj.Collected))
	for k, v := range obj.Collected {
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(v)
		if k == "" || v == "" {
			continue
		}
		if _, ok := allowed[k]; !ok {
			continue
		}
		out[k] = v
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// MergeCollectedAttributes 将 LLM 新抽取出的属性与历史已收集属性合并；
// 仅 attrs 内键有效，新值非空时覆盖旧值，旧值在新输入未给出时保留。
func MergeCollectedAttributes(prev, fresh map[string]string, attrs []string) map[string]string {
	allowed := make(map[string]struct{}, len(attrs))
	for _, a := range attrs {
		allowed[strings.TrimSpace(a)] = struct{}{}
	}
	merged := make(map[string]string, len(prev)+len(fresh))
	for k, v := range prev {
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(v)
		if k == "" || v == "" {
			continue
		}
		if _, ok := allowed[k]; !ok {
			continue
		}
		merged[k] = v
	}
	for k, v := range fresh {
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(v)
		if k == "" || v == "" {
			continue
		}
		if _, ok := allowed[k]; !ok {
			continue
		}
		merged[k] = v
	}
	return merged
}

// ExtractCollectedAttributes 让 LLM 从对话上下文 + 附图理解中抽取「用户已明确给出」的属性键值对，
// 仅允许后台为该品类配置过的属性键，并与上一轮已收集的属性合并返回。
func (u *LLMUsecase) ExtractCollectedAttributes(
	ctx context.Context,
	chatModel model.BaseChatModel,
	category domain.CategoryPromptItem,
	questionContext string,
	retrievalAugment string,
	prevCollected map[string]string,
) (map[string]string, error) {
	attrs := splitCategoryCommaAttrs(category.Attributes)
	if len(attrs) == 0 {
		return nil, nil
	}
	system := `你是工作模式下的属性抽取助手。请仅基于用户陈述与可选的附图理解，抽取「明确给出」的属性键值对。
规则：
1. 仅允许使用「后台属性列表」中的键名作为 key，键名需与列表中的原文完全一致。
2. value 取用户陈述/附图中的具体值，单值（如 "500ml"、"马口铁"），不要带单位说明或解释。
3. 用户没明确说明的属性请不要列出，不要臆测。
4. 输出严格 JSON：{"collected":{"键":"值"}}；若没有任何明确属性，输出 {"collected":{}}。`
	user := fmt.Sprintf("命中品类：%s\n后台属性列表：%s\n\n对话上下文：\n%s",
		strings.TrimSpace(category.Name),
		strings.Join(attrs, "、"),
		strings.TrimSpace(questionContext),
	)
	if strings.TrimSpace(retrievalAugment) != "" {
		user += "\n\n附图理解与属性要点：\n" + strings.TrimSpace(retrievalAugment)
	}
	out, err := u.Generate(ctx, chatModel, []*schema.Message{
		{Role: "system", Content: system},
		{Role: "user", Content: user},
	})
	if err != nil {
		return MergeCollectedAttributes(prevCollected, nil, attrs), err
	}
	out = strings.TrimSpace(u.trimThinking(out))
	fresh := parseWorkModeCollectedAttributes(out, attrs)
	merged := MergeCollectedAttributes(prevCollected, fresh, attrs)
	u.logger.Debug("work mode collected attrs",
		log.String("raw", out),
		log.String("category", category.Name),
		log.Any("fresh", fresh),
		log.Any("merged", merged),
	)
	return merged, nil
}

func (u *LLMUsecase) classifyImageDocCategory(
	ctx context.Context,
	chatModel model.BaseChatModel,
	docName, imageDataURL string,
	categories []domain.CategoryPromptItem,
) (*domain.CategoryPromptItem, error) {
	list := buildCategoryList(categories)
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

// splitCategoryCommaAttrs 解析后台「属性维护」字段（支持英文逗号与中文逗号分隔）。
func splitCategoryCommaAttrs(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	norm := strings.ReplaceAll(raw, "，", ",")
	parts := strings.Split(norm, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		s := strings.TrimSpace(p)
		if s != "" {
			out = append(out, s)
		}
	}
	return out
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

func (u *LLMUsecase) SummaryDocImages(ctx context.Context, dm *domain.Model, kbID, docName string, imageDataURLs []string) ([]string, error) {
	if len(imageDataURLs) == 0 {
		return nil, fmt.Errorf("no image data for vision summary")
	}
	if dm.ID != "" && !dm.Parameters.SupportImages {
		return nil, fmt.Errorf("当前视觉模型未开启「支持图片/多模态」，请在模型设置的高级参数中开启 support_images 后再生成图片摘要")
	}
	modelkitModel, err := dm.ToModelkitModel()
	if err != nil {
		return nil, err
	}
	chatModel, err := u.modelkit.GetChatModel(ctx, modelkitModel)
	if err != nil {
		return nil, err
	}

	summaries := make([]string, 0, len(imageDataURLs))
	for i, imageDataURL := range imageDataURLs {
		parts := []schema.ChatMessagePart{
			{
				Type: schema.ChatMessagePartTypeText,
				Text: fmt.Sprintf("文档标题：%s\n当前图片序号：%d/%d\n请为这张图片生成图片描述。", docName, i+1, len(imageDataURLs)),
			},
			{
				Type:     schema.ChatMessagePartTypeImageURL,
				ImageURL: &schema.ChatMessageImageURL{URL: imageDataURL},
			},
		}
		summary, err := u.Generate(ctx, chatModel, []*schema.Message{
			{
				Role: "system",
				Content: `你是文档图片描述助手。请阅读用户提供的单张图片，为这张图片生成可放入「图片描述」字段的中文描述。
要求：
1. 只描述当前图片，不要描述其他图片。
2. 覆盖图片中的关键图表、界面、流程、产品、文字信息或场景。
3. 输出单段纯文本，不使用 Markdown，不编造图片中看不到的信息。
4. 总字数不超过 160 字。`,
			},
			{Role: "user", MultiContent: parts},
		})
		if err != nil {
			return nil, err
		}
		summaries = append(summaries, strings.TrimSpace(u.trimThinking(summary)))
	}
	return summaries, nil
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

// filterRankedNodesByWorkModeDirectoryRoots 仅保留从根路径到文档节点链中包含任一指定文件夹 id 的检索结果。
func filterRankedNodesByWorkModeDirectoryRoots(ranked []*domain.RankedNodeChunks, rootIDs []string) []*domain.RankedNodeChunks {
	if len(ranked) == 0 || len(rootIDs) == 0 {
		return ranked
	}
	rootSet := lo.SliceToMap(rootIDs, func(id string) (string, struct{}) { return id, struct{}{} })
	out := make([]*domain.RankedNodeChunks, 0, len(ranked))
	for _, n := range ranked {
		for _, pid := range n.NodePathIDs {
			if _, ok := rootSet[pid]; ok {
				out = append(out, n)
				break
			}
		}
	}
	return out
}

type GetRankNodesRequest struct {
	DatasetID           string
	Question            string
	GroupIDs            []int
	SimilarityThreshold float64
	HistoryMessages     []*schema.Message
	MaxChunksPerDoc     int
	TopK                int
	// WorkModeDirectoryRootIDs 非空时，仅保留路径上包含任一该文件夹 node_id 的文档（工作模式问答目录范围）。
	WorkModeDirectoryRootIDs []string
	// PinnedNodeIDs 非空时，最终结果仅保留 NodeID ∈ 该集合的文档（工作模式识别成功后强制锚定到唯一文档）。
	PinnedNodeIDs []string
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
						NodePathIDs:   docNode.PathIDs,
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
	if len(req.WorkModeDirectoryRootIDs) > 0 {
		rankedNodes = filterRankedNodesByWorkModeDirectoryRoots(rankedNodes, req.WorkModeDirectoryRootIDs)
	}
	if len(req.PinnedNodeIDs) > 0 {
		rankedNodes = filterRankedNodesByPinnedNodeIDs(rankedNodes, req.PinnedNodeIDs)
	}
	return rewrittenQuery, rankedNodes, nil
}

// ensurePinnedDocsInRanked 保证 pinnedIDs 中的每个文档都在最终上下文里。
// 缺失时直接从 node_releases 抓最新一版的 name/content/summary 拼成一个伪 chunk，
// 让 LLM 在「锚定回答」场景下不会因为 vector 没命中而拿不到任何上下文。
func (u *LLMUsecase) ensurePinnedDocsInRanked(
	ctx context.Context,
	ranked []*domain.RankedNodeChunks,
	pinnedIDs []string,
) []*domain.RankedNodeChunks {
	if len(pinnedIDs) == 0 || u.nodeRepo == nil {
		return ranked
	}
	present := make(map[string]struct{}, len(ranked))
	for _, n := range ranked {
		if n != nil && n.NodeID != "" {
			present[n.NodeID] = struct{}{}
		}
	}
	for _, pid := range pinnedIDs {
		if _, ok := present[pid]; ok {
			continue
		}
		release, err := u.nodeRepo.GetLatestNodeReleaseByNodeID(ctx, pid)
		if err != nil || release == nil {
			u.logger.Warn("ensurePinnedDocsInRanked: load release failed",
				log.String("node_id", pid), log.Error(err))
			continue
		}
		// 拼正文+属性，确保即便正文为空也能让 LLM 拿到文档名和结构化属性回答。
		content := strings.TrimSpace(release.Content)
		if release.Meta.Attributes != nil && len(release.Meta.Attributes) > 0 {
			var b strings.Builder
			b.WriteString("【文档结构化属性】\n")
			for k, v := range release.Meta.Attributes {
				b.WriteString("- ")
				b.WriteString(k)
				b.WriteString(": ")
				b.WriteString(v)
				b.WriteString("\n")
			}
			if content != "" {
				b.WriteString("\n【文档正文】\n")
				b.WriteString(content)
			}
			content = strings.TrimSpace(b.String())
		}
		if content == "" {
			content = "（该文档暂无正文，请基于文档名与属性作答）"
		}
		ranked = append(ranked, &domain.RankedNodeChunks{
			NodeID:      release.NodeID,
			NodeName:    release.Name,
			NodeSummary: release.Meta.Summary,
			NodeEmoji:   release.Meta.Emoji,
			Chunks: []*domain.NodeContentChunk{
				{
					ID:      release.ID,
					KBID:    release.KBID,
					DocID:   release.DocID,
					Seq:     0,
					Name:    release.Name,
					Content: content,
				},
			},
		})
		u.logger.Info("ensurePinnedDocsInRanked: injected pinned doc",
			log.String("node_id", pid),
			log.String("name", release.Name),
			log.Int("attrs", len(release.Meta.Attributes)),
			log.Int("content_len", len(release.Content)),
		)
	}
	return ranked
}

// filterRankedNodesByPinnedNodeIDs 仅保留 NodeID ∈ pinnedIDs 的检索结果。
// 用于「工作模式识别已锚定唯一文档」时把 RAG 上下文限制到该文档。
func filterRankedNodesByPinnedNodeIDs(ranked []*domain.RankedNodeChunks, pinnedIDs []string) []*domain.RankedNodeChunks {
	if len(ranked) == 0 || len(pinnedIDs) == 0 {
		return ranked
	}
	pinSet := lo.SliceToMap(pinnedIDs, func(id string) (string, struct{}) { return id, struct{}{} })
	out := make([]*domain.RankedNodeChunks, 0, len(ranked))
	for _, n := range ranked {
		if n == nil {
			continue
		}
		if _, ok := pinSet[n.NodeID]; ok {
			out = append(out, n)
		}
	}
	return out
}

// ChainStepEmitter 附图理解各阶段回调（用于 SSE 思维链展示）
type ChainStepEmitter func(step int, title, detail string)

func (u *LLMUsecase) ensureVisionChatModel(ctx context.Context, dm *domain.Model) (model.BaseChatModel, error) {
	if dm.ID != "" && !dm.Parameters.SupportImages {
		return nil, fmt.Errorf("当前模型未开启「支持图片/多模态」，无法分析附图")
	}
	mkit, err := dm.ToModelkitModel()
	if err != nil {
		return nil, err
	}
	return u.modelkit.GetChatModel(ctx, mkit)
}

const visionObjectDescribeSystem = `你是图像理解助手。请根据图片客观描述：画面中的主要物体或场景是什么（可包含材质、颜色、大致用途等）。用一小段中文输出，不要使用 Markdown 或列表符号，不超过 100 字。`

// BuildImageUnderstandingForRAG 对附图做多步视觉理解，生成拼入向量检索 query 的辅助文本（由调用方通过 SSE 展示各步）。
func (u *LLMUsecase) BuildImageUnderstandingForRAG(
	ctx context.Context,
	visionModel *domain.Model,
	kbID string,
	userMessage string,
	imageDataURL string,
	emit ChainStepEmitter,
) (retrievalAugment string, matchedCategory *domain.CategoryPromptItem, err error) {
	chatModel, err := u.ensureVisionChatModel(ctx, visionModel)
	if err != nil {
		return "", nil, err
	}
	caption := strings.TrimSpace(userMessage)
	if caption == "" {
		caption = "（用户未输入文字，仅上传图片）"
	}
	emit(1, "识别图中物体与场景", "正在调用视觉模型…")
	userParts := []schema.ChatMessagePart{
		{Type: schema.ChatMessagePartTypeText, Text: "用户说明：" + caption},
		{Type: schema.ChatMessagePartTypeImageURL, ImageURL: &schema.ChatMessageImageURL{URL: imageDataURL}},
	}
	objRaw, err := u.Generate(ctx, chatModel, []*schema.Message{
		{Role: "system", Content: visionObjectDescribeSystem},
		{Role: "user", MultiContent: userParts},
	})
	if err != nil {
		return "", nil, fmt.Errorf("识别图中物体失败: %w", err)
	}
	objectDesc := strings.TrimSpace(u.trimThinking(objRaw))
	if objectDesc == "" {
		objectDesc = "（模型未返回有效画面描述）"
	}
	emit(1, "识别图中物体与场景", objectDesc)

	var parts []string
	if strings.TrimSpace(userMessage) != "" {
		parts = append(parts, "用户问题："+strings.TrimSpace(userMessage))
	}
	parts = append(parts, "附图画面理解："+objectDesc)

	if u.categoryPromptRepo == nil || kbID == "" {
		emit(2, "品类与属性", "未加载品类配置，直接使用画面描述辅助检索。")
		return strings.Join(parts, "\n"), nil, nil
	}
	cats, err := u.categoryPromptRepo.GetByKBID(ctx, kbID)
	if err != nil {
		u.logger.Error("get category prompts for chat vision failed", log.Error(err))
		emit(2, "品类与属性", "读取品类配置失败，使用画面描述辅助检索。")
		return strings.Join(parts, "\n"), nil, nil
	}
	usable := lo.Filter(cats, func(c domain.CategoryPromptItem, _ int) bool {
		return strings.TrimSpace(c.Name) != "" && strings.TrimSpace(c.Content) != ""
	})
	if len(usable) == 0 {
		emit(2, "判断是否属于配置品类", "后台未配置有效品类提示词，跳过品类匹配。")
		return strings.Join(parts, "\n"), nil, nil
	}

	emit(2, "判断是否属于配置品类", "比对配置中的品类…")
	docLabel := strings.TrimSpace(userMessage)
	if docLabel == "" {
		docLabel = "用户上传的图片"
	}
	matched, err := u.classifyImageDocCategory(ctx, chatModel, docLabel, imageDataURL, usable)
	if err != nil {
		emit(2, "判断是否属于配置品类", "品类判断失败："+err.Error()+"，将仅用画面描述辅助检索。")
		return strings.Join(parts, "\n"), nil, nil
	}
	if matched == nil {
		emit(2, "判断是否属于配置品类", "未命中已配置品类，将结合画面细节进行向量检索。")
		return strings.Join(parts, "\n"), nil, nil
	}
	emit(2, "判断是否属于配置品类", "命中品类：「"+matched.Name+"」")

	emit(3, "按品类提示词提取检索属性", "正在结合图片提取与检索相关的属性要点…")
	attrPrefix := strings.TrimSpace(matched.Content)
	if dims := splitCategoryCommaAttrs(matched.Attributes); len(dims) > 0 {
		attrPrefix += "\n\n本品类在后台配置的检索属性为：" + strings.Join(dims, "、") + "。请结合图片尽量按上述属性逐一给出可检索的具体信息；无法从画面判断的项可略过。"
	}
	attrSys := attrPrefix + `

请结合**图片**，根据上述要求，提取最有利于在知识库中检索到相关文档的「关键词与属性要点」：
- 用中文一段输出，不要使用 Markdown 或列表符号；
- 多个要点用顿号或逗号分隔；
- 全文不超过 200 字。`
	attrRaw, err := u.Generate(ctx, chatModel, []*schema.Message{
		{Role: "system", Content: attrSys},
		{Role: "user", MultiContent: userParts},
	})
	if err != nil {
		emit(3, "按品类提示词提取检索属性", "提取失败："+err.Error())
		return strings.Join(parts, "\n"), matched, nil
	}
	attrText := strings.TrimSpace(u.trimThinking(attrRaw))
	emit(3, "按品类提示词提取检索属性", attrText)

	parts = append(parts, "命中品类「"+matched.Name+"」。与检索相关的属性要点："+attrText)
	return strings.Join(parts, "\n"), matched, nil
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
