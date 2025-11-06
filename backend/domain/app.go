package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/chaitin/panda-wiki/consts"
)

type AppType uint8

const (
	AppTypeWeb AppType = iota + 1
	AppTypeWidget
	AppTypeDingTalkBot
	AppTypeFeishuBot
	AppTypeWechatBot
	AppTypeWechatServiceBot
	AppTypeDisCordBot
	AppTypeWechatOfficialAccount
	AppTypeOpenAIAPI
	AppTypeWecomAIBot
	AppTypeLarkBot
)

var AppTypes = []AppType{
	AppTypeWeb,
	AppTypeWidget,
	AppTypeDingTalkBot,
	AppTypeFeishuBot,
	AppTypeWechatBot,
	AppTypeWechatServiceBot,
	AppTypeDisCordBot,
	AppTypeWechatOfficialAccount,
	AppTypeOpenAIAPI,
	AppTypeWecomAIBot,
	AppTypeLarkBot,
}

func (t AppType) ToSourceType() consts.SourceType {
	switch t {
	case AppTypeWeb:
		return ""
	case AppTypeWidget:
		return consts.SourceTypeWidget
	case AppTypeDingTalkBot:
		return consts.SourceTypeDingtalkBot
	case AppTypeFeishuBot:
		return consts.SourceTypeFeishuBot
	case AppTypeWechatBot:
		return consts.SourceTypeWechatBot
	case AppTypeWecomAIBot:
		return consts.SourceTypeWecomAIBot
	case AppTypeWechatServiceBot:
		return consts.SourceTypeWechatServiceBot
	case AppTypeDisCordBot:
		return consts.SourceTypeDiscordBot
	case AppTypeWechatOfficialAccount:
		return consts.SourceTypeWechatOfficialAccount
	case AppTypeOpenAIAPI:
		return consts.SourceTypeOpenAIAPI
	case AppTypeLarkBot:
		return consts.SourceTypeLarkBot
	default:
		return ""
	}
}

type App struct {
	ID   string  `json:"id" gorm:"primaryKey"`
	KBID string  `json:"kb_id"`
	Name string  `json:"name"`
	Type AppType `json:"type"`

	Settings AppSettings `json:"settings" gorm:"type:jsonb"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AppSettings struct {
	// nav
	Title string `json:"title,omitempty"`
	Icon  string `json:"icon,omitempty"`
	Btns  []any  `json:"btns,omitempty"`
	// welcome
	WelcomeStr         string   `json:"welcome_str,omitempty"`
	SearchPlaceholder  string   `json:"search_placeholder,omitempty"`
	RecommendQuestions []string `json:"recommend_questions,omitempty"`
	RecommendNodeIDs   []string `json:"recommend_node_ids,omitempty"`
	// seo
	Desc        string `json:"desc,omitempty"`
	Keyword     string `json:"keyword,omitempty"`
	AutoSitemap bool   `json:"auto_sitemap,omitempty"`
	// inject code
	HeadCode string `json:"head_code,omitempty"`
	BodyCode string `json:"body_code,omitempty"`
	// DingTalkBot
	DingTalkBotIsEnabled    *bool  `json:"dingtalk_bot_is_enabled,omitempty"`
	DingTalkBotClientID     string `json:"dingtalk_bot_client_id,omitempty"`
	DingTalkBotClientSecret string `json:"dingtalk_bot_client_secret,omitempty"`
	DingTalkBotTemplateID   string `json:"dingtalk_bot_template_id,omitempty"`
	// FeishuBot
	FeishuBotIsEnabled *bool  `json:"feishu_bot_is_enabled,omitempty"`
	FeishuBotAppID     string `json:"feishu_bot_app_id,omitempty"`
	FeishuBotAppSecret string `json:"feishu_bot_app_secret,omitempty"`
	// LarkBot
	LarkBotSettings LarkBotSettings `json:"lark_bot_settings,omitempty"`
	// WechatAppBot 企业微信机器人
	WeChatAppIsEnabled      *bool  `json:"wechat_app_is_enabled,omitempty"`
	WeChatAppToken          string `json:"wechat_app_token,omitempty"`
	WeChatAppEncodingAESKey string `json:"wechat_app_encodingaeskey,omitempty"`
	WeChatAppCorpID         string `json:"wechat_app_corpid,omitempty"`
	WeChatAppSecret         string `json:"wechat_app_secret,omitempty"`
	WeChatAppAgentID        string `json:"wechat_app_agent_id,omitempty"`
	// WecomAIBotSettings 企业微信智能机器人
	WecomAIBotSettings WecomAIBotSettings `json:"wecom_ai_bot_settings"`
	// WechatServiceBot
	WeChatServiceIsEnabled       *bool    `json:"wechat_service_is_enabled,omitempty"`
	WeChatServiceToken           string   `json:"wechat_service_token,omitempty"`
	WeChatServiceEncodingAESKey  string   `json:"wechat_service_encodingaeskey,omitempty"`
	WeChatServiceCorpID          string   `json:"wechat_service_corpid,omitempty"`
	WeChatServiceSecret          string   `json:"wechat_service_secret,omitempty"`
	WechatServiceContainKeywords []string `json:"wechat_service_contain_keywords"`
	WechatServiceEqualKeywords   []string `json:"wechat_service_equal_keywords"`
	// DisCordBot
	DiscordBotIsEnabled *bool  `json:"discord_bot_is_enabled,omitempty"`
	DiscordBotToken     string `json:"discord_bot_token,omitempty"`
	// WechatOfficialAccount
	WechatOfficialAccountIsEnabled      *bool  `json:"wechat_official_account_is_enabled,omitempty"`
	WechatOfficialAccountAppID          string `json:"wechat_official_account_app_id,omitempty"`
	WechatOfficialAccountAppSecret      string `json:"wechat_official_account_app_secret,omitempty"`
	WechatOfficialAccountToken          string `json:"wechat_official_account_token,omitempty"`
	WechatOfficialAccountEncodingAESKey string `json:"wechat_official_account_encodingaeskey,omitempty"`

	// theme
	ThemeMode     string        `json:"theme_mode,omitempty"`
	ThemeAndStyle ThemeAndStyle `json:"theme_and_style"`
	// catalog settings
	CatalogSettings CatalogSettings `json:"catalog_settings"`
	// footer settings
	FooterSettings FooterSettings `json:"footer_settings"`
	// Widget bot settings
	WidgetBotSettings WidgetBotSettings `json:"widget_bot_settings"`
	// webapp comment settings
	WebAppCommentSettings WebAppCommentSettings `json:"web_app_comment_settings"`
	// document feedback
	DocumentFeedBackIsEnabled *bool `json:"document_feedback_is_enabled,omitempty"`
	// AI feedback
	AIFeedbackSettings AIFeedbackSettings `json:"ai_feedback_settings"`
	// WebAppCustomStyle
	WebAppCustomSettings WebAppCustomSettings `json:"web_app_custom_style"`
	// OpenAI API Bot settings
	OpenAIAPIBotSettings OpenAIAPIBotSettings `json:"openai_api_bot_settings"`
	// Disclaimer Settings
	DisclaimerSettings DisclaimerSettings `json:"disclaimer_settings"`
	// WebAppLandingConfigs
	WebAppLandingConfigs []WebAppLandingConfig `json:"web_app_landing_configs,omitempty"`
	WebAppLandingTheme   WebAppLandingTheme    `json:"web_app_landing_theme"`

	WatermarkContent   string                  `json:"watermark_content"`
	WatermarkSetting   consts.WatermarkSetting `json:"watermark_setting" validate:"omitempty,oneof='' hidden visible"`
	CopySetting        consts.CopySetting      `json:"copy_setting" validate:"omitempty,oneof='' append disabled"`
	ContributeSettings ContributeSettings      `json:"contribute_settings"`
	HomePageSetting    consts.HomePageSetting  `json:"home_page_setting"`
}

type WebAppLandingTheme struct {
	Name string `json:"name"`
}

type LarkBotSettings struct {
	IsEnabled   *bool  `json:"is_enabled"`
	AppID       string `json:"app_id"`
	AppSecret   string `json:"app_secret"`
	VerifyToken string `json:"verify_token"`
	EncryptKey  string `json:"encrypt_key"`
}

type BannerConfig struct {
	Title            string   `json:"title"`
	TitleColor       string   `json:"title_color"`
	TitleFontSize    int      `json:"title_font_size"`
	Subtitle         string   `json:"subtitle"`
	Placeholder      string   `json:"placeholder"`
	SubtitleColor    string   `json:"subtitle_color"`
	SubtitleFontSize int      `json:"subtitle_font_size"`
	BgURL            string   `json:"bg_url"`
	HotSearch        []string `json:"hot_search"`
	Btns             []struct {
		ID   string `json:"id"`
		Text string `json:"text"`
		Type string `json:"type"`
		Href string `json:"href"`
	} `json:"btns"`
}
type BasicDocConfig struct {
	Title      string `json:"title"`
	TitleColor string `json:"title_color"`
	BgColor    string `json:"bg_color"`
}
type DirDocConfig struct {
	Title      string `json:"title"`
	TitleColor string `json:"title_color"`
	BgColor    string `json:"bg_color"`
}

type SimpleDocConfig struct {
	Title      string `json:"title"`
	TitleColor string `json:"title_color"`
	BgColor    string `json:"bg_color"`
}
type CarouselConfig struct {
	Title   string `json:"title"`
	BgColor string `json:"bg_color"`
	List    []struct {
		ID    string `json:"id"`
		Title string `json:"title"`
		URL   string `json:"url"`
		Desc  string `json:"desc"`
	} `json:"list"`
}
type FaqConfig struct {
	Title      string `json:"title"`
	TitleColor string `json:"title_color"`
	BgColor    string `json:"bg_color"`
	List       []struct {
		ID       string `json:"id"`
		Question string `json:"question"`
		Link     string `json:"link"`
	} `json:"list"`
}
type TextConfig struct {
	Type  string `json:"type"`
	Title string `json:"title"`
}
type MetricsConfig struct {
	Type  string `json:"type"`
	Title string `json:"title"`
	List  []struct {
		ID     string `json:"id"`
		Name   string `json:"name"`
		Number string `json:"number"`
	} `json:"list"`
}
type CaseConfig struct {
	Type  string `json:"type"`
	Title string `json:"title"`
	List  []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		Link string `json:"link"`
	} `json:"list"`
}
type CommentConfig struct {
	Type  string `json:"type"`
	Title string `json:"title"`
	List  []struct {
		ID         string `json:"id"`
		Avatar     string `json:"avatar"`
		UserName   string `json:"user_name"`
		Profession string `json:"profession"`
		Comment    string `json:"comment"`
	} `json:"list"`
}
type FeatureConfig struct {
	Type  string `json:"type"`
	Title string `json:"title"`
	List  []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		Desc string `json:"desc"`
	} `json:"list"`
}
type ImgTextConfig struct {
	Type  string `json:"type"`
	Title string `json:"title"`
	Item  struct {
		URL  string `json:"url"`
		Name string `json:"name"`
		Desc string `json:"desc"`
	} `json:"item"`
}
type TextImgConfig struct {
	Type  string `json:"type"`
	Title string `json:"title"`
	Item  struct {
		URL  string `json:"url"`
		Name string `json:"name"`
		Desc string `json:"desc"`
	} `json:"item"`
}
type QuestionConfig struct {
	Type  string `json:"type"`
	Title string `json:"title"`
	List  []struct {
		ID       string `json:"id"`
		Question string `json:"question"`
	} `json:"list"`
}
type BlockGridConfig struct {
	Type  string `json:"type"`
	Title string `json:"title"`
	List  []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		URL  string `json:"url"`
	} `json:"list"`
}

type WebAppLandingConfig struct {
	Type            string           `json:"type"`
	NodeIds         []string         `json:"node_ids"`
	BannerConfig    *BannerConfig    `json:"banner_config,omitempty"`
	BasicDocConfig  *BasicDocConfig  `json:"basic_doc_config,omitempty"`
	DirDocConfig    *DirDocConfig    `json:"dir_doc_config,omitempty"`
	SimpleDocConfig *SimpleDocConfig `json:"simple_doc_config,omitempty"`
	CarouselConfig  *CarouselConfig  `json:"carousel_config,omitempty"`
	FaqConfig       *FaqConfig       `json:"faq_config,omitempty"`
	MetricsConfig   *MetricsConfig   `json:"metrics_config,omitempty"`
	CaseConfig      *CaseConfig      `json:"case_config,omitempty"`
	TextConfig      *TextConfig      `json:"text_config,omitempty"`
	CommentConfig   *CommentConfig   `json:"comment_config,omitempty"`
	FeatureConfig   *FeatureConfig   `json:"feature_config,omitempty"`
	ImgTextConfig   *ImgTextConfig   `json:"img_text_config,omitempty"`
	TextImgConfig   *TextImgConfig   `json:"text_img_config,omitempty"`
	QuestionConfig  *QuestionConfig  `json:"question_config,omitempty"`
	BlockGridConfig *BlockGridConfig `json:"block_grid_config,omitempty"`
	ComConfigOrder  []string         `json:"com_config_order"`
}

type WecomAIBotSettings struct {
	IsEnabled      bool   `json:"is_enabled,omitempty"`
	Token          string `json:"token,omitempty"`
	EncodingAESKey string `json:"encodingaeskey,omitempty"`
}

type DisclaimerSettings struct {
	Content *string `json:"content"`
}

type ContributeSettings struct {
	IsEnable bool `json:"is_enable"`
}

type OpenAIAPIBotSettings struct {
	IsEnabled bool   `json:"is_enabled"`
	SecretKey string `json:"secret_key"`
}

type WebAppCustomSettings struct {
	AllowThemeSwitching *bool                `json:"allow_theme_switching"`
	HeaderPlaceholder   string               `json:"header_search_placeholder"`
	SocialMediaAccounts []SocialMediaAccount `json:"social_media_accounts"`
	ShowBrandInfo       *bool                `json:"show_brand_info"`
	FooterShowIntro     *bool                `json:"footer_show_intro"`
}

type SocialMediaAccount struct {
	Channel string `json:"channel"`
	Text    string `json:"text"`
	Link    string `json:"link"`
	Icon    string `json:"icon"`
	Phone   string `json:"phone"`
}

type WebAppCommentSettings struct {
	IsEnable         bool `json:"is_enable"`
	ModerationEnable bool `json:"moderation_enable"`
}

type AIFeedbackSettings struct {
	AIFeedbackIsEnabled *bool    `json:"is_enabled"`
	AIFeedbackType      []string `json:"ai_feedback_type"`
}

type ThemeAndStyle struct {
	BGImage  string `json:"bg_image,omitempty"`
	DocWidth string `json:"doc_width,omitempty"`
}

type CatalogSettings struct {
	CatalogFolder  int `json:"catalog_folder,omitempty"`  // 1: 展开, 2: 折叠, default: 1
	CatalogWidth   int `json:"catalog_width,omitempty"`   // 200 - 300, default: 260
	CatalogVisible int `json:"catalog_visible,omitempty"` // 1: 显示, 2: 隐藏, default: 1
}

type FooterSettings struct {
	FooterStyle string       `json:"footer_style,omitempty"`
	CorpName    string       `json:"corp_name,omitempty"`
	ICP         string       `json:"icp,omitempty"`
	BrandName   string       `json:"brand_name,omitempty"`
	BrandDesc   string       `json:"brand_desc,omitempty"`
	BrandLogo   string       `json:"brand_logo,omitempty"`
	BrandGroups []BrandGroup `json:"brand_groups,omitempty"`
}

type WidgetBotSettings struct {
	IsOpen             bool     `json:"is_open,omitempty"`
	ThemeMode          string   `json:"theme_mode,omitempty"`
	BtnText            string   `json:"btn_text,omitempty"`
	BtnLogo            string   `json:"btn_logo,omitempty"`
	RecommendQuestions []string `json:"recommend_questions,omitempty"`
	RecommendNodeIDs   []string `json:"recommend_node_ids,omitempty"`
}

type BrandGroup struct {
	Name  string `json:"name,omitempty"`
	Links []Link `json:"links,omitempty"`
}

type Link struct {
	Name string `json:"name,omitempty"`
	URL  string `json:"url,omitempty"`
}

func (s *AppSettings) Scan(value any) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New(fmt.Sprint("invalid app settings value type:", value))
	}
	return json.Unmarshal(bytes, s)
}

func (s AppSettings) Value() (driver.Value, error) {
	return json.Marshal(s)
}

type AppDetailResp struct {
	ID   string `json:"id" gorm:"primaryKey"`
	KBID string `json:"kb_id"`

	Name string  `json:"name"`
	Type AppType `json:"type"`

	Settings AppSettingsResp `json:"settings" gorm:"type:jsonb"`

	RecommendNodes []*RecommendNodeListResp `json:"recommend_nodes,omitempty" gorm:"-"`
}

type AppSettingsResp struct {
	// nav
	Title string `json:"title,omitempty"`
	Icon  string `json:"icon,omitempty"`
	Btns  []any  `json:"btns,omitempty"`
	// welcome
	WelcomeStr         string   `json:"welcome_str,omitempty"`
	SearchPlaceholder  string   `json:"search_placeholder,omitempty"`
	RecommendQuestions []string `json:"recommend_questions,omitempty"`
	RecommendNodeIDs   []string `json:"recommend_node_ids,omitempty"`
	// seo
	Desc        string `json:"desc,omitempty"`
	Keyword     string `json:"keyword,omitempty"`
	AutoSitemap bool   `json:"auto_sitemap,omitempty"`
	// inject code
	HeadCode string `json:"head_code,omitempty"`
	BodyCode string `json:"body_code,omitempty"`
	// DingTalkBot
	DingTalkBotIsEnabled    *bool  `json:"dingtalk_bot_is_enabled,omitempty"`
	DingTalkBotClientID     string `json:"dingtalk_bot_client_id,omitempty"`
	DingTalkBotClientSecret string `json:"dingtalk_bot_client_secret,omitempty"`
	DingTalkBotTemplateID   string `json:"dingtalk_bot_template_id,omitempty"`
	// FeishuBot
	FeishuBotIsEnabled *bool  `json:"feishu_bot_is_enabled,omitempty"`
	FeishuBotAppID     string `json:"feishu_bot_app_id,omitempty"`
	FeishuBotAppSecret string `json:"feishu_bot_app_secret,omitempty"`
	// LarkBot
	LarkBotSettings LarkBotSettings `json:"lark_bot_settings,omitempty"`
	// WechatAppBot
	WeChatAppIsEnabled      *bool  `json:"wechat_app_is_enabled,omitempty"`
	WeChatAppToken          string `json:"wechat_app_token,omitempty"`
	WeChatAppEncodingAESKey string `json:"wechat_app_encodingaeskey,omitempty"`
	WeChatAppCorpID         string `json:"wechat_app_corpid,omitempty"`
	WeChatAppSecret         string `json:"wechat_app_secret,omitempty"`
	WeChatAppAgentID        string `json:"wechat_app_agent_id,omitempty"`
	// WechatServiceBot
	WeChatServiceIsEnabled       *bool    `json:"wechat_service_is_enabled,omitempty"`
	WeChatServiceToken           string   `json:"wechat_service_token,omitempty"`
	WeChatServiceEncodingAESKey  string   `json:"wechat_service_encodingaeskey,omitempty"`
	WeChatServiceCorpID          string   `json:"wechat_service_corpid,omitempty"`
	WeChatServiceSecret          string   `json:"wechat_service_secret,omitempty"`
	WechatServiceContainKeywords []string `json:"wechat_service_contain_keywords"`
	WechatServiceEqualKeywords   []string `json:"wechat_service_equal_keywords"`

	// DisCordBot
	DiscordBotIsEnabled *bool  `json:"discord_bot_is_enabled,omitempty"`
	DiscordBotToken     string `json:"discord_bot_token,omitempty"`
	// WechatOfficialAccount
	WechatOfficialAccountIsEnabled      *bool  `json:"wechat_official_account_is_enabled,omitempty"`
	WechatOfficialAccountAppID          string `json:"wechat_official_account_app_id,omitempty"`
	WechatOfficialAccountAppSecret      string `json:"wechat_official_account_app_secret,omitempty"`
	WechatOfficialAccountToken          string `json:"wechat_official_account_token,omitempty"`
	WechatOfficialAccountEncodingAESKey string `json:"wechat_official_account_encodingaeskey,omitempty"`

	WecomAIBotSettings WecomAIBotSettings `json:"wecom_ai_bot_settings"`

	// theme
	ThemeMode     string        `json:"theme_mode,omitempty"`
	ThemeAndStyle ThemeAndStyle `json:"theme_and_style"`
	// catalog settings
	CatalogSettings CatalogSettings `json:"catalog_settings"`
	// footer settings
	FooterSettings FooterSettings `json:"footer_settings"`
	// WidgetBot
	WidgetBotSettings WidgetBotSettings `json:"widget_bot_settings"`
	// webapp comment settings
	WebAppCommentSettings WebAppCommentSettings `json:"web_app_comment_settings"`
	// document feedback
	DocumentFeedBackIsEnabled *bool `json:"document_feedback_is_enabled,omitempty"`
	// AI feedback
	AIFeedbackSettings AIFeedbackSettings `json:"ai_feedback_settings"`
	// WebAppCustomStyle
	WebAppCustomSettings WebAppCustomSettings `json:"web_app_custom_style"`

	WatermarkContent   string                  `json:"watermark_content"`
	WatermarkSetting   consts.WatermarkSetting `json:"watermark_setting"`
	CopySetting        consts.CopySetting      `json:"copy_setting"`
	ContributeSettings ContributeSettings      `json:"contribute_settings"`

	// OpenAI API settings
	OpenAIAPIBotSettings OpenAIAPIBotSettings `json:"openai_api_bot_settings"`
	// Disclaimer Settings
	DisclaimerSettings DisclaimerSettings `json:"disclaimer_settings"`
	// WebApp Landing Settings
	WebAppLandingConfigs []WebAppLandingConfigResp `json:"web_app_landing_configs,omitempty"`
	WebAppLandingTheme   WebAppLandingTheme        `json:"web_app_landing_theme"`
	HomePageSetting      consts.HomePageSetting    `json:"home_page_setting"`
}

type WebAppLandingConfigResp struct {
	Type            string                   `json:"type"`
	BannerConfig    *BannerConfig            `json:"banner_config,omitempty"`
	BasicDocConfig  *BasicDocConfig          `json:"basic_doc_config,omitempty"`
	DirDocConfig    *DirDocConfig            `json:"dir_doc_config,omitempty"`
	SimpleDocConfig *SimpleDocConfig         `json:"simple_doc_config,omitempty"`
	CarouselConfig  *CarouselConfig          `json:"carousel_config,omitempty"`
	FaqConfig       *FaqConfig               `json:"faq_config,omitempty"`
	MetricsConfig   *MetricsConfig           `json:"metrics_config,omitempty"`
	CaseConfig      *CaseConfig              `json:"case_config,omitempty"`
	TextConfig      *TextConfig              `json:"text_config,omitempty"`
	CommentConfig   *CommentConfig           `json:"comment_config,omitempty"`
	FeatureConfig   *FeatureConfig           `json:"feature_config,omitempty"`
	ImgTextConfig   *ImgTextConfig           `json:"img_text_config,omitempty"`
	TextImgConfig   *TextImgConfig           `json:"text_img_config,omitempty"`
	QuestionConfig  *QuestionConfig          `json:"question_config,omitempty"`
	BlockGridConfig *BlockGridConfig         `json:"block_grid_config,omitempty"`
	ComConfigOrder  []string                 `json:"com_config_order"`
	NodeIds         []string                 `json:"node_ids"`
	Nodes           []*RecommendNodeListResp `json:"nodes" gorm:"-"`
}

func (s *AppSettingsResp) Scan(value any) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New(fmt.Sprint("invalid app settings value type:", value))
	}
	return json.Unmarshal(bytes, s)
}

func (s AppSettingsResp) Value() (driver.Value, error) {
	return json.Marshal(s)
}

type UpdateAppReq struct {
	Name     *string      `json:"name"`
	KbID     string       `json:"kb_id"`
	Settings *AppSettings `json:"settings" gorm:"type:jsonb"`
}

type CreateAppReq struct {
	Name string  `json:"name"`
	Type AppType `json:"type" validate:"required,oneof=1 2 3 4 5 6 7 8"`
	Icon string  `json:"icon"`
	KBID string  `json:"kb_id" validate:"required"`
}

type AppInfoResp struct {
	Name string `json:"name"`

	Settings AppSettingsResp `json:"settings" gorm:"type:jsonb"`

	RecommendNodes []*RecommendNodeListResp `json:"recommend_nodes,omitempty" gorm:"-"`
}
