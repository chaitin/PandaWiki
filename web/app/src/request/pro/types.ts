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

/** @format int32 */
export enum DomainCommentStatus {
  CommentStatusReject = -1,
  CommentStatusPending = 0,
  CommentStatusAccepted = 1,
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

/** @format int32 */
export enum ConstsLicenseEdition {
  /** 开源版 */
  LicenseEditionFree = 0,
  /** 联创版 */
  LicenseEditionContributor = 1,
  /** 企业版 */
  LicenseEditionEnterprise = 2,
}

export interface DomainCommentModerateListReq {
  ids: string[];
  status: DomainCommentStatus;
}

export interface DomainCreatePromptReq {
  content?: string;
  kb_id: string;
}

export interface DomainDeleteDocumentFeedbackReq {
  /** @minItems 1 */
  ids: string[];
}

export interface DomainDocumentFeedbackInfo {
  /** user */
  auth_user_id?: number;
  /** avatar */
  avatar?: string;
  email?: string;
  /** ip */
  remote_ip?: string;
  screen_shot?: string;
  user_name?: string;
}

export interface DomainDocumentFeedbackListItem {
  content?: string;
  correction_suggestion?: string;
  created_at?: string;
  id?: string;
  info?: DomainDocumentFeedbackInfo;
  ip_address?: DomainIPAddress;
  kb_id?: string;
  node_id?: string;
  node_name?: string;
  user_id?: string;
}

export interface DomainGetNodeReleaseDetailResp {
  content?: string;
  meta?: DomainNodeMeta;
  name?: string;
}

export interface DomainIPAddress {
  city?: string;
  country?: string;
  ip?: string;
  province?: string;
}

export interface DomainLicenseResp {
  edition?: ConstsLicenseEdition;
  expired_at?: number;
  started_at?: number;
  state?: number;
}

export interface DomainNodeMeta {
  /** normal / wide / full */
  doc_width?: string;
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

export interface DomainPWResponse {
  code?: number;
  data?: unknown;
  message?: string;
  success?: boolean;
}

export interface DomainPrompt {
  content?: string;
}

export interface DomainResponse {
  data?: unknown;
  message?: string;
  success?: boolean;
}

export interface GithubComChaitinPandaWikiProApiAuthV1AuthGetResp {
  agent_id?: string;
  authorize_url?: string;
  auths?: GithubComChaitinPandaWikiProApiAuthV1AuthItem[];
  avatar_field?: string;
  /** 绑定DN */
  bind_dn?: string;
  /** 绑定密码 */
  bind_password?: string;
  cas_url?: string;
  /** CAS特定配置 */
  cas_version?: string;
  client_id?: string;
  client_secret?: string;
  email_field?: string;
  id_field?: string;
  /** LDAP特定配置 */
  ldap_server_url?: string;
  name_field?: string;
  scopes?: string[];
  source_type?: ConstsSourceType;
  token_url?: string;
  /** 用户基础DN */
  user_base_dn?: string;
  /** 用户查询过滤器 */
  user_filter?: string;
  user_info_url?: string;
}

export interface GithubComChaitinPandaWikiProApiAuthV1AuthGroupCreateReq {
  ids: number[];
  kb_id: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  name: string;
  parent_id?: number;
  position?: number;
}

export type GithubComChaitinPandaWikiProApiAuthV1AuthGroupCreateResp = Record<
  string,
  any
>;

export interface GithubComChaitinPandaWikiProApiAuthV1AuthGroupDetailResp {
  auth_ids?: number[];
  auths?: GithubComChaitinPandaWikiProApiAuthV1AuthItem[];
  children?: GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem[];
  created_at?: string;
  id?: number;
  name?: string;
  parent?: GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem;
  parent_id?: number;
  position?: number;
}

export interface GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem {
  auth_ids?: number[];
  count?: number;
  created_at?: string;
  id?: number;
  name?: string;
  parent_id?: number;
  position?: number;
}

export interface GithubComChaitinPandaWikiProApiAuthV1AuthGroupListResp {
  list?: GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem[];
  total?: number;
}

export interface GithubComChaitinPandaWikiProApiAuthV1AuthGroupMoveReq {
  id: number;
  kb_id: string;
  next_id?: number;
  parent_id?: number;
  prev_id?: number;
}

export interface GithubComChaitinPandaWikiProApiAuthV1AuthGroupTreeItem {
  auth_ids?: number[];
  children?: GithubComChaitinPandaWikiProApiAuthV1AuthGroupTreeItem[];
  count?: number;
  created_at?: string;
  id?: number;
  level?: number;
  name?: string;
  parent_id?: number;
  position?: number;
}

export interface GithubComChaitinPandaWikiProApiAuthV1AuthGroupTreeResp {
  list?: GithubComChaitinPandaWikiProApiAuthV1AuthGroupTreeItem[];
}

export interface GithubComChaitinPandaWikiProApiAuthV1AuthGroupUpdateReq {
  auth_ids?: number[];
  id: number;
  kb_id: string;
  name?: string;
  parent_id?: number;
  position?: number;
}

export interface GithubComChaitinPandaWikiProApiAuthV1AuthItem {
  avatar_url?: string;
  created_at?: string;
  id?: number;
  ip?: string;
  last_login_time?: string;
  source_type?: ConstsSourceType;
  username?: string;
}

export interface GithubComChaitinPandaWikiProApiAuthV1AuthSetReq {
  agent_id?: string;
  authorize_url?: string;
  avatar_field?: string;
  /** 绑定DN */
  bind_dn?: string;
  /** 绑定密码 */
  bind_password?: string;
  cas_url?: string;
  /** CAS特定配置 */
  cas_version?: string;
  client_id?: string;
  client_secret?: string;
  email_field?: string;
  id_field?: string;
  kb_id?: string;
  /** LDAP特定配置 */
  ldap_server_url?: string;
  name_field?: string;
  scopes?: string[];
  source_type?: ConstsSourceType;
  token_url?: string;
  /** 用户基础DN */
  user_base_dn?: string;
  /** 用户查询过滤器 */
  user_filter?: string;
  user_info_url?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthCASReq {
  kb_id?: string;
  redirect_url?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthCASResp {
  url?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthDingTalkReq {
  kb_id?: string;
  redirect_url?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthDingTalkResp {
  url?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthFeishuReq {
  kb_id?: string;
  redirect_url?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthFeishuResp {
  url?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthGitHubReq {
  kb_id?: string;
  redirect_url?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthGitHubResp {
  url?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthInfoResp {
  avatar_url?: string;
  email?: string;
  /** Unique identifier for the authentication record */
  id?: number;
  username?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthLDAPReq {
  kb_id?: string;
  password: string;
  username: string;
}

export type GithubComChaitinPandaWikiProApiShareV1AuthLDAPResp = Record<
  string,
  any
>;

export interface GithubComChaitinPandaWikiProApiShareV1AuthOAuthReq {
  kb_id?: string;
  redirect_url?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthOAuthResp {
  url?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthWecomReq {
  kb_id?: string;
  redirect_url?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthWecomResp {
  url?: string;
}

export type GithubComChaitinPandaWikiProApiShareV1CASCallbackResp = Record<
  string,
  any
>;

export type GithubComChaitinPandaWikiProApiShareV1DingtalkCallbackResp = Record<
  string,
  any
>;

export type GithubComChaitinPandaWikiProApiShareV1FeishuCallbackResp = Record<
  string,
  any
>;

export type GithubComChaitinPandaWikiProApiShareV1GitHubCallbackResp = Record<
  string,
  any
>;

export type GithubComChaitinPandaWikiProApiShareV1OAuthCallbackResp = Record<
  string,
  any
>;

export type GithubComChaitinPandaWikiProApiShareV1WecomCallbackResp = Record<
  string,
  any
>;

export interface GithubComChaitinPandaWikiProApiTokenV1APITokenListItem {
  created_at?: string;
  id?: string;
  name?: string;
  permission?: ConstsUserKBPermission;
  token?: string;
  updated_at?: string;
}

export interface GithubComChaitinPandaWikiProApiTokenV1CreateAPITokenReq {
  kb_id: string;
  name: string;
  permission: "full_control" | "doc_manage" | "data_operate";
}

export interface GithubComChaitinPandaWikiProApiTokenV1DeleteAPITokenReq {
  id: string;
  kb_id: string;
}

export interface GithubComChaitinPandaWikiProApiTokenV1UpdateAPITokenReq {
  id: string;
  kb_id: string;
  name?: string;
  permission?: "full_control" | "doc_manage" | "data_operate";
}

export interface GithubComChaitinPandaWikiProDomainBlockWords {
  words?: string[];
}

export interface GithubComChaitinPandaWikiProDomainCreateBlockWordsReq {
  block_words?: string[];
  kb_id: string;
}

export interface HandlerV1DocFeedBackLists {
  data?: DomainDocumentFeedbackListItem[];
  total?: number;
}

export interface DeleteApiProV1AuthDeleteParams {
  id?: number;
  kb_id?: string;
}

export interface GetApiProV1AuthGetParams {
  kb_id?: string;
  source_type?:
    | "dingtalk"
    | "feishu"
    | "wecom"
    | "oauth"
    | "github"
    | "cas"
    | "ldap"
    | "widget"
    | "dingtalk_bot"
    | "feishu_bot"
    | "wechat_bot"
    | "wechat_service_bot"
    | "discord_bot"
    | "wechat_official_account"
    | "openai_api";
}

export interface DeleteApiProV1AuthGroupDeleteParams {
  id: number;
  kb_id: string;
}

export interface GetApiProV1AuthGroupDetailParams {
  id: number;
  kb_id: string;
}

export interface GetApiProV1AuthGroupListParams {
  kb_id: string;
  /** @min 1 */
  page: number;
  /** @min 1 */
  per_page: number;
}

export interface GetApiProV1AuthGroupTreeParams {
  kb_id: string;
}

export interface GetApiProV1BlockParams {
  /** knowledge base ID */
  kb_id: string;
}

export interface GetApiProV1DocumentListParams {
  kb_id: string;
  /** @min 1 */
  page: number;
  /** @min 1 */
  per_page: number;
}

export interface GetApiProV1NodeReleaseDetailParams {
  id: string;
}

export interface GetApiProV1NodeReleaseListParams {
  kb_id: string;
  node_id: string;
}

export interface GetApiProV1PromptParams {
  /** knowledge base ID */
  kb_id: string;
}

export interface GetApiProV1TokenListParams {
  /** 知识库ID */
  kb_id: string;
}

export interface PostApiV1LicensePayload {
  /** license edition */
  license_edition: "contributor" | "enterprise";
  /** license type */
  license_type: "file" | "code";
  /**
   * license file
   * @format binary
   */
  license_file?: File;
  /** license code */
  license_code?: string;
}

export interface PostShareProV1DocumentFeedbackPayload {
  /** Node ID */
  node_id: string;
  /** Content */
  content: string;
  /** Correction Suggestion */
  correction_suggestion?: string;
  /**
   * Screenshot
   * @format binary
   */
  image?: File;
}

export interface GetShareProV1OpenapiCasCallbackParams {
  state?: string;
  ticket?: string;
}

export interface GetShareProV1OpenapiDingtalkCallbackParams {
  code?: string;
  state?: string;
}

export interface GetShareProV1OpenapiFeishuCallbackParams {
  code?: string;
  state?: string;
}

export interface GetShareProV1OpenapiGithubCallbackParams {
  code?: string;
  state?: string;
}

export interface GetShareProV1OpenapiOauthCallbackParams {
  code?: string;
  state?: string;
}

export interface GetShareProV1OpenapiWecomCallbackParams {
  code?: string;
  state?: string;
}
