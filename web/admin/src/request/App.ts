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
  DeleteApiV1AppParams,
  DomainAppDetailResp,
  DomainResponse,
  DomainUpdateAppReq,
  GetApiV1AppDetailParams,
} from "./types";

/**
 * @description Update app
 *
 * @tags app
 * @name PutApiV1App
 * @summary Update app
 * @request PUT:/api/v1/app
 * @response `200` `DomainResponse` OK
 */

export const putApiV1App = (
  app: DomainUpdateAppReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/app`,
    method: "PUT",
    body: app,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Delete app
 *
 * @tags app
 * @name DeleteApiV1App
 * @summary Delete app
 * @request DELETE:/api/v1/app
 * @response `200` `DomainResponse` OK
 */

export const deleteApiV1App = (
  query: DeleteApiV1AppParams,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/app`,
    method: "DELETE",
    query: query,
    type: ContentType.Json,
    ...params,
  });

/**
 * @description Get app detail
 *
 * @tags app
 * @name GetApiV1AppDetail
 * @summary Get app detail
 * @request GET:/api/v1/app/detail
 * @response `200` `(DomainResponse & {
    data?: DomainAppDetailResp,

})` OK
 */

export const getApiV1AppDetail = (
  query: GetApiV1AppDetailParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: DomainAppDetailResp;
    }
  >({
    path: `/api/v1/app/detail`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
