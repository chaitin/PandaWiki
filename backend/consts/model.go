package consts

type AutoModeDefaultModel string

const (
	AutoModeDefaultChatModel       AutoModeDefaultModel = "deepseek-v4-flash"
	AutoModeDefaultEmbeddingModel  AutoModeDefaultModel = "bge-m3"
	AutoModeDefaultRerankModel     AutoModeDefaultModel = "bge-reranker-v2-m3"
	AutoModeDefaultAnalysisModel   AutoModeDefaultModel = "qwen-flash"
	AutoModeDefaultAnalysisVLModel AutoModeDefaultModel = "qwen3.7-plus"
)

func GetAutoModeDefaultModel(modelType string) string {
	switch modelType {
	case "chat":
		return string(AutoModeDefaultChatModel)
	case "embedding":
		return string(AutoModeDefaultEmbeddingModel)
	case "rerank":
		return string(AutoModeDefaultRerankModel)
	case "analysis":
		return string(AutoModeDefaultAnalysisModel)
	case "analysis-vl":
		return string(AutoModeDefaultAnalysisVLModel)
	default:
		return string(AutoModeDefaultChatModel)
	}
}

type ModelSettingMode string

const (
	ModelSettingModeManual ModelSettingMode = "manual"
	ModelSettingModeAuto   ModelSettingMode = "auto"
)

const (
	AutoModeBaseURL           = "https://model-square.app.baizhi.cloud/v1"
	AutoModeModelStoreBaseURL = "https://ai-models.app.baizhi.cloud/api/openai"
)
