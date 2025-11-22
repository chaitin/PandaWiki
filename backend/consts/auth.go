package consts

type SourceType string

var (
	BotSourceTypes = []SourceType{SourceTypeWidget, SourceTypeDingtalkBot, SourceTypeFeishuBot, SourceTypeLarkBot, SourceTypeWechatBot, SourceTypeWechatServiceBot, SourceTypeDiscordBot, SourceTypeWechatOfficialAccount}
)

const (
	SourceTypeDingTalk              SourceType = "dingtalk"
	SourceTypeFeishu                SourceType = "feishu"
	SourceTypeWeCom                 SourceType = "wecom"
	SourceTypeOAuth                 SourceType = "oauth"
	SourceTypeGitHub                SourceType = "github"
	SourceTypeCAS                   SourceType = "cas"
	SourceTypeLDAP                  SourceType = "ldap"
	SourceTypeWidget                SourceType = "widget"
	SourceTypeDingtalkBot           SourceType = "dingtalk_bot"
	SourceTypeFeishuBot             SourceType = "feishu_bot"
	SourceTypeLarkBot               SourceType = "lark_bot"
	SourceTypeWechatBot             SourceType = "wechat_bot"
	SourceTypeWecomAIBot            SourceType = "wecom_ai_bot"
	SourceTypeWechatServiceBot      SourceType = "wechat_service_bot"
	SourceTypeDiscordBot            SourceType = "discord_bot"
	SourceTypeWechatOfficialAccount SourceType = "wechat_official_account"
	SourceTypeOpenAIAPI             SourceType = "openai_api"
	SourceTypeMcpServer             SourceType = "mcp_server"
)

func (s SourceType) Name() string {
	switch s {
	case SourceTypeWidget:
		return "网页挂件机器人"
	case SourceTypeDingtalkBot:
		return "钉钉机器人"
	case SourceTypeFeishuBot:
		return "飞书机器人"
	case SourceTypeLarkBot:
		return "Lark机器人"
	case SourceTypeWechatBot:
		return "企业微信机器人"
	case SourceTypeWecomAIBot:
		return "企业微信智能机器人"
	case SourceTypeWechatServiceBot:
		return "企业微信客服"
	case SourceTypeDiscordBot:
		return "Discord 机器人"
	case SourceTypeWechatOfficialAccount:
		return "微信公众号"
	case SourceTypeMcpServer:
		return "MCP 服务器"
	default:
		return ""
	}
}

type AuthType string

const (
	AuthTypeNull       AuthType = ""           // 无认证
	AuthTypeSimple     AuthType = "simple"     // 简单口令
	AuthTypeEnterprise AuthType = "enterprise" // 企业认证

)
