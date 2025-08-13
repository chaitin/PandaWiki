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
  DomainResponse,
  GetApiProV1AuthGetParams,
  GithubComChaitinPandaWikiProApiAuthV1AuthGetResp,
  GithubComChaitinPandaWikiProApiAuthV1AuthSetReq,
} from "./types";

/**
 * @description 获取授权信息
 *
 * @tags Auth
 * @name GetApiProV1AuthGet
 * @summary 获取授权信息
 * @request GET:/api/pro/v1/auth/get
 * @secure
 * @response `200` `(DomainResponse & {
    data?: GithubComChaitinPandaWikiProApiAuthV1AuthGetResp,

})` OK
 */

export const getApiProV1AuthGet = (
  query: GetApiProV1AuthGetParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: GithubComChaitinPandaWikiProApiAuthV1AuthGetResp;
    }
  >({
    path: `/api/pro/v1/auth/get`,
    method: "GET",
    query: query,
    secure: true,
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
 * @secure
 * @response `200` `DomainResponse` OK
 */

export const postApiProV1AuthSet = (
  param: GithubComChaitinPandaWikiProApiAuthV1AuthSetReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/pro/v1/auth/set`,
    method: "POST",
    body: param,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
