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
  GetShareV1NodeDetailParams,
  V1ShareNodeDetailResp,
} from "./types";

/**
 * @description GetNodeDetail
 *
 * @tags share_node
 * @name GetShareV1NodeDetail
 * @summary GetNodeDetail
 * @request GET:/share/v1/node/detail
 * @response `200` `(DomainResponse & {
    data?: V1ShareNodeDetailResp,

})` OK
 */

export const getShareV1NodeDetail = (
  query: GetShareV1NodeDetailParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: V1ShareNodeDetailResp;
    }
  >({
    path: `/share/v1/node/detail`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description ShareNodeList
 *
 * @tags share_node
 * @name GetShareV1NodeList
 * @summary ShareNodeList
 * @request GET:/share/v1/node/list
 * @response `200` `DomainResponse` OK
 */

export const getShareV1NodeList = (params: RequestParams = {}) =>
  httpRequest<DomainResponse>({
    path: `/share/v1/node/list`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });
