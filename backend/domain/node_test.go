package domain

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNodeMetaPersistsContentAndRequestKeysSeparately(t *testing.T) {
	original := NodeMeta{
		Summary:               "summary",
		LastSummaryContentKey: "summary-content-key",
		LastSummaryRequestID:  "summary-request-id",
		LastVectorContentKey:  "vector-content-key",
		LastVectorRequestID:   "vector-request-id",
	}

	value, err := original.Value()
	require.NoError(t, err)

	data, ok := value.([]byte)
	require.True(t, ok)
	assert.JSONEq(t, `{
		"summary": "summary",
		"emoji": "",
		"content_type": "",
		"last_summary_content_key": "summary-content-key",
		"last_summary_request_id": "summary-request-id",
		"last_vector_content_key": "vector-content-key",
		"last_vector_request_id": "vector-request-id"
	}`, string(data))

	var decoded NodeMeta
	require.NoError(t, decoded.Scan(data))
	assert.Equal(t, original, decoded)
}

func TestNodeMetaInternalKeysAreNotExposed(t *testing.T) {
	meta := NodeMeta{
		Summary:               "summary",
		LastSummaryContentKey: "summary-content-key",
		LastSummaryRequestID:  "summary-request-id",
		LastVectorContentKey:  "vector-content-key",
		LastVectorRequestID:   "vector-request-id",
	}

	data, err := json.Marshal(meta)
	require.NoError(t, err)
	assert.JSONEq(t, `{"summary":"summary","emoji":"","content_type":""}`, string(data))
}
