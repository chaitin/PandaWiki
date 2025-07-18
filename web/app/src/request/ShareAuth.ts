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
  DomainAuthGetResp,
  DomainResponse,
  GetShareV1AuthGetParams,
} from "./types";

/**
 * @description AuthGet
 *
 * @tags share_auth
 * @name GetShareV1AuthGet
 * @summary AuthGet
 * @request GET:/share/v1/auth/get
 * @response `200` `(DomainResponse & {
    data?: DomainAuthGetResp,

})` OK
 */

export const getShareV1AuthGet = (
  query: GetShareV1AuthGetParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: DomainAuthGetResp;
    }
  >({
    path: `/share/v1/auth/get`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
