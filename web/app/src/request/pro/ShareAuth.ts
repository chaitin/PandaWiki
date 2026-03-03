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

import httpRequest, { ContentType, RequestParams } from "./httpClient";
import {
  DomainPWResponse,
  GithubComChaitinPandaWikiProApiShareV1AuthCASReq,
  GithubComChaitinPandaWikiProApiShareV1AuthCASResp,
  GithubComChaitinPandaWikiProApiShareV1AuthDingTalkReq,
  GithubComChaitinPandaWikiProApiShareV1AuthDingTalkResp,
  GithubComChaitinPandaWikiProApiShareV1AuthFeishuReq,
  GithubComChaitinPandaWikiProApiShareV1AuthFeishuResp,
  GithubComChaitinPandaWikiProApiShareV1AuthGitHubReq,
  GithubComChaitinPandaWikiProApiShareV1AuthGitHubResp,
  GithubComChaitinPandaWikiProApiShareV1AuthInfoResp,
  GithubComChaitinPandaWikiProApiShareV1AuthLDAPReq,
  GithubComChaitinPandaWikiProApiShareV1AuthLDAPResp,
  GithubComChaitinPandaWikiProApiShareV1AuthLogoutResp,
  GithubComChaitinPandaWikiProApiShareV1AuthOAuthReq,
  GithubComChaitinPandaWikiProApiShareV1AuthOAuthResp,
  GithubComChaitinPandaWikiProApiShareV1AuthWecomReq,
  GithubComChaitinPandaWikiProApiShareV1AuthWecomResp,
} from "./types";

/**
 * @description CAS登录
 *
 * @tags ShareAuth
 * @name PostShareProV1AuthCas
 * @summary CAS登录
 * @request POST:/share/pro/v1/auth/cas
 * @response `200` `(DomainPWResponse & {
    data?: GithubComChaitinPandaWikiProApiShareV1AuthCASResp,

})` OK
 */

export const postShareProV1AuthCas = (
  param: GithubComChaitinPandaWikiProApiShareV1AuthCASReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: GithubComChaitinPandaWikiProApiShareV1AuthCASResp;
    }
  >({
    path: `/share/pro/v1/auth/cas`,
    method: "POST",
    body: param,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 钉钉登录
 *
 * @tags ShareAuth
 * @name PostShareProV1AuthDingtalk
 * @summary 钉钉登录
 * @request POST:/share/pro/v1/auth/dingtalk
 * @response `200` `(DomainPWResponse & {
    data?: GithubComChaitinPandaWikiProApiShareV1AuthDingTalkResp,

})` OK
 */

export const postShareProV1AuthDingtalk = (
  param: GithubComChaitinPandaWikiProApiShareV1AuthDingTalkReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: GithubComChaitinPandaWikiProApiShareV1AuthDingTalkResp;
    }
  >({
    path: `/share/pro/v1/auth/dingtalk`,
    method: "POST",
    body: param,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 飞书登录
 *
 * @tags ShareAuth
 * @name PostShareProV1AuthFeishu
 * @summary 飞书登录
 * @request POST:/share/pro/v1/auth/feishu
 * @response `200` `(DomainPWResponse & {
    data?: GithubComChaitinPandaWikiProApiShareV1AuthFeishuResp,

})` OK
 */

export const postShareProV1AuthFeishu = (
  param: GithubComChaitinPandaWikiProApiShareV1AuthFeishuReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: GithubComChaitinPandaWikiProApiShareV1AuthFeishuResp;
    }
  >({
    path: `/share/pro/v1/auth/feishu`,
    method: "POST",
    body: param,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GitHub登录
 *
 * @tags ShareAuth
 * @name PostShareProV1AuthGithub
 * @summary GitHub登录
 * @request POST:/share/pro/v1/auth/github
 * @response `200` `(DomainPWResponse & {
    data?: GithubComChaitinPandaWikiProApiShareV1AuthGitHubResp,

})` OK
 */

export const postShareProV1AuthGithub = (
  param: GithubComChaitinPandaWikiProApiShareV1AuthGitHubReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: GithubComChaitinPandaWikiProApiShareV1AuthGitHubResp;
    }
  >({
    path: `/share/pro/v1/auth/github`,
    method: "POST",
    body: param,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description AuthInfo
 *
 * @tags ShareAuth
 * @name GetShareProV1AuthInfo
 * @summary AuthInfo
 * @request GET:/share/pro/v1/auth/info
 * @response `200` `(DomainPWResponse & {
    data?: GithubComChaitinPandaWikiProApiShareV1AuthInfoResp,

})` OK
 */

// export const getShareProV1AuthInfo = (params: RequestParams = {}) =>
//   httpRequest<
//     DomainPWResponse & {
//       data?: GithubComChaitinPandaWikiProApiShareV1AuthInfoResp;
//     }
//   >({
//     path: `/share/pro/v1/auth/info`,
//     method: "GET",
//     type: ContentType.Json,
//     format: "json",
//     ...params,
//   });

/**
 * @description LDAP登录
 *
 * @tags ShareAuth
 * @name PostShareProV1AuthLdap
 * @summary LDAP登录
 * @request POST:/share/pro/v1/auth/ldap
 * @response `200` `(DomainPWResponse & {
    data?: GithubComChaitinPandaWikiProApiShareV1AuthLDAPResp,

})` OK
 */

export const postShareProV1AuthLdap = (
  param: GithubComChaitinPandaWikiProApiShareV1AuthLDAPReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: GithubComChaitinPandaWikiProApiShareV1AuthLDAPResp;
    }
  >({
    path: `/share/pro/v1/auth/ldap`,
    method: "POST",
    body: param,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 用户登出
 *
 * @tags ShareAuth
 * @name PostShareProV1AuthLogout
 * @summary 用户登出
 * @request POST:/share/pro/v1/auth/logout
 * @response `200` `(DomainPWResponse & {
    data?: GithubComChaitinPandaWikiProApiShareV1AuthLogoutResp,

})` OK
 */

export const postShareProV1AuthLogout = (params: RequestParams = {}) =>
  httpRequest<
    DomainPWResponse & {
      data?: GithubComChaitinPandaWikiProApiShareV1AuthLogoutResp;
    }
  >({
    path: `/share/pro/v1/auth/logout`,
    method: "POST",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description OAuth登录
 *
 * @tags ShareAuth
 * @name PostShareProV1AuthOauth
 * @summary OAuth登录
 * @request POST:/share/pro/v1/auth/oauth
 * @response `200` `(DomainPWResponse & {
    data?: GithubComChaitinPandaWikiProApiShareV1AuthOAuthResp,

})` OK
 */

export const postShareProV1AuthOauth = (
  param: GithubComChaitinPandaWikiProApiShareV1AuthOAuthReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: GithubComChaitinPandaWikiProApiShareV1AuthOAuthResp;
    }
  >({
    path: `/share/pro/v1/auth/oauth`,
    method: "POST",
    body: param,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 企业微信登录
 *
 * @tags ShareAuth
 * @name PostShareProV1AuthWecom
 * @summary 企业微信登录
 * @request POST:/share/pro/v1/auth/wecom
 * @response `200` `(DomainPWResponse & {
    data?: GithubComChaitinPandaWikiProApiShareV1AuthWecomResp,

})` OK
 */

export const postShareProV1AuthWecom = (
  param: GithubComChaitinPandaWikiProApiShareV1AuthWecomReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: GithubComChaitinPandaWikiProApiShareV1AuthWecomResp;
    }
  >({
    path: `/share/pro/v1/auth/wecom`,
    method: "POST",
    body: param,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
