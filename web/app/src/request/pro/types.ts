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
export enum DomainLicenseEdition {
  LicenseEditionFree = 0,
  LicenseEditionContributor = 1,
  LicenseEditionEnterprise = 2,
}

export enum ConstsSourceType {
  SourceTypeDingTalk = "dingtalk",
}

export interface DomainLicenseResp {
  edition?: DomainLicenseEdition;
  expired_at?: number;
  started_at?: number;
  state?: number;
}

export interface DomainResponse {
  data?: unknown;
  message?: string;
  success?: boolean;
}

export interface GithubComChaitinPandaWikiProApiAuthV1AuthItem {
  created_at?: string;
  id?: number;
  ip?: string;
  last_login_time?: string;
  source_type?: ConstsSourceType;
  username?: string;
}

export interface GithubComChaitinPandaWikiProApiAuthV1GetAuthResp {
  auths?: GithubComChaitinPandaWikiProApiAuthV1AuthItem[];
  clientID?: string;
  clientSecret?: string;
  sourceType?: ConstsSourceType;
}

export interface GithubComChaitinPandaWikiProApiAuthV1SetAuthReq {
  clientID?: string;
  clientSecret?: string;
  kb_id?: string;
  sourceType?: ConstsSourceType;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthDingTalkReq {
  redirect_url?: string;
  x_kb_id?: string;
}

export interface GithubComChaitinPandaWikiProApiShareV1AuthDingTalkResp {
  url?: string;
}

export type GithubComChaitinPandaWikiProApiShareV1DingtalkCallbackResp = Record<
  string,
  any
>;

export interface GetApiProV1AuthGetParams {
  kb_id?: string;
  source_type?: "dingtalk";
}

export interface PostApiV1LicensePayload {
  /** license type */
  license_type: "file" | "code";
  /**
   * license file
   * @format binary
   */
  license_file: File;
  /** license code */
  license_code: string;
}

export interface GetShareProV1OpenapiDingtalkCallbackParams {
  code?: string;
  state?: string;
}
