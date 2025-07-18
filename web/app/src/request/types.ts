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
export enum DomainNodeVisibility {
  NodeVisibilityPrivate = 1,
  NodeVisibilityPublic = 2,
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
}

export enum DomainModelProvider {
  ModelProviderBrandOpenAI = "OpenAI",
  ModelProviderBrandOllama = "Ollama",
  ModelProviderBrandDeepSeek = "DeepSeek",
  ModelProviderBrandMoonshot = "Moonshot",
  ModelProviderBrandSiliconFlow = "SiliconFlow",
  ModelProviderBrandAzureOpenAI = "AzureOpenAI",
  ModelProviderBrandBaiZhiCloud = "BaiZhiCloud",
  ModelProviderBrandHunyuan = "Hunyuan",
  ModelProviderBrandBaiLian = "BaiLian",
  ModelProviderBrandVolcengine = "Volcengine",
  ModelProviderBrandGemini = "Gemini",
  ModelProviderBrandOther = "Other",
}

export enum DomainMessageFrom {
  MessageFromGroup = 1,
  MessageFromPrivate = 2,
}

export enum DomainFeedbackType {
  ContentErr = 1,
  NoHelp = 2,
  Other = 3,
}

/** @format int32 */
export enum DomainCommentStatus {
  CommentStatusReject = -1,
  CommentStatusPending = 0,
  CommentStatusAccepted = 1,
}

export enum DomainAuthType {
  AuthTypeNull = "",
  AuthTypeSimple = "simple",
  AuthTypeEnterprise = "enterprise",
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
}

export interface DomainAccessSettings {
  base_url?: string;
  enterprise_auth?: DomainEnterpriseAuth;
  hosts?: string[];
  ports?: number[];
  private_key?: string;
  public_key?: string;
  simple_auth?: DomainSimpleAuth;
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

export interface DomainAppSettings {
  auto_sitemap?: boolean;
  body_code?: string;
  btns?: unknown[];
  /** catalog settings */
  catalog_settings?: DomainCatalogSettings;
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
  recommend_node_ids?: string[];
  recommend_questions?: string[];
  search_placeholder?: string;
  theme_and_style?: DomainThemeAndStyle;
  /** theme */
  theme_mode?: string;
  /** nav */
  title?: string;
  /** webapp comment settings */
  web_app_comment_settings?: DomainWebAppCommentSettings;
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
  auto_sitemap?: boolean;
  body_code?: string;
  btns?: unknown[];
  /** catalog settings */
  catalog_settings?: DomainCatalogSettings;
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
  recommend_node_ids?: string[];
  recommend_questions?: string[];
  search_placeholder?: string;
  theme_and_style?: DomainThemeAndStyle;
  /** theme */
  theme_mode?: string;
  /** nav */
  title?: string;
  /** webapp comment settings */
  web_app_comment_settings?: DomainWebAppCommentSettings;
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

export interface DomainAuthGetResp {
  auth_type?: DomainAuthType;
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
  conversation_id?: string;
  message: string;
  nonce?: string;
}

export interface DomainCheckModelReq {
  api_header?: string;
  api_key?: string;
  /** for azure openai */
  api_version?: string;
  base_url: string;
  model: string;
  provider:
    | "OpenAI"
    | "Ollama"
    | "DeepSeek"
    | "SiliconFlow"
    | "Moonshot"
    | "Other"
    | "AzureOpenAI"
    | "BaiZhiCloud"
    | "Hunyuan"
    | "BaiLian"
    | "Volcengine"
    | "Gemini";
  type: "chat" | "embedding" | "rerank";
}

export interface DomainCheckModelResp {
  content?: string;
  error?: string;
}

export interface DomainCommentInfo {
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
  provider?: DomainModelProvider;
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
  provider:
    | "OpenAI"
    | "Ollama"
    | "DeepSeek"
    | "SiliconFlow"
    | "Moonshot"
    | "Other"
    | "AzureOpenAI"
    | "BaiZhiCloud"
    | "Hunyuan"
    | "BaiLian"
    | "Volcengine"
    | "Gemini";
  type: "chat" | "embedding" | "rerank";
}

export interface DomainCreateNodeReq {
  content?: string;
  emoji?: string;
  kb_id: string;
  name: string;
  parent_id?: string;
  type: 1 | 2;
  visibility?: DomainNodeVisibility;
}

export interface DomainCreateUserReq {
  account: string;
  /** @minLength 8 */
  password: string;
}

export interface DomainDeleteUserReq {
  user_id: string;
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
  feedback_type?: DomainFeedbackType;
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
  /** 1 内容不准确，2 没有帮助，3 其他 */
  type?: DomainFeedbackType;
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

export interface DomainGetNodeReleaseDetailResp {
  content?: string;
  meta?: DomainNodeMeta;
  name?: string;
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

export interface DomainIPAddress {
  city?: string;
  country?: string;
  ip?: string;
  province?: string;
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

export interface DomainLoginReq {
  account: string;
  password: string;
}

export interface DomainLoginResp {
  token?: string;
}

export interface DomainModelDetailResp {
  api_header?: string;
  api_key?: string;
  /** for azure openai */
  api_version?: string;
  base_url?: string;
  completion_tokens?: number;
  created_at?: string;
  id?: string;
  model?: string;
  prompt_tokens?: number;
  provider?: DomainModelProvider;
  total_tokens?: number;
  type?: DomainModelType;
  updated_at?: string;
}

export interface DomainModelListItem {
  api_header?: string;
  api_key?: string;
  /** for azure openai */
  api_version?: string;
  base_url?: string;
  completion_tokens?: number;
  id?: string;
  model?: string;
  prompt_tokens?: number;
  provider?: DomainModelProvider;
  total_tokens?: number;
  type?: DomainModelType;
}

export interface DomainMoveNodeReq {
  id: string;
  next_id?: string;
  parent_id?: string;
  prev_id?: string;
}

export interface DomainNodeActionReq {
  action: "delete" | "private" | "public";
  ids: string[];
  kb_id: string;
}

export interface DomainNodeDetailResp {
  content?: string;
  created_at?: string;
  id?: string;
  kb_id?: string;
  meta?: DomainNodeMeta;
  name?: string;
  parent_id?: string;
  status?: DomainNodeStatus;
  type?: DomainNodeType;
  updated_at?: string;
  visibility?: DomainNodeVisibility;
}

export interface DomainNodeListItemResp {
  created_at?: string;
  emoji?: string;
  id?: string;
  name?: string;
  parent_id?: string;
  position?: number;
  status?: DomainNodeStatus;
  summary?: string;
  type?: DomainNodeType;
  updated_at?: string;
  visibility?: DomainNodeVisibility;
}

export interface DomainNodeMeta {
  emoji?: string;
  summary?: string;
}

export interface DomainNodeReleaseListItem {
  id?: string;
  meta?: DomainNodeMeta;
  name?: string;
  node_id?: string;
  /** release */
  release_id?: string;
  release_message?: string;
  release_name?: string;
  updated_at?: string;
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
  position?: number;
  recommend_nodes?: DomainRecommendNodeListResp[];
  summary?: string;
  type?: DomainNodeType;
}

export interface DomainResetPasswordReq {
  id: string;
  /** @minLength 8 */
  new_password: string;
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

export interface DomainSimpleAuth {
  enabled?: boolean;
  password?: string;
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
  model: string;
  provider:
    | "OpenAI"
    | "Ollama"
    | "DeepSeek"
    | "SiliconFlow"
    | "Moonshot"
    | "Other"
    | "AzureOpenAI"
    | "BaiZhiCloud"
    | "Hunyuan"
    | "BaiLian"
    | "Volcengine"
    | "Gemini";
  type: "chat" | "embedding" | "rerank";
}

export interface DomainUpdateNodeReq {
  content?: string;
  emoji?: string;
  id: string;
  kb_id: string;
  name?: string;
  summary?: string;
  visibility?: DomainNodeVisibility;
}

export interface DomainUserInfo {
  /** avatar */
  avatar?: string;
  email?: string;
  from?: DomainMessageFrom;
  name?: string;
  real_name?: string;
  user_id?: string;
}

export interface DomainUserInfoResp {
  account?: string;
  created_at?: string;
  id?: string;
  last_access?: string;
}

export interface DomainUserListItemResp {
  account?: string;
  id?: string;
  last_access?: string;
}

export interface DomainWebAppCommentSettings {
  is_enable?: boolean;
  moderation_enable?: boolean;
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

export interface ShareShareCommentLists {
  data?: DomainShareCommentListItem[];
  total?: number;
}

export interface V1CommentLists {
  data?: DomainCommentListItem[];
  total?: number;
}

export interface V1ConversationListItems {
  data?: DomainConversationListItem[];
  total?: number;
}

export interface DeleteApiV1AppParams {
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
  /** conversation id */
  id: string;
}

export interface GetApiV1ConversationMessageDetailParams {
  /** message id */
  id: string;
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

export interface PostApiV1CrawlerWikijsAnalysisExportFilePayload {
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

export interface GetApiV1ModelDetailParams {
  /** model id */
  id: string;
}

export interface GetApiV1ModelProviderSupportedParams {
  api_header?: string;
  api_key?: string;
  base_url: string;
  provider:
    | "SiliconFlow"
    | "OpenAI"
    | "Ollama"
    | "DeepSeek"
    | "Moonshot"
    | "AzureOpenAI"
    | "BaiZhiCloud"
    | "Hunyuan"
    | "BaiLian"
    | "Volcengine"
    | "Gemini";
  type: "chat" | "embedding" | "rerank";
}

export interface GetApiV1NodeDetailParams {
  /** ID */
  id: string;
}

export interface GetApiV1NodeListParams {
  kb_id: string;
  search?: string;
}

export interface GetApiV1NodeRecommendNodesParams {
  kb_id: string;
  node_ids: string[];
}

export interface GetApiV1NodeReleaseDetailParams {
  id: string;
}

export interface GetApiV1NodeReleaseListParams {
  kb_id: string;
  node_id: string;
}

export interface GetApiV1StatBrowsersParams {
  /** kb_id */
  kb_id: string;
}

export interface GetApiV1StatConversationDistributionParams {
  /** kb_id */
  kb_id: string;
}

export interface GetApiV1StatCountParams {
  /** kb_id */
  kb_id: string;
}

export interface GetApiV1StatGeoCountParams {
  /** kb_id */
  kb_id: string;
}

export interface GetApiV1StatHotPagesParams {
  /** kb_id */
  kb_id: string;
}

export interface GetApiV1StatInstantCountParams {
  /** kb_id */
  kb_id: string;
}

export interface GetApiV1StatInstantPagesParams {
  /** kb_id */
  kb_id: string;
}

export interface GetApiV1StatRefererHostsParams {
  /** kb_id */
  kb_id: string;
}

export interface GetShareV1AuthGetParams {
  x_kb_id?: string;
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

export interface GetShareV1NodeDetailParams {
  /** node id */
  id: string;
}
