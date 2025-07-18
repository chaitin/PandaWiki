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

import request, { ContentType, RequestParams } from "./httpClient";
import {
  DomainResponse,
  GithubComChaitinPandaWikiProApiShareV1AuthDingTalkReq,
  GithubComChaitinPandaWikiProApiShareV1AuthDingTalkResp,
} from "./types";

/**
 * @description 钉钉登录
 *
 * @tags ShareAuth
 * @name PostShareProV1AuthDingtalk
 * @summary 钉钉登录
 * @request POST:/share/pro/v1/auth/dingtalk
 * @response `200` `(DomainResponse & {
    data?: GithubComChaitinPandaWikiProApiShareV1AuthDingTalkResp,

})` OK
 */

export const postShareProV1AuthDingtalk = (
  param: GithubComChaitinPandaWikiProApiShareV1AuthDingTalkReq,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
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
