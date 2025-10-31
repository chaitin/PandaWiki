package domain

const (
	VectorTaskTopic       = "apps.panda-wiki.vector.task"
	AnydocTaskExportTopic = "anydoc.persistence.doc.task.export"
	RagDocUpdateTopic     = "rag.doc.update"
)

var TopicConsumerName = map[string]string{
	VectorTaskTopic:       "panda-wiki-vector-consumer",
	AnydocTaskExportTopic: "anydoc-task-export-consumer",
	RagDocUpdateTopic:     "rag-doc-update-consumer",
}

type NodeReleaseVectorRequest struct {
	KBID          string `json:"kb_id"`
	NodeReleaseID string `json:"node_release_id"`
	NodeID        string `json:"node_id"`
	DocID         string `json:"doc_id"` // for delete
	Action        string `json:"action"` // upsert, delete, summary
	GroupIds      []int  `json:"group_ids"`
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
