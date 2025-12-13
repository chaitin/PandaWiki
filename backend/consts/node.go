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

type NodeRagInfoStatus string

const (
	NodeRagStatusPending    NodeRagInfoStatus = "PENDING"   // 等待处理
	NodeRagStatusRunning    NodeRagInfoStatus = "RUNNING"   // 正在进行处理（文本分割、向量化等）
	NodeRagStatusFailed     NodeRagInfoStatus = "FAILED"    // 处理失败
	NodeRagStatusSucceeded  NodeRagInfoStatus = "SUCCEEDED" // 处理成功
	NodeRagStatusReindexing NodeRagInfoStatus = "REINDEX"   // 重新索引中
)
