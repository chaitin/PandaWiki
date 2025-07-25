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
  DeleteApiV1KnowledgeBaseDetailParams,
  DomainCreateKBReleaseReq,
  DomainCreateKnowledgeBaseReq,
  DomainGetKBReleaseListResp,
  DomainKnowledgeBaseDetail,
  DomainKnowledgeBaseListItem,
  DomainResponse,
  DomainUpdateKnowledgeBaseReq,
  GetApiV1KnowledgeBaseDetailParams,
  GetApiV1KnowledgeBaseReleaseListParams,
} from "./types";

/**
 * @description CreateKnowledgeBase
 *
 * @tags knowledge_base
 * @name PostApiV1KnowledgeBase
 * @summary CreateKnowledgeBase
 * @request POST:/api/v1/knowledge_base
 * @response `200` `DomainResponse` OK
 */

export const postApiV1KnowledgeBase = (
  body: DomainCreateKnowledgeBaseReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/knowledge_base`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetKnowledgeBaseDetail
 *
 * @tags knowledge_base
 * @name GetApiV1KnowledgeBaseDetail
 * @summary GetKnowledgeBaseDetail
 * @request GET:/api/v1/knowledge_base/detail
 * @response `200` `(DomainResponse & {
    data?: DomainKnowledgeBaseDetail,

})` OK
 */

export const getApiV1KnowledgeBaseDetail = (
  query: GetApiV1KnowledgeBaseDetailParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: DomainKnowledgeBaseDetail;
    }
  >({
    path: `/api/v1/knowledge_base/detail`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description UpdateKnowledgeBase
 *
 * @tags knowledge_base
 * @name PutApiV1KnowledgeBaseDetail
 * @summary UpdateKnowledgeBase
 * @request PUT:/api/v1/knowledge_base/detail
 * @response `200` `DomainResponse` OK
 */

export const putApiV1KnowledgeBaseDetail = (
  body: DomainUpdateKnowledgeBaseReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/knowledge_base/detail`,
    method: "PUT",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description DeleteKnowledgeBase
 *
 * @tags knowledge_base
 * @name DeleteApiV1KnowledgeBaseDetail
 * @summary DeleteKnowledgeBase
 * @request DELETE:/api/v1/knowledge_base/detail
 * @response `200` `DomainResponse` OK
 */

export const deleteApiV1KnowledgeBaseDetail = (
  query: DeleteApiV1KnowledgeBaseDetailParams,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/knowledge_base/detail`,
    method: "DELETE",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetKnowledgeBaseList
 *
 * @tags knowledge_base
 * @name GetApiV1KnowledgeBaseList
 * @summary GetKnowledgeBaseList
 * @request GET:/api/v1/knowledge_base/list
 * @response `200` `(DomainResponse & {
    data?: (DomainKnowledgeBaseListItem)[],

})` OK
 */

export const getApiV1KnowledgeBaseList = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainKnowledgeBaseListItem[];
    }
  >({
    path: `/api/v1/knowledge_base/list`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description CreateKBRelease
 *
 * @tags knowledge_base
 * @name PostApiV1KnowledgeBaseRelease
 * @summary CreateKBRelease
 * @request POST:/api/v1/knowledge_base/release
 * @response `200` `DomainResponse` OK
 */

export const postApiV1KnowledgeBaseRelease = (
  body: DomainCreateKBReleaseReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/knowledge_base/release`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetKBReleaseList
 *
 * @tags knowledge_base
 * @name GetApiV1KnowledgeBaseReleaseList
 * @summary GetKBReleaseList
 * @request GET:/api/v1/knowledge_base/release/list
 * @response `200` `(DomainResponse & {
    data?: DomainGetKBReleaseListResp,

})` OK
 */

export const getApiV1KnowledgeBaseReleaseList = (
  query: GetApiV1KnowledgeBaseReleaseListParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: DomainGetKBReleaseListResp;
    }
  >({
    path: `/api/v1/knowledge_base/release/list`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
