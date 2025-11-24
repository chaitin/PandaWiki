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
	NodeRagStatusPending   NodeRagInfoStatus = "PENDING"
	NodeRagStatusRunning   NodeRagInfoStatus = "RUNNING"
	NodeRagStatusFailed    NodeRagInfoStatus = "FAILED"
	NodeRagStatusSucceeded NodeRagInfoStatus = "SUCCEEDED"
)
