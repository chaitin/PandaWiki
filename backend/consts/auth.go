package consts

type SourceType string

const (
	SourceTypeDingTalk SourceType = "dingtalk"
	SourceTypeFeishu   SourceType = "feishu"
	SourceTypeWeCom    SourceType = "wecom"
	SourceTypeOAuth    SourceType = "oauth"
	SourceTypeCAS      SourceType = "cas"
	SourceTypeLDAP     SourceType = "ldap"
)
