package feishu

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"golang.org/x/oauth2"

	"github.com/chaitin/panda-wiki/log"
)

const (
	AuthURL      = "https://accounts.feishu.cn/open-apis/authen/v1/authorize"
	TokenURL     = "https://open.feishu.cn/open-apis/authen/v2/oauth/token"
	UserInfoURL  = "https://open.feishu.cn/open-apis/authen/v1/user_info"
	callbackPath = "/share/pro/v1/openapi/feishu/callback"
)

var oauthEndpoint = oauth2.Endpoint{
	AuthURL:  AuthURL,
	TokenURL: TokenURL,
}

// Client 飞书客户端
type Client struct {
	context     context.Context
	oauthConfig *oauth2.Config
	logger      *log.Logger
}

type Response struct {
	Code int      `json:"code"`
	Msg  string   `json:"msg"`
	Data UserInfo `json:"data"`
}
type UserInfo struct {
	Name            string `json:"name"`
	EnName          string `json:"en_name"`
	AvatarUrl       string `json:"avatar_url"`
	AvatarThumb     string `json:"avatar_thumb"`
	AvatarMiddle    string `json:"avatar_middle"`
	AvatarBig       string `json:"avatar_big"`
	OpenId          string `json:"open_id"`
	UnionId         string `json:"union_id"`
	Email           string `json:"email"`
	EnterpriseEmail string `json:"enterprise_email"`
	UserId          string `json:"user_id"`
	Mobile          string `json:"mobile"`
	TenantKey       string `json:"tenant_key"`
	EmployeeNo      string `json:"employee_no"`
}

func NewClient(ctx context.Context, logger *log.Logger, appID, appSecret, redirectURI string) (*Client, error) {
	redirectURL, _ := url.Parse(redirectURI)
	redirectURL.Path = callbackPath
	redirectURI = redirectURL.String()

	oauthConfig := &oauth2.Config{
		ClientID:     appID,
		ClientSecret: appSecret,
		RedirectURL:  redirectURI,
		Endpoint:     oauthEndpoint,
		Scopes:       []string{},
	}

	return &Client{
		context:     ctx,
		logger:      logger.WithModule("feishu.client"),
		oauthConfig: oauthConfig,
	}, nil
}

// GenerateAuthURL 生成授权 URL
func (c *Client) GenerateAuthURL(state string, verifier string) string {
	return c.oauthConfig.AuthCodeURL(state, oauth2.S256ChallengeOption(verifier))
}

// GetAccessToken 通过授权码获取访问令牌
func (c *Client) GetAccessToken(ctx context.Context, code string, codeVerifier string) (*oauth2.Token, error) {
	token, err := c.oauthConfig.Exchange(ctx, code, oauth2.VerifierOption(codeVerifier))
	if err != nil {
		return nil, fmt.Errorf("oauthConfig.Exchange() failed: %w", err)
	}
	return token, nil
}

// GetUserInfoByCode 获取用户信息
func (c *Client) GetUserInfoByCode(ctx context.Context, code string, codeVerifier string) (*UserInfo, error) {
	token, err := c.oauthConfig.Exchange(ctx, code, oauth2.VerifierOption(codeVerifier))
	if err != nil {
		return nil, fmt.Errorf("oauthConfig.Exchange() failed: %w", err)
	}

	client := c.oauthConfig.Client(ctx, token)
	req, err := http.NewRequest("GET", UserInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	var r Response
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return nil, fmt.Errorf("failed to decode user info: %w", err)
	}

	c.logger.Info("GetUserInfoByCode", log.Any("resp", r))

	if r.Code != 0 {
		return nil, fmt.Errorf("failed to get user info: %s", r.Msg)
	}

	return &r.Data, nil
}
