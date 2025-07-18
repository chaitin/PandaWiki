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
  GetApiProV1AuthGetParams,
  GithubComChaitinPandaWikiProApiAuthV1GetAuthResp,
  GithubComChaitinPandaWikiProApiAuthV1SetAuthReq,
} from "./types";

/**
 * @description 获取授权信息
 *
 * @tags Auth
 * @name GetApiProV1AuthGet
 * @summary 获取授权信息
 * @request GET:/api/pro/v1/auth/get
 * @response `200` `(DomainResponse & {
    data?: GithubComChaitinPandaWikiProApiAuthV1GetAuthResp,

})` OK
 */

export const getApiProV1AuthGet = (
  query: GetApiProV1AuthGetParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: GithubComChaitinPandaWikiProApiAuthV1GetAuthResp;
    }
  >({
    path: `/api/pro/v1/auth/get`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 设置授权信息
 *
 * @tags Auth
 * @name PostApiProV1AuthSet
 * @summary 设置授权信息
 * @request POST:/api/pro/v1/auth/set
 * @response `200` `DomainResponse` OK
 */

export const postApiProV1AuthSet = (
  param: GithubComChaitinPandaWikiProApiAuthV1SetAuthReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/pro/v1/auth/set`,
    method: "POST",
    body: param,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
