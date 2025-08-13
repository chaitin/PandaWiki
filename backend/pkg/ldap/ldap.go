package ldap

import (
	"context"
	"fmt"
	"strings"

	"github.com/go-ldap/ldap/v3"

	"github.com/chaitin/panda-wiki/log"
)

type Client struct {
	logger *log.Logger
	ctx    context.Context
	config *Config
}

type Config struct {
	ServerURL     string `json:"server_url"`      // LDAP服务器URL，如 ldap://openldap.company.com:389
	BindDN        string `json:"bind_dn"`         // 绑定DN，如 cn=admin,dc=company,dc=com
	BindPassword  string `json:"bind_password"`   // 绑定密码
	UserBaseDN    string `json:"user_base_dn"`    // 用户基础DN，如 ou=People,dc=company,dc=com
	UserFilter    string `json:"user_filter"`     // 用户查询过滤器，如 (&(objectClass=person)(uid=%s))
	UserIDAttr    string `json:"user_id_attr"`    // 用户ID属性，默认 uid
	UserNameAttr  string `json:"user_name_attr"`  // 用户名属性，默认 cn
	UserEmailAttr string `json:"user_email_attr"` // 用户邮箱属性，默认 mail
}

type UserInfo struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	DN       string `json:"dn"` // Distinguished Name
}

const (
	defaultUserIDAttr    = "uid"
	defaultUserNameAttr  = "cn"
	defaultUserEmailAttr = "mail"
	defaultUserFilter    = "(&(objectClass=person)(uid=%s))"
)

// NewClient 创建LDAP客户端
func NewClient(ctx context.Context, logger *log.Logger, config Config) (*Client, error) {
	// 设置默认值
	if config.UserIDAttr == "" {
		config.UserIDAttr = defaultUserIDAttr
	}
	if config.UserNameAttr == "" {
		config.UserNameAttr = defaultUserNameAttr
	}
	if config.UserEmailAttr == "" {
		config.UserEmailAttr = defaultUserEmailAttr
	}
	if config.UserFilter == "" {
		config.UserFilter = defaultUserFilter
	}

	// 验证必需的配置
	if config.ServerURL == "" {
		return nil, fmt.Errorf("LDAP server URL is required")
	}
	if config.BindDN == "" {
		return nil, fmt.Errorf("bind DN is required")
	}
	if config.UserBaseDN == "" {
		return nil, fmt.Errorf("user base DN is required")
	}

	return &Client{
		ctx:    ctx,
		logger: logger.WithModule("pkg.ldap"),
		config: &config,
	}, nil
}

// Authenticate 验证用户凭据并获取用户信息
func (c *Client) Authenticate(username, password string) (*UserInfo, error) {
	// 连接到LDAP服务器
	conn, err := ldap.DialURL(c.config.ServerURL)
	if err != nil {
		c.logger.Error("failed to connect to LDAP server", log.Error(err))
		return nil, fmt.Errorf("failed to connect to LDAP server: %w", err)
	}
	defer conn.Close()

	// 使用管理员账户绑定
	err = conn.Bind(c.config.BindDN, c.config.BindPassword)
	if err != nil {
		c.logger.Error("failed to bind with admin credentials", log.Error(err))
		return nil, fmt.Errorf("failed to bind with admin credentials: %w", err)
	}

	// 搜索用户
	userInfo, err := c.searchUser(conn, username)
	if err != nil {
		return nil, err
	}

	// 验证用户密码
	err = conn.Bind(userInfo.DN, password)
	if err != nil {
		c.logger.Error("user authentication failed",
			log.String("username", username),
			log.String("dn", userInfo.DN),
			log.Error(err))
		return nil, fmt.Errorf("authentication failed: invalid credentials")
	}

	c.logger.Info("user authenticated successfully",
		log.String("username", username),
		log.String("dn", userInfo.DN))

	return userInfo, nil
}

// searchUser 搜索用户信息
func (c *Client) searchUser(conn *ldap.Conn, username string) (*UserInfo, error) {
	// 构建搜索过滤器
	filter := fmt.Sprintf(c.config.UserFilter, username)

	// 构建搜索请求
	searchRequest := ldap.NewSearchRequest(
		c.config.UserBaseDN,
		ldap.ScopeWholeSubtree,
		ldap.NeverDerefAliases,
		0, // 不限制结果数量
		0, // 不限制搜索时间
		false,
		filter,
		[]string{c.config.UserIDAttr, c.config.UserNameAttr, c.config.UserEmailAttr},
		nil,
	)

	c.logger.Info("searching for user",
		log.String("filter", filter),
		log.String("base_dn", c.config.UserBaseDN))

	// 执行搜索
	searchResult, err := conn.Search(searchRequest)
	if err != nil {
		c.logger.Error("user search failed", log.Error(err))
		return nil, fmt.Errorf("user search failed: %w", err)
	}

	// 检查搜索结果
	if len(searchResult.Entries) == 0 {
		c.logger.Warn("user not found", log.String("username", username))
		return nil, fmt.Errorf("user not found: %s", username)
	}

	if len(searchResult.Entries) > 1 {
		c.logger.Warn("multiple users found",
			log.String("username", username),
			log.Int("count", len(searchResult.Entries)))
		return nil, fmt.Errorf("multiple users found for username: %s", username)
	}

	// 解析用户信息
	entry := searchResult.Entries[0]
	userInfo := &UserInfo{
		DN:       entry.DN,
		ID:       c.getAttributeValue(entry, c.config.UserIDAttr),
		Username: c.getAttributeValue(entry, c.config.UserNameAttr),
		Email:    c.getAttributeValue(entry, c.config.UserEmailAttr),
	}

	// 如果没有获取到用户名，使用ID作为用户名
	if userInfo.Username == "" {
		userInfo.Username = userInfo.ID
	}

	c.logger.Info("user found",
		log.String("dn", userInfo.DN),
		log.String("id", userInfo.ID),
		log.String("username", userInfo.Username),
		log.String("email", userInfo.Email))

	return userInfo, nil
}

// getAttributeValue 获取LDAP属性值
func (c *Client) getAttributeValue(entry *ldap.Entry, attrName string) string {
	values := entry.GetAttributeValues(attrName)
	if len(values) > 0 {
		return strings.TrimSpace(values[0])
	}
	return ""
}

// TestConnection 测试LDAP连接
func (c *Client) TestConnection() error {
	conn, err := ldap.DialURL(c.config.ServerURL)
	if err != nil {
		return fmt.Errorf("failed to connect to LDAP server: %w", err)
	}
	defer conn.Close()

	err = conn.Bind(c.config.BindDN, c.config.BindPassword)
	if err != nil {
		return fmt.Errorf("failed to bind with admin credentials: %w", err)
	}

	c.logger.Info("LDAP connection test successful")
	return nil
}
