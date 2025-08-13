package oauth

import (
	"context"
	"io"
	"net/url"

	"github.com/tidwall/gjson"
	"golang.org/x/oauth2"

	"github.com/chaitin/panda-wiki/log"
)

type Client struct {
	logger *log.Logger
	ctx    context.Context
	config *Config
	oauth  *oauth2.Config
}

const (
	callbackPath = "/share/pro/v1/openapi/oauth/callback"
)

type Config struct {
	ClientID     string   `json:"client_id"`
	ClientSecret string   `json:"client_secret"`
	RedirectURI  string   `json:"redirect_uri,omitempty"`
	Scopes       []string `json:"scopes,omitempty"`
	AuthorizeURL string   `json:"authorize_url,omitempty"`
	TokenURL     string   `json:"token_url,omitempty"`
	UserInfoURL  string   `json:"user_info_url,omitempty"`
	IDField      string   `json:"id_field,omitempty"`
	NameField    string   `json:"name_field,omitempty"`
	AvatarField  string   `json:"avatar_field,omitempty"`
	EmailField   string   `json:"email_field,omitempty"`
}
type UserInfo struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarUrl string `json:"avatar_url"`
}

// NewClient 创建OAuth客户端
func NewClient(ctx context.Context, logger *log.Logger, config Config) (*Client, error) {
	redirectURL, _ := url.Parse(config.RedirectURI)
	redirectURL.Path = callbackPath
	redirectURI := redirectURL.String()

	return &Client{
		ctx:    ctx,
		logger: logger.WithModule("pkg.oauth"),
		oauth: &oauth2.Config{
			ClientID:     config.ClientID,
			ClientSecret: config.ClientSecret,
			Endpoint: oauth2.Endpoint{
				AuthURL:  config.AuthorizeURL,
				TokenURL: config.TokenURL,
			},
			RedirectURL: redirectURI,
			Scopes:      config.Scopes,
		},
		config: &config,
	}, nil
}

func (c *Client) GetAuthorizeURL(state string) string {
	return c.oauth.AuthCodeURL(state)
}

func (c *Client) GetUserInfo(code string) (*UserInfo, error) {
	token, err := c.oauth.Exchange(c.ctx, code)
	if err != nil {
		return nil, err
	}
	client := c.oauth.Client(c.ctx, token)
	res, err := client.Get(c.config.UserInfoURL)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	buf, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	c.logger.Info("oauth GetUserInfo:", log.Any("resp", string(buf)))

	jsonString := string(buf)

	return &UserInfo{
		ID:        gjson.Get(jsonString, c.config.IDField).String(),
		AvatarUrl: gjson.Get(jsonString, c.config.AvatarField).String(),
		Name:      gjson.Get(jsonString, c.config.NameField).String(),
		Email:     gjson.Get(jsonString, c.config.EmailField).String(),
	}, nil
}
