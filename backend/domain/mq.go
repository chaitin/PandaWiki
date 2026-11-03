package domain

const (
	VectorTaskTopic       = "apps.panda-wiki.vector.task"
	AnydocTaskExportTopic = "anydoc.persistence.doc.task.export"
	RagDocUpdateTopic     = "raglite.events.doc.update"
)

var TopicConsumerName = map[string]string{
	VectorTaskTopic:       "panda-wiki-vector-consumer",
	AnydocTaskExportTopic: "anydoc-task-export-consumer",
	RagDocUpdateTopic:     "raglite-doc-update-consumer",
}

type NodeReleaseVectorRequest struct {
	KBID          string `json:"kb_id"`
	NodeReleaseID string `json:"node_release_id"`
	NodeID        string `json:"node_id"`
	DocID         string `json:"doc_id"` // for delete
	Action        string `json:"action"` // upsert, delete, summary
	GroupIds      []int  `json:"group_ids"`
	RequestID     string `json:"request_id,omitempty"`
	// Force 只跳过内容级幂等检查，用于模型切换、手动重新学习等必须重跑的场景；
	// 同一个 RequestID 的重复投递仍会被请求级幂等拦截。
	Force bool `json:"force,omitempty"`
}

// AnydocTaskExportEvent represents the task completion event from anydoc service
type AnydocTaskExportEvent struct {
	TaskID     string `json:"task_id"`
	PlatformID string `json:"platform_id"`
	DocID      string `json:"doc_id"`
	Status     string `json:"status"`
	Err        string `json:"err"`
	Markdown   string `json:"markdown"`
	JSON       string `json:"json"`
}

type RagDocInfoUpdateEvent struct {
	ID      string `json:"id"`
	Status  string `json:"status"`
	Message string `json:"message"`
}
