package domain

type SSEEvent struct {
	Type        string               `json:"type"`
	Content     string               `json:"content"`
	ChunkResult *NodeContentChunkSSE `json:"chunk_result,omitempty"`
	Error       string               `json:"error,omitempty"`
}
