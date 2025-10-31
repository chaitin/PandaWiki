package consts

type NodeAccessPerm string

const (
	NodeAccessPermOpen    NodeAccessPerm = "open"    // 完全开放
	NodeAccessPermPartial NodeAccessPerm = "partial" // 部分开放
	NodeAccessPermClosed  NodeAccessPerm = "closed"  // 完全禁止
)

type NodePermName string

const (
	NodePermNameVisible    NodePermName = "visible"    // 导航内可见
	NodePermNameVisitable  NodePermName = "visitable"  // 可被访问
	NodePermNameAnswerable NodePermName = "answerable" // 可被问答
)

type NodeRagStatus string

const (
	NodeRagStatusBasicPending   NodeRagStatus = "BASIC_PENDING"   // 等待基础处理
	NodeRagStatusBasicRunning   NodeRagStatus = "BASIC_RUNNING"   // 正在进行基础处理（文本分割、向量化等）
	NodeRagStatusBasicFailed    NodeRagStatus = "BASIC_FAILED"    // 基础处理失败
	NodeRagStatusBasicSucceeded NodeRagStatus = "BASIC_SUCCEEDED" // 基础处理成功

	NodeRagStatusEnhancePending   NodeRagStatus = "ENHANCE_PENDING"   // 基础处理完成，等待增强处理
	NodeRagStatusEnhanceRunning   NodeRagStatus = "ENHANCE_RUNNING"   // 正在进行增强处理（关键词提取等）
	NodeRagStatusEnhanceFailed    NodeRagStatus = "ENHANCE_FAILED"    // 增强处理失败
	NodeRagStatusEnhanceSucceeded NodeRagStatus = "ENHANCE_SUCCEEDED" // 增强处理成功
)
