package pg

import (
	"net/http"
	"testing"
)

func TestCaddyAdminEndpoint(t *testing.T) {
	tests := []struct {
		name        string
		caddyAPI    string
		wantBaseURL string
		wantErr     bool
	}{
		{
			// The compose default must keep resolving to the shared unix socket.
			name:        "default socket path",
			caddyAPI:    "/app/run/caddy-admin.sock",
			wantBaseURL: "http://unix",
		},
		{
			name:        "unix scheme",
			caddyAPI:    "unix:///var/run/caddy/caddy-admin.sock",
			wantBaseURL: "http://unix",
		},
		{
			name:        "tcp scheme",
			caddyAPI:    "tcp://panda-wiki-caddy:2019",
			wantBaseURL: "http://panda-wiki-caddy:2019",
		},
		{
			name:        "http url",
			caddyAPI:    "http://panda-wiki-caddy:2019",
			wantBaseURL: "http://panda-wiki-caddy:2019",
		},
		{
			name:        "http url keeps no trailing slash",
			caddyAPI:    "http://panda-wiki-caddy:2019/",
			wantBaseURL: "http://panda-wiki-caddy:2019",
		},
		{
			name:        "https url",
			caddyAPI:    "https://caddy.example.com",
			wantBaseURL: "https://caddy.example.com",
		},
		{
			name:        "bare host and port",
			caddyAPI:    "panda-wiki-caddy:2019",
			wantBaseURL: "http://panda-wiki-caddy:2019",
		},
		{
			name:     "empty value is rejected",
			caddyAPI: "",
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			baseURL, transport, err := caddyAdminEndpoint(tt.caddyAPI)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("caddyAdminEndpoint(%q) expected an error, got none", tt.caddyAPI)
				}
				return
			}
			if err != nil {
				t.Fatalf("caddyAdminEndpoint(%q) unexpected error: %v", tt.caddyAPI, err)
			}
			if baseURL != tt.wantBaseURL {
				t.Errorf("caddyAdminEndpoint(%q) baseURL = %q, want %q", tt.caddyAPI, baseURL, tt.wantBaseURL)
			}
			if transport == nil {
				t.Errorf("caddyAdminEndpoint(%q) returned a nil transport", tt.caddyAPI)
			}
			if transport == http.DefaultTransport {
				t.Errorf("caddyAdminEndpoint(%q) should not reuse the shared DefaultTransport", tt.caddyAPI)
			}
			if netTransport, ok := transport.(*http.Transport); ok && netTransport.Proxy != nil {
				t.Errorf("caddyAdminEndpoint(%q) must not route the admin API through a proxy", tt.caddyAPI)
			}
		})
	}
}
