package mq

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGroupUpdateDocID(t *testing.T) {
	tests := []struct {
		name           string
		latestDocID    string
		requestedDocID string
		want           string
	}{
		{
			name:           "prefer latest indexed release",
			latestDocID:    "latest-doc",
			requestedDocID: "requested-doc",
			want:           "latest-doc",
		},
		{
			name:           "fallback while latest release is not indexed",
			requestedDocID: "requested-doc",
			want:           "requested-doc",
		},
		{
			name: "no document available",
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, groupUpdateDocID(tt.latestDocID, tt.requestedDocID))
		})
	}
}
