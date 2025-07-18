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
  GetShareProV1OpenapiDingtalkCallbackParams,
  GithubComChaitinPandaWikiProApiShareV1DingtalkCallbackResp,
} from "./types";

/**
 * @description dingtalk回调
 *
 * @tags ShareOpenapi
 * @name GetShareProV1OpenapiDingtalkCallback
 * @summary dingtalk回调
 * @request GET:/share/pro/v1/openapi/dingtalk/callback
 * @response `200` `(DomainResponse & {
    data?: GithubComChaitinPandaWikiProApiShareV1DingtalkCallbackResp,

})` OK
 */

export const getShareProV1OpenapiDingtalkCallback = (
  query: GetShareProV1OpenapiDingtalkCallbackParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: GithubComChaitinPandaWikiProApiShareV1DingtalkCallbackResp;
    }
  >({
    path: `/share/pro/v1/openapi/dingtalk/callback`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
