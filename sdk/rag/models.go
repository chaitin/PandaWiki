package rag

import "encoding/json"

type CommonResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// Chunk 表示一个分块对象
type Chunk struct {
	ID                string   `json:"id"`                 // 分块ID
	Content           string   `json:"content"`            // 分块内容
	DocumentID        string   `json:"document_id"`        // 所属文档ID
	DatasetID         string   `json:"dataset_id"`         // 所属数据集ID
	GroupIDs          []int    `json:"group_ids"`          // 权限组
	ImportantKeywords []string `json:"important_keywords"` // 关键词
	Questions         []string `json:"questions"`          // 相关问题
	Available         bool     `json:"available"`          // 是否可用
	CreateTime        string   `json:"create_time"`
	CreateTimestamp   float64  `json:"create_timestamp"`
}

// AddChunkRequest 添加分块请求
type AddChunkRequest struct {
	Content           string   `json:"content"`
	ImportantKeywords []string `json:"important_keywords,omitempty"`
	Questions         []string `json:"questions,omitempty"`
}

type AddChunkResponse struct {
	Code int `json:"code"`
	Data struct {
		Chunk Chunk `json:"chunk"`
	} `json:"data"`
}

// ListChunksResponse 分块列表响应
type ListChunksResponse struct {
	Code int `json:"code"`
	Data struct {
		Chunks []Chunk `json:"chunks"`
		Total  int     `json:"total"`
	} `json:"data"`
}

// DeleteChunksRequest 删除分块请求
type DeleteChunksRequest struct {
	ChunkIDs []string `json:"chunk_ids"`
}

type DeleteChunksResponse struct {
	Code int `json:"code"`
}

// UpdateChunkRequest 更新分块请求
type UpdateChunkRequest struct {
	Content           string   `json:"content,omitempty"`
	ImportantKeywords []string `json:"important_keywords,omitempty"`
	Available         *bool    `json:"available,omitempty"`
}

type UpdateChunkResponse struct {
	Code int `json:"code"`
}

// ParseDocumentsRequest 解析文档请求
// POST /api/v1/datasets/{dataset_id}/chunks
// Body: {"document_ids": ["id1", "id2"]}
type ParseDocumentsRequest struct {
	DocumentIDs []string `json:"document_ids"`
}

type ParseDocumentsResponse struct {
	Code int `json:"code"`
}

// StopParseDocumentsRequest 停止解析文档请求
// DELETE /api/v1/datasets/{dataset_id}/chunks
// Body: {"document_ids": ["id1", "id2"]}
type StopParseDocumentsRequest struct {
	DocumentIDs []string `json:"document_ids"`
}

type StopParseDocumentsResponse struct {
	Code int `json:"code"`
}

// Dataset 表示一个数据集对象
// 包含所有基础属性
type Dataset struct {
	ID                     string       `json:"id"`              // 数据集ID
	Name                   string       `json:"name"`            // 数据集名称
	Avatar                 string       `json:"avatar"`          // 头像（Base64）
	Description            string       `json:"description"`     // 描述
	EmbeddingModel         string       `json:"embedding_model"` // 嵌入模型
	Permission             string       `json:"permission"`      // 权限
	ChunkMethod            string       `json:"chunk_method"`    // 分块方式
	Pagerank               int          `json:"pagerank"`        // PageRank
	ParserConfig           ParserConfig `json:"parser_config"`   // 解析配置
	ChunkCount             int          `json:"chunk_count"`     // 分块数
	CreateDate             string       `json:"create_date"`
	CreateTime             int64        `json:"create_time"`
	CreatedBy              string       `json:"created_by"`
	DocumentCount          int          `json:"document_count"`
	Language               string       `json:"language"`
	SimilarityThreshold    float64      `json:"similarity_threshold"`
	Status                 string       `json:"status"`
	TenantID               string       `json:"tenant_id"`
	TokenNum               int          `json:"token_num"`
	UpdateDate             string       `json:"update_date"`
	UpdateTime             int64        `json:"update_time"`
	VectorSimilarityWeight float64      `json:"vector_similarity_weight"`
}

// RaptorConfig 配置
// 完全适配 Python 版本
// use_raptor, prompt, max_token, threshold, max_cluster, random_seed
type RaptorConfig struct {
	UseRaptor  bool    `json:"use_raptor"`
	Prompt     string  `json:"prompt,omitempty"`
	MaxToken   int     `json:"max_token,omitempty"`
	Threshold  float64 `json:"threshold,omitempty"`
	MaxCluster int     `json:"max_cluster,omitempty"`
	RandomSeed int     `json:"random_seed,omitempty"`
}

// GraphragConfig 配置
// 完全适配 Python 版本
// use_graphrag, entity_types, method, community, resolution
type GraphragConfig struct {
	UseGraphRAG bool     `json:"use_graphrag"`
	EntityTypes []string `json:"entity_types,omitempty"`
	Method      string   `json:"method,omitempty"`
	Community   bool     `json:"community,omitempty"`
	Resolution  bool     `json:"resolution,omitempty"`
}

// ParserConfig 解析配置，随 chunk_method 变化
type ParserConfig struct {
	AutoKeywords       int             `json:"auto_keywords,omitempty"`        // 自动关键词数
	AutoQuestions      int             `json:"auto_questions,omitempty"`       // 自动问题数
	ChunkTokenNum      int             `json:"chunk_token_num,omitempty"`      // 分块token数
	Delimiter          string          `json:"delimiter,omitempty"`            // 分隔符
	Graphrag           *GraphragConfig `json:"graphrag,omitempty"`             // GraphRAG配置
	HTML4Excel         bool            `json:"html4excel,omitempty"`           // Excel转HTML
	LayoutRecognize    string          `json:"layout_recognize,omitempty"`     // 布局识别
	Raptor             *RaptorConfig   `json:"raptor,omitempty"`               // Raptor配置
	TagKBIDs           []string        `json:"tag_kb_ids,omitempty"`           // 标签知识库ID
	TopnTags           int             `json:"topn_tags,omitempty"`            // TopN标签
	FilenameEmbdWeight *float64        `json:"filename_embd_weight,omitempty"` // 文件名嵌入权重
	TaskPageSize       *int            `json:"task_page_size,omitempty"`       // PDF分页
	Pages              *[][]int        `json:"pages,omitempty"`                // 页码范围
}

// CreateDatasetRequest 创建数据集请求
type CreateDatasetRequest struct {
	Name           string       `json:"name"`
	Avatar         string       `json:"avatar,omitempty"`
	Description    string       `json:"description,omitempty"`
	EmbeddingModel string       `json:"embedding_model,omitempty"`
	Permission     string       `json:"permission,omitempty"`
	ChunkMethod    string       `json:"chunk_method,omitempty"`
	Pagerank       int          `json:"pagerank,omitempty"`
	ParserConfig   ParserConfig `json:"parser_config,omitempty"`
}

type CreateDatasetResponse struct {
	Code int     `json:"code"`
	Data Dataset `json:"data"`
}

// UpdateDatasetRequest 更新数据集请求
type UpdateDatasetRequest struct {
	Name           string       `json:"name,omitempty"`
	Avatar         string       `json:"avatar,omitempty"`
	Description    string       `json:"description,omitempty"`
	EmbeddingModel string       `json:"embedding_model,omitempty"`
	Permission     string       `json:"permission,omitempty"`
	ChunkMethod    string       `json:"chunk_method,omitempty"`
	Pagerank       int          `json:"pagerank,omitempty"`
	ParserConfig   ParserConfig `json:"parser_config,omitempty"`
}

type UpdateDatasetResponse struct {
	Code int `json:"code"`
}

// ListDatasetsRequest 列表请求参数
type ListDatasetsRequest struct {
	Page     int    `json:"page,omitempty"`
	PageSize int    `json:"page_size,omitempty"`
	OrderBy  string `json:"orderby,omitempty"`
	Desc     bool   `json:"desc,omitempty"`
	Name     string `json:"name,omitempty"`
	ID       string `json:"id,omitempty"`
}

type ListDatasetsResponse struct {
	Code int       `json:"code"`
	Data []Dataset `json:"data"`
}

// DeleteDatasetsRequest 删除数据集请求
type DeleteDatasetsRequest struct {
	IDs []string `json:"ids"`
}

type DeleteDatasetsResponse struct {
	Code int `json:"code"`
}

// Document 表示一个文档对象
type Document struct {
	ID              string      `json:"id"`            // 文档ID
	Name            string      `json:"name"`          // 文档名
	Location        string      `json:"location"`      // 存储位置
	DatasetID       string      `json:"dataset_id"`    // 所属数据集ID
	GroupIDs        []int       `json:"group_ids"`     // 权限组
	CreatedBy       string      `json:"created_by"`    // 创建人
	ChunkMethod     string      `json:"chunk_method"`  // 分块方式
	ParserConfig    interface{} `json:"parser_config"` // 解析配置
	Run             string      `json:"run"`           // 处理状态
	Size            int64       `json:"size"`          // 文件大小
	Thumbnail       string      `json:"thumbnail"`     // 缩略图
	Type            string      `json:"type"`          // 类型
	Status          string      `json:"status"`        // 状态
	CreateDate      string      `json:"create_date"`
	CreateTime      int64       `json:"create_time"`
	UpdateDate      string      `json:"update_date"`
	UpdateTime      int64       `json:"update_time"`
	ChunkCount      int         `json:"chunk_count"`
	TokenCount      int         `json:"token_count"`
	SourceType      string      `json:"source_type"`
	ProcessBeginAt  string      `json:"process_begin_at"`
	ProcessDuration float64     `json:"process_duation"`
	Progress        float64     `json:"progress"`
	ProgressMsg     string      `json:"progress_msg"`
}

// UploadDocumentResponse 上传文档响应
type UploadDocumentResponse struct {
	Code int        `json:"code"`
	Data []Document `json:"data"`
}

// ListDocumentsResponse 文档列表响应
type ListDocumentsResponse struct {
	Code int `json:"code"`
	Data struct {
		Docs  []Document `json:"docs"`
		Total int        `json:"total"`
	} `json:"data"`
}

// DeleteDocumentsRequest 删除文档请求
type DeleteDocumentsRequest struct {
	IDs []string `json:"ids"`
}

type DeleteDocumentsResponse struct {
	Code int `json:"code"`
}

// UpdateDocumentRequest 更新文档请求
type UpdateDocumentRequest struct {
	Name         string                 `json:"name,omitempty"`
	MetaFields   map[string]interface{} `json:"meta_fields,omitempty"`
	ChunkMethod  string                 `json:"chunk_method,omitempty"`
	ParserConfig map[string]interface{} `json:"parser_config,omitempty"`
}

type UpdateDocumentResponse struct {
	Code int `json:"code"`
}

// DocumentMetadata 文档元信息结构
type DocumentMetadata struct {
	DocumentName string `json:"document_name,omitempty"` // 文档名称
	CreatedAt    string `json:"created_at,omitempty"`    // 文档创建时间
	UpdatedAt    string `json:"updated_at,omitempty"`    // 文档更新时间
	FolderName   string `json:"folder_name,omitempty"`   // 文档所处的文件夹名称，如果没有则为空
}

// ChatMessage 聊天消息结构
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// RetrievalRequest 检索请求
type RetrievalRequest struct {
	Question               string        `json:"question"`                           // 查询问题
	DatasetIDs             []string      `json:"dataset_ids,omitempty"`              // 数据集ID列表
	DocumentIDs            []string      `json:"document_ids,omitempty"`             // 文档ID列表
	UserGroupIDs           []int         `json:"user_group_ids,omitempty"`           // 用户权限组
	Page                   int           `json:"page,omitempty"`                     // 页码
	PageSize               int           `json:"page_size,omitempty"`                // 每页数量
	SimilarityThreshold    float64       `json:"similarity_threshold,omitempty"`     // 相似度阈值
	VectorSimilarityWeight float64       `json:"vector_similarity_weight,omitempty"` // 向量相似度权重
	TopK                   int           `json:"top_k,omitempty"`                    // 参与向量计算的topK
	RerankID               string        `json:"rerank_id,omitempty"`                // rerank模型ID
	Keyword                bool          `json:"keyword,omitempty"`                  // 是否启用关键词匹配
	Highlight              bool          `json:"highlight,omitempty"`                // 是否高亮
	ChatMessages           []ChatMessage `json:"chat_messages,omitempty"`            // 聊天消息，用于问题重写
}

// RetrievalChunk 检索结果分块
type RetrievalChunk struct {
	ID                string        `json:"id"`
	Content           string        `json:"content"`
	ContentLtks       string        `json:"content_ltks"`
	DocumentID        string        `json:"document_id"`
	DocumentKeyword   string        `json:"document_keyword"`
	Highlight         string        `json:"highlight"`
	ImageID           string        `json:"image_id"`
	ImportantKeywords []string      `json:"important_keywords"`
	KBID              string        `json:"kb_id"`
	Positions         []interface{} `json:"positions"`
	Similarity        float64       `json:"similarity"`
	TermSimilarity    float64       `json:"term_similarity"`
	VectorSimilarity  float64       `json:"vector_similarity"`
}

// RetrievalResponse 检索响应
type RetrievalResponse struct {
	Code int `json:"code"`
	Data struct {
		Chunks         []RetrievalChunk `json:"chunks"`
		Total          int              `json:"total"`
		RewrittenQuery string           `json:"rewritten_query"` // 重写后的问题，如果不需要重写，则返回空字符串
	} `json:"data"`
}

// RelatedQuestionsRequest 相关问题请求
type RelatedQuestionsRequest struct {
	Question string `json:"question"`
}

// RelatedQuestionsResponse 相关问题响应
type RelatedQuestionsResponse struct {
	Code    int      `json:"code"`
	Data    []string `json:"data"`
	Message string   `json:"message"`
}

// ModelConfig 模型配置
type ModelConfig struct {
	ID          string          `json:"id"`
	Provider    string          `json:"provider"` //openai-compatible-api
	Name        string          `json:"name"`
	TaskType    string          `json:"task_type"` // embedding, rerank, chat
	ApiBase     string          `json:"api_base"`
	ApiKey      string          `json:"api_key"`
	MaxTokens   int             `json:"max_tokens"`
	IsDefault   bool            `json:"is_default"`
	Enabled     bool            `json:"enabled"`
	Config      json.RawMessage `json:"config,omitempty"`
	Description string          `json:"description,omitempty"`
	Version     string          `json:"version,omitempty"`
	Timeout     int             `json:"timeout,omitempty"`
	CreateTime  int64           `json:"create_time,omitempty"`
	UpdateTime  int64           `json:"update_time,omitempty"`
	Owner       string          `json:"owner,omitempty"`
	QuotaLimit  int             `json:"quota_limit,omitempty"`
}

type AddModelConfigRequest struct {
	Provider    string          `json:"provider"` //openai-compatible-api
	Name        string          `json:"name"`
	TaskType    string          `json:"task_type"` // embedding, rerank, chat
	ApiBase     string          `json:"api_base"`
	ApiKey      string          `json:"api_key"`
	MaxTokens   int             `json:"max_tokens"`
	IsDefault   bool            `json:"is_default"` // 是否默认
	Enabled     bool            `json:"enabled"`    // 是否启用
	Config      json.RawMessage `json:"config,omitempty"`
	Description string          `json:"description,omitempty"`
	Version     string          `json:"version,omitempty"`
	Timeout     int             `json:"timeout,omitempty"`
	CreateTime  int64           `json:"create_time,omitempty"`
	UpdateTime  int64           `json:"update_time,omitempty"`
	Owner       string          `json:"owner,omitempty"`
	QuotaLimit  int             `json:"quota_limit,omitempty"`
}

type AddModelConfigResponse struct {
	Code int         `json:"code"`
	Data ModelConfig `json:"data"`
}

type ListModelConfigsResponse struct {
	Code int           `json:"code"`
	Data []ModelConfig `json:"data"`
}

type ModelItem struct {
	Name    string `json:"name"`
	ApiBase string `json:"api_base"`
}

type DeleteModelConfigsRequest struct {
	ModelIDs []string    `json:"ids,omitempty"`
	Models   []ModelItem `json:"models,omitempty"`
}
