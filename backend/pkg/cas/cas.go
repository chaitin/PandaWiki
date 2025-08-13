package cas

import (
	"context"
	"crypto/tls"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/chaitin/panda-wiki/log"
)

type Client struct {
	logger     *log.Logger
	ctx        context.Context
	config     *Config
	httpClient *http.Client
}

type Config struct {
	ServerURL    string `json:"server_url"`    // CAS服务器URL，如 https://cas.example.com/cas
	ServiceURL   string `json:"service_url"`   // 服务回调URL
	LoginPath    string `json:"login_path"`    // 登录路径，默认为 /login
	ValidatePath string `json:"validate_path"` // 验证路径，默认根据版本自动选择
	Version      string `json:"version"`       // CAS协议版本: "2" 或 "3"
	CASUrl       string `json:"cas_url"`
}

type UserInfo struct {
	Username   string            `json:"username"`
	Attributes map[string]string `json:"attributes"`
}

// CAS2ServiceResponse CAS2服务验证响应结构
type CAS2ServiceResponse struct {
	XMLName xml.Name                   `xml:"serviceResponse"`
	Success *CAS2AuthenticationSuccess `xml:"authenticationSuccess"`
	Failure *AuthenticationFailure     `xml:"authenticationFailure"`
}

type CAS2AuthenticationSuccess struct {
	User string `xml:"user"`
}

// CAS3ServiceResponse CAS3服务验证响应结构
type CAS3ServiceResponse struct {
	XMLName xml.Name                   `xml:"serviceResponse"`
	Success *CAS3AuthenticationSuccess `xml:"authenticationSuccess"`
	Failure *AuthenticationFailure     `xml:"authenticationFailure"`
}

type CAS3AuthenticationSuccess struct {
	User       string         `xml:"user"`
	Attributes CAS3Attributes `xml:"attributes"`
}

type AuthenticationFailure struct {
	Code    string `xml:"code,attr"`
	Message string `xml:",chardata"`
}

type CAS3Attributes struct {
	Email     string `xml:"email"`
	Name      string `xml:"name"`
	AvatarURL string `xml:"avatar_url"`
}

const (
	defaultLoginPath        = "/login"
	defaultValidatePathCAS2 = "/serviceValidate"
	defaultValidatePathCAS3 = "/p3/serviceValidate"
	callbackPath            = "/share/pro/v1/openapi/cas/callback"
)

// NewClient 创建CAS客户端
func NewClient(ctx context.Context, logger *log.Logger, config Config) (*Client, error) {
	// 设置默认登录路径
	if config.LoginPath == "" {
		config.LoginPath = defaultLoginPath
	}

	// 如果版本为空，默认使用CAS3
	if config.Version == "" {
		config.Version = "3"
	}

	// 根据版本设置默认验证路径
	if config.ValidatePath == "" {
		switch config.Version {
		case "3":
			config.ValidatePath = defaultValidatePathCAS3
		case "2", "":
			config.ValidatePath = defaultValidatePathCAS2
		default:
			return nil, fmt.Errorf("unsupported CAS version: %s, supported versions are '2' and '3'", config.Version)
		}
	}

	// 构建服务回调URL
	if config.ServiceURL != "" {
		serviceURL, err := url.Parse(config.ServiceURL)
		if err != nil {
			return nil, fmt.Errorf("invalid service URL: %w", err)
		}
		serviceURL.Path = callbackPath
		config.ServiceURL = serviceURL.String()
	}

	return &Client{
		ctx:    ctx,
		logger: logger.WithModule("pkg.cas"),
		config: &config,
		httpClient: &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			},
		},
	}, nil
}

// GetLoginURL 获取CAS登录URL
func (c *Client) GetLoginURL(state string) string {
	loginURL := strings.TrimSuffix(c.config.ServerURL, "/") + c.config.LoginPath

	params := url.Values{}
	params.Set("service", c.config.ServiceURL+"?state="+state)

	return loginURL + "?" + params.Encode()
}

// ValidateTicket 验证CAS票据并获取用户信息
func (c *Client) ValidateTicket(ticket, state string) (*UserInfo, error) {
	validateURL := strings.TrimSuffix(c.config.ServerURL, "/") + c.config.ValidatePath

	params := url.Values{}
	params.Set("service", c.config.ServiceURL+"?state="+state)
	params.Set("ticket", ticket)

	fullURL := validateURL + "?" + params.Encode()

	c.logger.Info("validating CAS ticket",
		log.String("url", fullURL),
		log.String("version", c.config.Version))

	resp, err := c.httpClient.Get(fullURL)
	if err != nil {
		return nil, fmt.Errorf("failed to validate ticket: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	c.logger.Info("CAS validation response", log.String("response", string(body)))

	// 根据CAS版本解析不同的响应格式
	switch c.config.Version {
	case "2":
		return c.parseCAS2Response(body)
	case "3":
		return c.parseCAS3Response(body)
	default:
		return nil, fmt.Errorf("unsupported CAS version: %s", c.config.Version)
	}
}

// parseCAS2Response 解析CAS2响应
func (c *Client) parseCAS2Response(body []byte) (*UserInfo, error) {
	var serviceResp CAS2ServiceResponse
	if err := xml.Unmarshal(body, &serviceResp); err != nil {
		return nil, fmt.Errorf("failed to parse CAS2 response: %w", err)
	}

	if serviceResp.Failure != nil {
		return nil, fmt.Errorf("CAS validation failed: %s - %s",
			serviceResp.Failure.Code, strings.TrimSpace(serviceResp.Failure.Message))
	}

	if serviceResp.Success == nil {
		return nil, fmt.Errorf("invalid CAS2 response: no success or failure element")
	}

	userInfo := &UserInfo{
		Username: serviceResp.Success.User,
		Attributes: map[string]string{
			"name": serviceResp.Success.User, // CAS2通常只返回用户名
		},
	}

	return userInfo, nil
}

// parseCAS3Response 解析CAS3响应
func (c *Client) parseCAS3Response(body []byte) (*UserInfo, error) {
	var serviceResp CAS3ServiceResponse
	if err := xml.Unmarshal(body, &serviceResp); err != nil {
		return nil, fmt.Errorf("failed to parse CAS3 response: %w", err)
	}

	if serviceResp.Failure != nil {
		return nil, fmt.Errorf("CAS validation failed: %s - %s",
			serviceResp.Failure.Code, strings.TrimSpace(serviceResp.Failure.Message))
	}

	if serviceResp.Success == nil {
		return nil, fmt.Errorf("invalid CAS3 response: no success or failure element")
	}

	userInfo := &UserInfo{
		Username: serviceResp.Success.User,
		Attributes: map[string]string{
			"email":      serviceResp.Success.Attributes.Email,
			"name":       serviceResp.Success.Attributes.Name,
			"avatar_url": serviceResp.Success.Attributes.AvatarURL,
		},
	}

	// 如果没有显示名称，使用用户名
	if userInfo.Attributes["name"] == "" {
		userInfo.Attributes["name"] = userInfo.Username
	}

	return userInfo, nil
}
