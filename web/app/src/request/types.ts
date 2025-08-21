/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export enum SchemaRoleType {
  Assistant = "assistant",
  User = "user",
  System = "system",
  Tool = "tool",
}

export enum GithubComChaitinPandaWikiDomainModelProvider {
  ModelProviderBrandBaiZhiCloud = "BaiZhiCloud",
}

export enum DomainStatPageScene {
  StatPageSceneWelcome = 1,
  StatPageSceneNodeDetail = 2,
  StatPageSceneChat = 3,
  StatPageSceneLogin = 4,
}

export enum DomainScoreType {
  Like = 1,
  DisLike = -1,
}

/** @format int32 */
export enum DomainNodeType {
  NodeTypeFolder = 1,
  NodeTypeDocument = 2,
}

/** @format int32 */
export enum DomainNodeStatus {
  NodeStatusDraft = 1,
  NodeStatusReleased = 2,
}

export enum DomainModelType {
  ModelTypeChat = "chat",
  ModelTypeEmbedding = "embedding",
  ModelTypeRerank = "rerank",
  ModelTypeAnalysis = "analysis",
}

export enum DomainMessageFrom {
  MessageFromGroup = 1,
  MessageFromPrivate = 2,
}

/** @format int32 */
export enum DomainCommentStatus {
  CommentStatusReject = -1,
  CommentStatusPending = 0,
  CommentStatusAccepted = 1,
}

/** @format int32 */
export enum DomainAppType {
  AppTypeWeb = 1,
  AppTypeWidget = 2,
  AppTypeDingTalkBot = 3,
  AppTypeFeishuBot = 4,
  AppTypeWechatBot = 5,
  AppTypeWechatServiceBot = 6,
  AppTypeDisCordBot = 7,
  AppTypeWechatOfficialAccount = 8,
  AppTypeOpenAIAPI = 9,
}

export enum ConstsWatermarkSetting {
  /** 未开启水印 */
  WatermarkDisabled = "",
  /** 隐形水印 */
  WatermarkHidden = "hidden",
  /** 显性水印 */
  WatermarkVisible = "visible",
}

export enum ConstsUserRole {
  /** 管理员 */
  UserRoleAdmin = "admin",
  /** 普通用户 */
  UserRoleUser = "user",
}

export enum ConstsUserKBPermission {
  /** 无权限 */
  UserKBPermissionNull = "",
  /** 完全控制 */
  UserKBPermissionFullControl = "full_control",
  /** 文档管理 */
  UserKBPermissionDocManage = "doc_manage",
  /** 数据运营 */
  UserKBPermissionDataOperate = "data_operate",
}

export enum ConstsStatDay {
  StatDay1 = 1,
  StatDay7 = 7,
  StatDay30 = 30,
  StatDay90 = 90,
}

export enum ConstsSourceType {
  SourceTypeDingTalk = "dingtalk",
  SourceTypeFeishu = "feishu",
  SourceTypeWeCom = "wecom",
  SourceTypeOAuth = "oauth",
  SourceTypeGitHub = "github",
  SourceTypeCAS = "cas",
  SourceTypeLDAP = "ldap",
  SourceTypeWidget = "widget",
  SourceTypeDingtalkBot = "dingtalk_bot",
  SourceTypeFeishuBot = "feishu_bot",
  SourceTypeWechatBot = "wechat_bot",
  SourceTypeWechatServiceBot = "wechat_service_bot",
  SourceTypeDiscordBot = "discord_bot",
  SourceTypeWechatOfficialAccount = "wechat_official_account",
  SourceTypeOpenAIAPI = "openai_api",
}

export enum ConstsNodePermName {
  /** 导航内可见 */
  NodePermNameVisible = "visible",
  /** 可被访问 */
  NodePermNameVisitable = "visitable",
  /** 可被问答 */
  NodePermNameAnswerable = "answerable",
}

export enum ConstsNodeAccessPerm {
  /** 完全开放 */
  NodeAccessPermOpen = "open",
  /** 部分开放 */
  NodeAccessPermPartial = "partial",
  /** 完全禁止 */
  NodeAccessPermClosed = "closed",
}

export enum ConstsCopySetting {
  /** 无限制 */
  CopySettingNone = "",
  /** 增加内容尾巴 */
  CopySettingAppend = "append",
  /** 禁止复制内容 */
  CopySettingDisabled = "disabled",
}

export enum ConstsCaptchaStatus {
  CaptchaStatusEnable = "enable",
  CaptchaStatusDisable = "disable",
}

export enum ConstsAuthType {
  /** 无认证 */
  AuthTypeNull = "",
  /** 简单口令 */
  AuthTypeSimple = "simple",
  /** 企业认证 */
  AuthTypeEnterprise = "enterprise",
}

export interface ConstsCaptchaSettings {
  chat_status?: "" | "enable" | "disable";
  comment_status?: "" | "enable" | "disable";
}

export interface ConstsRedeemCaptchaReq {
  solutions?: number[];
  token?: string;
}

export interface DomainAIFeedbackSettings {
  ai_feedback_type?: string[];
  is_enabled?: boolean;
}

export interface DomainAccessSettings {
  base_url?: string;
  enterprise_auth?: DomainEnterpriseAuth;
  hosts?: string[];
  /** 禁止访问 */
  is_forbidden?: boolean;
  ports?: number[];
  private_key?: string;
  public_key?: string;
  simple_auth?: DomainSimpleAuth;
  /** 企业认证来源 */
  source_type?: ConstsSourceType;
  ssl_ports?: number[];
  trusted_proxies?: string[];
}

export interface DomainAnalysisConfluenceResp {
  content?: string;
  id?: string;
  title?: string;
}

export interface DomainAppDetailResp {
  id?: string;
  kb_id?: string;
  name?: string;
  recommend_nodes?: DomainRecommendNodeListResp[];
  settings?: DomainAppSettingsResp;
  type?: DomainAppType;
}

export interface DomainAppInfoResp {
  name?: string;
  recommend_nodes?: DomainRecommendNodeListResp[];
  settings?: DomainAppSettingsResp;
}

export interface DomainAppSettings {
  /** AI feedback */
  ai_feedback_settings?: DomainAIFeedbackSettings;
  auto_sitemap?: boolean;
  body_code?: string;
  btns?: unknown[];
  /** Captcha settings */
  captcha_settings?: ConstsCaptchaSettings;
  /** catalog settings */
  catalog_settings?: DomainCatalogSettings;
  copy_setting?: "" | "append" | "disabled";
  /** seo */
  desc?: string;
  dingtalk_bot_client_id?: string;
  dingtalk_bot_client_secret?: string;
  /** DingTalkBot */
  dingtalk_bot_is_enabled?: boolean;
  dingtalk_bot_template_id?: string;
  /** DisCordBot */
  discord_bot_is_enabled?: boolean;
  discord_bot_token?: string;
  /** document feedback */
  document_feedback_is_enabled?: boolean;
  feishu_bot_app_id?: string;
  feishu_bot_app_secret?: string;
  /** FeishuBot */
  feishu_bot_is_enabled?: boolean;
  /** footer settings */
  footer_settings?: DomainFooterSettings;
  /** inject code */
  head_code?: string;
  icon?: string;
  keyword?: string;
  /** OpenAI API Bot settings */
  openai_api_bot_settings?: DomainOpenAIAPIBotSettings;
  recommend_node_ids?: string[];
  recommend_questions?: string[];
  search_placeholder?: string;
  theme_and_style?: DomainThemeAndStyle;
  /** theme */
  theme_mode?: string;
  /** nav */
  title?: string;
  watermark_content?: string;
  watermark_setting?: "" | "hidden" | "visible";
  /** webapp comment settings */
  web_app_comment_settings?: DomainWebAppCommentSettings;
  /** WebAppCustomStyle */
  web_app_custom_style?: DomainWebAppCustomSettings;
  wechat_app_agent_id?: string;
  wechat_app_corpid?: string;
  wechat_app_encodingaeskey?: string;
  /** WechatAppBot */
  wechat_app_is_enabled?: boolean;
  wechat_app_secret?: string;
  wechat_app_token?: string;
  wechat_official_account_app_id?: string;
  wechat_official_account_app_secret?: string;
  wechat_official_account_encodingaeskey?: string;
  /** WechatOfficialAccount */
  wechat_official_account_is_enabled?: boolean;
  wechat_official_account_token?: string;
  wechat_service_corpid?: string;
  wechat_service_encodingaeskey?: string;
  /** WechatServiceBot */
  wechat_service_is_enabled?: boolean;
  wechat_service_secret?: string;
  wechat_service_token?: string;
  /** welcome */
  welcome_str?: string;
  /** Widget bot settings */
  widget_bot_settings?: DomainWidgetBotSettings;
}

export interface DomainAppSettingsResp {
  /** AI feedback */
  ai_feedback_settings?: DomainAIFeedbackSettings;
  auto_sitemap?: boolean;
  body_code?: string;
  btns?: unknown[];
  /** Captcha Settings */
  captcha_settings?: ConstsCaptchaSettings;
  /** catalog settings */
  catalog_settings?: DomainCatalogSettings;
  copy_setting?: ConstsCopySetting;
  /** seo */
  desc?: string;
  dingtalk_bot_client_id?: string;
  dingtalk_bot_client_secret?: string;
  /** DingTalkBot */
  dingtalk_bot_is_enabled?: boolean;
  dingtalk_bot_template_id?: string;
  /** DisCordBot */
  discord_bot_is_enabled?: boolean;
  discord_bot_token?: string;
  /** document feedback */
  document_feedback_is_enabled?: boolean;
  feishu_bot_app_id?: string;
  feishu_bot_app_secret?: string;
  /** FeishuBot */
  feishu_bot_is_enabled?: boolean;
  /** footer settings */
  footer_settings?: DomainFooterSettings;
  /** inject code */
  head_code?: string;
  icon?: string;
  keyword?: string;
  /** OpenAI API settings */
  openai_api_bot_settings?: DomainOpenAIAPIBotSettings;
  recommend_node_ids?: string[];
  recommend_questions?: string[];
  search_placeholder?: string;
  theme_and_style?: DomainThemeAndStyle;
  /** theme */
  theme_mode?: string;
  /** nav */
  title?: string;
  watermark_content?: string;
  watermark_setting?: ConstsWatermarkSetting;
  /** webapp comment settings */
  web_app_comment_settings?: DomainWebAppCommentSettings;
  /** WebAppCustomStyle */
  web_app_custom_style?: DomainWebAppCustomSettings;
  wechat_app_agent_id?: string;
  wechat_app_corpid?: string;
  wechat_app_encodingaeskey?: string;
  /** WechatAppBot */
  wechat_app_is_enabled?: boolean;
  wechat_app_secret?: string;
  wechat_app_token?: string;
  wechat_official_account_app_id?: string;
  wechat_official_account_app_secret?: string;
  wechat_official_account_encodingaeskey?: string;
  /** WechatOfficialAccount */
  wechat_official_account_is_enabled?: boolean;
  wechat_official_account_token?: string;
  wechat_service_corpid?: string;
  wechat_service_encodingaeskey?: string;
  /** WechatServiceBot */
  wechat_service_is_enabled?: boolean;
  wechat_service_secret?: string;
  wechat_service_token?: string;
  /** welcome */
  welcome_str?: string;
  /** WidgetBot */
  widget_bot_settings?: DomainWidgetBotSettings;
}

export interface DomainAuthUserInfo {
  avatar_url?: string;
  email?: string;
  username?: string;
}

export interface DomainBatchMoveReq {
  ids: string[];
  kb_id: string;
  parent_id?: string;
}

export interface DomainBrandGroup {
  links?: DomainLink[];
  name?: string;
}

export interface DomainBrowserCount {
  count?: number;
  name?: string;
}

export interface DomainCatalogSettings {
  /** 1: 展开, 2: 折叠, default: 1 */
  catalog_folder?: number;
  /** 1: 显示, 2: 隐藏, default: 1 */
  catalog_visible?: number;
  /** 200 - 300, default: 260 */
  catalog_width?: number;
}

export interface DomainChatRequest {
  app_type: 1 | 2;
  captcha_token?: string;
  conversation_id?: string;
  message: string;
  nonce?: string;
}

export interface DomainCommentInfo {
  auth_user_id?: number;
  /** avatar */
  avatar?: string;
  email?: string;
  remote_ip?: string;
  user_name?: string;
}

export interface DomainCommentListItem {
  content?: string;
  created_at?: string;
  id?: string;
  info?: DomainCommentInfo;
  /** ip地址 */
  ip_address?: DomainIPAddress;
  node_id?: string;
  /** 文档标题 */
  node_name?: string;
  node_type?: number;
  root_id?: string;
  /** status : -1 reject 0 pending 1 accept */
  status?: DomainCommentStatus;
}

export interface DomainCommentReq {
  captcha_token?: string;
  content: string;
  node_id: string;
  parent_id?: string;
  root_id?: string;
  user_name?: string;
}

export interface DomainConversationDetailResp {
  app_id?: string;
  created_at?: string;
  id?: string;
  ip_address?: DomainIPAddress;
  messages?: DomainConversationMessage[];
  references?: DomainConversationReference[];
  remote_ip?: string;
  subject?: string;
}

export interface DomainConversationDistribution {
  app_id?: string;
  app_type?: DomainAppType;
  count?: number;
}

export interface DomainConversationInfo {
  user_info?: DomainUserInfo;
}

export interface DomainConversationListItem {
  app_name?: string;
  app_type?: DomainAppType;
  created_at?: string;
  /** 用户反馈信息 */
  feedback_info?: DomainFeedBackInfo;
  id?: string;
  /** 用户信息 */
  info?: DomainConversationInfo;
  ip_address?: DomainIPAddress;
  remote_ip?: string;
  subject?: string;
}

export interface DomainConversationMessage {
  app_id?: string;
  completion_tokens?: number;
  content?: string;
  conversation_id?: string;
  created_at?: string;
  id?: string;
  /** feedbackinfo */
  info?: DomainFeedBackInfo;
  kb_id?: string;
  model?: string;
  /** parent_id */
  parent_id?: string;
  prompt_tokens?: number;
  /** model */
  provider?: GithubComChaitinPandaWikiDomainModelProvider;
  /** stats */
  remote_ip?: string;
  role?: SchemaRoleType;
  total_tokens?: number;
}

export interface DomainConversationMessageListItem {
  app_id?: string;
  app_type?: DomainAppType;
  conversation_id?: string;
  /** userInfo */
  conversation_info?: DomainConversationInfo;
  created_at?: string;
  id?: string;
  /** feedbackInfo */
  info?: DomainFeedBackInfo;
  ip_address?: DomainIPAddress;
  question?: string;
  /** stats */
  remote_ip?: string;
}

export interface DomainConversationReference {
  app_id?: string;
  conversation_id?: string;
  name?: string;
  node_id?: string;
  url?: string;
}

export interface DomainCreateKBReleaseReq {
  kb_id: string;
  message: string;
  /** create release after these nodes published */
  node_ids?: string[];
  tag: string;
}

export interface DomainCreateKnowledgeBaseReq {
  hosts?: string[];
  name: string;
  ports?: number[];
  private_key?: string;
  public_key?: string;
  ssl_ports?: number[];
}

export interface DomainCreateModelReq {
  api_header?: string;
  api_key?: string;
  /** for azure openai */
  api_version?: string;
  base_url: string;
  model: string;
  parameters?: DomainModelParam;
  provider: GithubComChaitinPandaWikiDomainModelProvider;
  type: "chat" | "embedding" | "rerank" | "analysis";
}

export interface DomainCreateNodeReq {
  content?: string;
  emoji?: string;
  kb_id: string;
  name: string;
  parent_id?: string;
  position?: number;
  type: 1 | 2;
}

export interface DomainEnterpriseAuth {
  enabled?: boolean;
}

export interface DomainEpubResp {
  content?: string;
  title?: string;
}

export interface DomainFeedBackInfo {
  feedback_content?: string;
  feedback_type?: string;
  score?: DomainScoreType;
}

export interface DomainFeedbackRequest {
  conversation_id?: string;
  /**
   * 限制内容长度
   * @maxLength 200
   */
  feedback_content?: string;
  message_id: string;
  /** -1 踩 ,0 1 赞成 */
  score?: DomainScoreType;
  /** 内容不准确，没有帮助，....... */
  type?: string;
}

export interface DomainFooterSettings {
  brand_desc?: string;
  brand_groups?: DomainBrandGroup[];
  brand_logo?: string;
  brand_name?: string;
  corp_name?: string;
  footer_style?: string;
  icp?: string;
}

export interface DomainGetDocsReq {
  integration?: string;
  kb_id: string;
  pages?: DomainPageInfo[];
}

export interface DomainGetDocxReq {
  app_id?: string;
  app_secret?: string;
  kb_id: string;
  sources: DomainSource[];
  user_access_token?: string;
}

export interface DomainGetDocxResp {
  content?: string;
  title?: string;
}

export interface DomainGetKBReleaseListResp {
  data?: DomainKBReleaseListItemResp[];
  total?: number;
}

export interface DomainGetProviderModelListReq {
  api_header?: string;
  api_key?: string;
  base_url: string;
  provider: string;
  type: "chat" | "embedding" | "rerank" | "analysis";
}

export interface DomainGetProviderModelListResp {
  models?: DomainProviderModelListItem[];
}

export interface DomainGetSpaceListReq {
  app_id?: string;
  app_secret?: string;
  user_access_token?: string;
}

export interface DomainGetSpaceListResp {
  name?: string;
  space_id?: string;
}

export interface DomainHotBrowser {
  browser?: DomainBrowserCount[];
  os?: DomainBrowserCount[];
}

export interface DomainHotPage {
  count?: number;
  node_id?: string;
  node_name?: string;
  scene?: DomainStatPageScene;
}

export interface DomainHotRefererHost {
  count?: number;
  referer_host?: string;
}

export interface DomainIPAddress {
  city?: string;
  country?: string;
  ip?: string;
  province?: string;
}

export interface DomainInstantCountResp {
  count?: number;
  time?: string;
}

export interface DomainInstantPageResp {
  created_at?: string;
  info?: DomainAuthUserInfo;
  ip?: string;
  ip_address?: DomainIPAddress;
  node_id?: string;
  node_name?: string;
  scene?: DomainStatPageScene;
  user_id?: number;
}

export interface DomainKBReleaseListItemResp {
  created_at?: string;
  id?: string;
  kb_id?: string;
  message?: string;
  tag?: string;
}

export interface DomainKnowledgeBaseDetail {
  access_settings?: DomainAccessSettings;
  created_at?: string;
  dataset_id?: string;
  id?: string;
  name?: string;
  /** 用户对知识库的权限 */
  perm?: ConstsUserKBPermission;
  updated_at?: string;
}

export interface DomainKnowledgeBaseListItem {
  access_settings?: DomainAccessSettings;
  created_at?: string;
  dataset_id?: string;
  id?: string;
  name?: string;
  updated_at?: string;
}

export interface DomainLink {
  name?: string;
  url?: string;
}

export interface DomainModelParam {
  context_window?: number;
  max_tokens?: number;
  r1_enabled?: boolean;
  support_computer_use?: boolean;
  support_images?: boolean;
  support_prompt_cache?: boolean;
}

export interface DomainMoveNodeReq {
  id: string;
  kb_id: string;
  next_id?: string;
  parent_id?: string;
  prev_id?: string;
}

export interface DomainNodeActionReq {
  action: "delete";
  ids: string[];
  kb_id: string;
}

export interface DomainNodeGroupDetail {
  auth_group_id?: number;
  auth_ids?: number[];
  kb_id?: string;
  name?: string;
  node_id?: string;
  perm?: ConstsNodePermName;
}

export interface DomainNodeListItemResp {
  created_at?: string;
  creator?: string;
  creator_id?: string;
  editor?: string;
  editor_id?: string;
  emoji?: string;
  id?: string;
  name?: string;
  parent_id?: string;
  permissions?: DomainNodePermissions;
  position?: number;
  status?: DomainNodeStatus;
  summary?: string;
  type?: DomainNodeType;
  updated_at?: string;
}

export interface DomainNodeMeta {
  /** normal / wide / full */
  doc_width?: string;
  emoji?: string;
  summary?: string;
}

export interface DomainNodePermissions {
  /** 可被问答 */
  answerable?: ConstsNodeAccessPerm;
  /** 导航内可见 */
  visible?: ConstsNodeAccessPerm;
  /** 可被访问 */
  visitable?: ConstsNodeAccessPerm;
}

export interface DomainNodeSummaryReq {
  ids: string[];
  kb_id: string;
}

export interface DomainNotnionGetListReq {
  cation_title?: string;
  integration?: string;
}

export interface DomainObjectUploadResp {
  key?: string;
}

export interface DomainOpenAIAPIBotSettings {
  is_enabled?: boolean;
  secret_key?: string;
}

export interface DomainOpenAIChoice {
  /** for streaming */
  delta?: DomainOpenAIMessage;
  finish_reason?: string;
  index?: number;
  message?: DomainOpenAIMessage;
}

export interface DomainOpenAICompletionsRequest {
  frequency_penalty?: number;
  max_tokens?: number;
  messages: DomainOpenAIMessage[];
  model: string;
  presence_penalty?: number;
  response_format?: DomainOpenAIResponseFormat;
  stop?: string[];
  stream?: boolean;
  temperature?: number;
  tool_choice?: DomainOpenAIToolChoice;
  tools?: DomainOpenAITool[];
  top_p?: number;
  user?: string;
}

export interface DomainOpenAICompletionsResponse {
  choices?: DomainOpenAIChoice[];
  created?: number;
  id?: string;
  model?: string;
  object?: string;
  usage?: DomainOpenAIUsage;
}

export interface DomainOpenAIError {
  code?: string;
  message?: string;
  param?: string;
  type?: string;
}

export interface DomainOpenAIErrorResponse {
  error?: DomainOpenAIError;
}

export interface DomainOpenAIFunction {
  description?: string;
  name: string;
  parameters?: Record<string, any>;
}

export interface DomainOpenAIFunctionCall {
  arguments: string;
  name: string;
}

export interface DomainOpenAIFunctionChoice {
  name: string;
}

export interface DomainOpenAIMessage {
  content?: string;
  name?: string;
  role: string;
  tool_call_id?: string;
  tool_calls?: DomainOpenAIToolCall[];
}

export interface DomainOpenAIResponseFormat {
  type: string;
}

export interface DomainOpenAITool {
  function?: DomainOpenAIFunction;
  type: string;
}

export interface DomainOpenAIToolCall {
  function: DomainOpenAIFunctionCall;
  id: string;
  type: string;
}

export interface DomainOpenAIToolChoice {
  function?: DomainOpenAIFunctionChoice;
  type?: string;
}

export interface DomainOpenAIUsage {
  completion_tokens?: number;
  prompt_tokens?: number;
  total_tokens?: number;
}

export interface DomainPWResponse {
  code?: number;
  data?: unknown;
  message?: string;
  success?: boolean;
}

export interface DomainPage {
  content?: string;
  id?: string;
  parent_id?: string;
  title?: string;
}

export interface DomainPageInfo {
  id?: string;
  title?: string;
}

export interface DomainPaginatedResultArrayDomainConversationMessageListItem {
  data?: DomainConversationMessageListItem[];
  total?: number;
}

export interface DomainParseURLItem {
  desc?: string;
  published?: string;
  title?: string;
  url?: string;
}

export interface DomainParseURLReq {
  url: string;
}

export interface DomainParseURLResp {
  items?: DomainParseURLItem[];
}

export interface DomainProviderModelListItem {
  model?: string;
}

export interface DomainRecommendNodeListResp {
  emoji?: string;
  id?: string;
  name?: string;
  parent_id?: string;
  permissions?: DomainNodePermissions;
  position?: number;
  recommend_nodes?: DomainRecommendNodeListResp[];
  summary?: string;
  type?: DomainNodeType;
}

export interface DomainResponse {
  data?: unknown;
  message?: string;
  success?: boolean;
}

export interface DomainScrapeReq {
  kb_id: string;
  url?: string;
}

export interface DomainScrapeResp {
  content?: string;
  title?: string;
}

export interface DomainSearchDocxReq {
  app_id?: string;
  app_secret?: string;
  user_access_token?: string;
}

export interface DomainSearchDocxResp {
  name?: string;
  obj_token?: string;
  obj_type?: number;
  url?: string;
}

export interface DomainSearchWikiReq {
  app_id?: string;
  app_secret?: string;
  query?: string;
  space_id?: string;
  user_access_token?: string;
}

export interface DomainSearchWikiResp {
  obj_token?: string;
  obj_type?: number;
  space_id?: string;
  title?: string;
  url?: string;
}

export interface DomainShareCommentListItem {
  content?: string;
  created_at?: string;
  id?: string;
  info?: DomainCommentInfo;
  /** ip地址 */
  ip_address?: DomainIPAddress;
  kb_id?: string;
  node_id?: string;
  parent_id?: string;
  root_id?: string;
}

export interface DomainShareConversationDetailResp {
  created_at?: string;
  id?: string;
  messages?: DomainShareConversationMessage[];
  subject?: string;
}

export interface DomainShareConversationMessage {
  content?: string;
  created_at?: string;
  role?: SchemaRoleType;
}

export interface DomainSiYuanResp {
  content?: string;
  id?: number;
  title?: string;
}

export interface DomainSimpleAuth {
  enabled?: boolean;
  password?: string;
}

export interface DomainSocialMediaAccount {
  channel?: string;
  icon?: string;
  link?: string;
  phone?: string;
  text?: string;
}

export interface DomainSource {
  obj_token?: string;
  obj_type?: number;
  url?: string;
}

export interface DomainStatPageReq {
  node_id?: string;
  scene: 1 | 2 | 3 | 4;
}

export interface DomainTextReq {
  /** action: improve, summary, extend, shorten, etc. */
  action?: string;
  text: string;
}

export interface DomainThemeAndStyle {
  bg_image?: string;
}

export interface DomainUpdateAppReq {
  kb_id?: string;
  name?: string;
  settings?: DomainAppSettings;
}

export interface DomainUpdateKnowledgeBaseReq {
  access_settings?: DomainAccessSettings;
  id: string;
  name?: string;
}

export interface DomainUpdateModelReq {
  api_header?: string;
  api_key?: string;
  /** for azure openai */
  api_version?: string;
  base_url: string;
  id: string;
  is_active?: boolean;
  model: string;
  parameters?: DomainModelParam;
  provider: GithubComChaitinPandaWikiDomainModelProvider;
  type: "chat" | "embedding" | "rerank" | "analysis";
}

export interface DomainUpdateNodeReq {
  content?: string;
  doc_width?: string;
  emoji?: string;
  id: string;
  kb_id: string;
  name?: string;
  position?: number;
  summary?: string;
}

export interface DomainUserInfo {
  auth_user_id?: number;
  /** avatar */
  avatar?: string;
  email?: string;
  from?: DomainMessageFrom;
  name?: string;
  real_name?: string;
  user_id?: string;
}

export interface DomainWebAppCommentSettings {
  is_enable?: boolean;
  moderation_enable?: boolean;
}

export interface DomainWebAppCustomSettings {
  allow_theme_switching?: boolean;
  footer_show_intro?: boolean;
  header_search_placeholder?: string;
  show_brand_info?: boolean;
  social_media_accounts?: DomainSocialMediaAccount[];
}

export interface DomainWidgetBotSettings {
  btn_logo?: string;
  btn_text?: string;
  is_open?: boolean;
  theme_mode?: string;
}

export interface DomainWikiJSResp {
  content?: string;
  id?: number;
  title?: string;
}

export interface DomainYuqueResp {
  content?: string;
  title?: string;
}

export interface GithubComChaitinPandaWikiDomainCheckModelReq {
  api_header?: string;
  api_key?: string;
  /** for azure openai */
  api_version?: string;
  base_url: string;
  model: string;
  provider: GithubComChaitinPandaWikiDomainModelProvider;
  type: "chat" | "embedding" | "rerank" | "analysis";
}

export interface GithubComChaitinPandaWikiDomainCheckModelResp {
  content?: string;
  error?: string;
}

export interface GithubComChaitinPandaWikiDomainModelListItem {
  api_header?: string;
  api_key?: string;
  /** for azure openai */
  api_version?: string;
  base_url?: string;
  completion_tokens?: number;
  id?: string;
  is_active?: boolean;
  model?: string;
  parameters?: DomainModelParam;
  prompt_tokens?: number;
  provider?: GithubComChaitinPandaWikiDomainModelProvider;
  total_tokens?: number;
  type?: DomainModelType;
}

export interface GocapChallengeData {
  challenge?: GocapChallengeItem;
  /** 过期时间,毫秒级时间戳 */
  expires?: number;
  /** 质询令牌 */
  token?: string;
}

export interface GocapChallengeItem {
  /** 质询数量 */
  c?: number;
  /** 质询难度 */
  d?: number;
  /** 质询大小 */
  s?: number;
}

export interface GocapVerificationResult {
  /** 过期时间,毫秒级时间戳 */
  expires?: number;
  message?: string;
  success?: boolean;
  /** 验证令牌 */
  token?: string;
}

export interface ShareShareCommentLists {
  data?: DomainShareCommentListItem[];
  total?: number;
}

export interface V1AuthGetResp {
  auth_type?: ConstsAuthType;
  source_type?: ConstsSourceType;
}

export interface V1AuthLoginSimpleReq {
  password: string;
}

export interface V1CommentLists {
  data?: DomainCommentListItem[];
  total?: number;
}

export interface V1ConversationListItems {
  data?: DomainConversationListItem[];
  total?: number;
}

export interface V1CreateUserReq {
  account: string;
  /** @minLength 8 */
  password: string;
  role: "admin" | "user";
}

export interface V1CreateUserResp {
  id?: string;
}

export interface V1DeleteUserReq {
  user_id: string;
}

export interface V1KBUserInviteReq {
  kb_id: string;
  perm: "full_control" | "doc_manage" | "data_operate";
  user_id: string;
}

export interface V1KBUserListItemResp {
  account?: string;
  id?: string;
  perms?: ConstsUserKBPermission;
  role?: ConstsUserRole;
}

export interface V1KBUserUpdateReq {
  kb_id: string;
  perm: "full_control" | "doc_manage" | "data_operate";
  user_id: string;
}

export interface V1LoginReq {
  account: string;
  password: string;
}

export interface V1LoginResp {
  token?: string;
}

export interface V1NodeDetailResp {
  content?: string;
  created_at?: string;
  id?: string;
  kb_id?: string;
  meta?: DomainNodeMeta;
  name?: string;
  parent_id?: string;
  permissions?: DomainNodePermissions;
  status?: DomainNodeStatus;
  type?: DomainNodeType;
  updated_at?: string;
}

export interface V1NodePermissionEditReq {
  /** 可被问答 */
  answerable_groups?: number[];
  ids: string[];
  kb_id: string;
  permissions?: DomainNodePermissions;
  /** 导航内可见 */
  visible_groups?: number[];
  /** 可被访问 */
  visitable_groups?: number[];
}

export type V1NodePermissionEditResp = Record<string, any>;

export interface V1NodePermissionResp {
  /** 可被问答 */
  answerable_groups?: DomainNodeGroupDetail[];
  id?: string;
  permissions?: DomainNodePermissions;
  /** 导航内可见 */
  visible_groups?: DomainNodeGroupDetail[];
  /** 可被访问 */
  visitable_groups?: DomainNodeGroupDetail[];
}

export interface V1RecommendNodeListItem {
  emoji?: string;
  id?: string;
  name?: string;
  parent_id?: string;
  position?: number;
  recommend_nodes?: DomainRecommendNodeListResp[];
  summary?: string;
  type?: DomainNodeType;
}

export interface V1ResetPasswordReq {
  id: string;
  /** @minLength 8 */
  new_password: string;
}

export interface V1StatCountResp {
  conversation_count?: number;
  ip_count?: number;
  page_visit_count?: number;
  session_count?: number;
}

export interface V1UserInfoResp {
  account?: string;
  created_at?: string;
  id?: string;
  last_access?: string;
  role?: ConstsUserRole;
}

export interface V1UserListItemResp {
  account?: string;
  created_at?: string;
  id?: string;
  last_access?: string;
  role?: ConstsUserRole;
}

export interface V1UserListResp {
  users?: V1UserListItemResp[];
}

export interface PutApiV1AppParams {
  /** id */
  id: string;
}

export interface DeleteApiV1AppParams {
  /** kb id */
  kb_id: string;
  /** app id */
  id: string;
}

export interface GetApiV1AppDetailParams {
  /** kb id */
  kb_id: string;
  /** app type */
  type: string;
}

export interface GetApiV1CommentParams {
  kb_id: string;
  /** @min 1 */
  page: number;
  /** @min 1 */
  per_page: number;
  /** @format int32 */
  status?: -1 | 0 | 1;
}

export interface DeleteApiV1CommentListParams {
  ids?: string[];
}

export interface GetApiV1ConversationParams {
  app_id?: string;
  kb_id: string;
  /** @min 1 */
  page: number;
  /** @min 1 */
  per_page: number;
  remote_ip?: string;
  subject?: string;
}

export interface GetApiV1ConversationDetailParams {
  id: string;
  kb_id: string;
}

export interface GetApiV1ConversationMessageDetailParams {
  id: string;
  kb_id: string;
}

export interface GetApiV1ConversationMessageListParams {
  kb_id: string;
  /** @min 1 */
  page: number;
  /** @min 1 */
  per_page: number;
}

export interface PostApiV1CrawlerConfluenceAnalysisExportFilePayload {
  /**
   * file
   * @format binary
   */
  file: File;
  /** kb_id */
  kb_id: string;
}

export interface PostApiV1CrawlerEpubConvertPayload {
  /**
   * file
   * @format binary
   */
  file: File;
  /** kb_id */
  kb_id: string;
}

export interface PostApiV1CrawlerSiyuanAnalysisExportFilePayload {
  /**
   * file
   * @format binary
   */
  file: File;
  /** kb_id */
  kb_id: string;
}

export interface PostApiV1CrawlerWikijsAnalysisExportFilePayload {
  /**
   * file
   * @format binary
   */
  file: File;
  /** kb_id */
  kb_id: string;
}

export interface PostApiV1CrawlerYuqueAnalysisExportFilePayload {
  /**
   * file
   * @format binary
   */
  file: File;
  /** kb_id */
  kb_id: string;
}

export interface PostApiV1FileUploadPayload {
  /**
   * File
   * @format binary
   */
  file: File;
  /** Knowledge Base ID */
  kb_id?: string;
}

export interface GetApiV1KnowledgeBaseDetailParams {
  /** Knowledge Base ID */
  id: string;
}

export interface DeleteApiV1KnowledgeBaseDetailParams {
  /** Knowledge Base ID */
  id: string;
}

export interface GetApiV1KnowledgeBaseReleaseListParams {
  /** Knowledge Base ID */
  kb_id: string;
}

export interface DeleteApiV1KnowledgeBaseUserDeleteParams {
  kb_id: string;
  user_id: string;
}

export interface GetApiV1KnowledgeBaseUserListParams {
  /** Knowledge Base ID */
  kb_id: string;
}

export interface GetApiV1NodeDetailParams {
  format?: string;
  id: string;
  kb_id: string;
}

export interface GetApiV1NodeListParams {
  kb_id: string;
  search?: string;
}

export interface GetApiV1NodePermissionParams {
  id: string;
  kb_id: string;
}

export interface GetApiV1NodeRecommendNodesParams {
  kb_id: string;
  node_ids: string[];
}

export interface GetApiV1StatBrowsersParams {
  day?: 1 | 7 | 30 | 90;
  kb_id: string;
}

export interface GetApiV1StatConversationDistributionParams {
  day?: 1 | 7 | 30 | 90;
  kb_id: string;
}

export interface GetApiV1StatCountParams {
  day?: 1 | 7 | 30 | 90;
  kb_id: string;
}

export interface GetApiV1StatGeoCountParams {
  day?: 1 | 7 | 30 | 90;
  kb_id: string;
}

export interface GetApiV1StatHotPagesParams {
  day?: 1 | 7 | 30 | 90;
  kb_id: string;
}

export interface GetApiV1StatInstantCountParams {
  kb_id: string;
}

export interface GetApiV1StatInstantPagesParams {
  kb_id: string;
}

export interface GetApiV1StatRefererHostsParams {
  day?: 1 | 7 | 30 | 90;
  kb_id: string;
}

export interface GetShareV1AppWechatServiceAnswerParams {
  /** conversation id */
  id: string;
}

export interface PostShareV1ChatMessageParams {
  /** app type */
  app_type: string;
}

export interface PostShareV1ChatWidgetParams {
  /** app type */
  app_type: string;
}

export interface GetShareV1CommentListParams {
  /** nodeID */
  id: string;
}

export interface GetShareV1ConversationDetailParams {
  /** conversation id */
  id: string;
}

export interface GetShareV1NodeDetailParams {
  /** node id */
  id: string;
  /** format */
  format: string;
}
