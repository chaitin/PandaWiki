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
  DomainBatchMoveReq,
  DomainCreateNodeReq,
  DomainMoveNodeReq,
  DomainNodeActionReq,
  DomainNodeListItemResp,
  DomainNodeSummaryReq,
  DomainPWResponse,
  DomainRecommendNodeListResp,
  DomainResponse,
  DomainUpdateNodeReq,
  GetApiV1NodeDetailParams,
  GetApiV1NodeListParams,
  GetApiV1NodeRecommendNodesParams,
  V1NodeDetailResp,
  V1NodeDiffResp,
  V1NodeRestudyReq,
  V1NodeRestudyResp,
} from "./types";

/**
 * @description Create Node
 *
 * @tags node
 * @name PostApiV1Node
 * @summary Create Node
 * @request POST:/api/v1/node
 * @secure
 * @response `200` `(DomainPWResponse & {
    data?: Record<string, any>,

})` OK
 */

export const postApiV1Node = (
  body: DomainCreateNodeReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: Record<string, any>;
    }
  >({
    path: `/api/v1/node`,
    method: "POST",
    body: body,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Node Action
 *
 * @tags node
 * @name PostApiV1NodeAction
 * @summary Node Action
 * @request POST:/api/v1/node/action
 * @secure
 * @response `200` `(DomainPWResponse & {
    data?: Record<string, any>,

})` OK
 */

export const postApiV1NodeAction = (
  action: DomainNodeActionReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: Record<string, any>;
    }
  >({
    path: `/api/v1/node/action`,
    method: "POST",
    body: action,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Batch Move Node
 *
 * @tags node
 * @name PostApiV1NodeBatchMove
 * @summary Batch Move Node
 * @request POST:/api/v1/node/batch_move
 * @secure
 * @response `200` `DomainResponse` OK
 */

export const postApiV1NodeBatchMove = (
  body: DomainBatchMoveReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/node/batch_move`,
    method: "POST",
    body: body,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Get Node Detail
 *
 * @tags node
 * @name GetApiV1NodeDetail
 * @summary Get Node Detail
 * @request GET:/api/v1/node/detail
 * @secure
 * @response `200` `(DomainPWResponse & {
    data?: V1NodeDetailResp,

})` OK
 */

export const getApiV1NodeDetail = (
  query: GetApiV1NodeDetailParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: V1NodeDetailResp;
    }
  >({
    path: `/api/v1/node/detail`,
    method: "GET",
    query: query,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Update Node Detail
 *
 * @tags node
 * @name PutApiV1NodeDetail
 * @summary Update Node Detail
 * @request PUT:/api/v1/node/detail
 * @secure
 * @response `200` `DomainResponse` OK
 */

export const putApiV1NodeDetail = (
  body: DomainUpdateNodeReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/node/detail`,
    method: "PUT",
    body: body,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Get Node List
 *
 * @tags node
 * @name GetApiV1NodeList
 * @summary Get Node List
 * @request GET:/api/v1/node/list
 * @secure
 * @response `200` `(DomainPWResponse & {
    data?: (DomainNodeListItemResp)[],

})` OK
 */

export const getApiV1NodeList = (
  query: GetApiV1NodeListParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: DomainNodeListItemResp[];
    }
  >({
    path: `/api/v1/node/list`,
    method: "GET",
    query: query,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Move Node
 *
 * @tags node
 * @name PostApiV1NodeMove
 * @summary Move Node
 * @request POST:/api/v1/node/move
 * @secure
 * @response `200` `DomainResponse` OK
 */

export const postApiV1NodeMove = (
  body: DomainMoveNodeReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/node/move`,
    method: "POST",
    body: body,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Recommend Nodes
 *
 * @tags node
 * @name GetApiV1NodeRecommendNodes
 * @summary Recommend Nodes
 * @request GET:/api/v1/node/recommend_nodes
 * @secure
 * @response `200` `(DomainPWResponse & {
    data?: (DomainRecommendNodeListResp)[],

})` OK
 */

export const getApiV1NodeRecommendNodes = (
  query: GetApiV1NodeRecommendNodesParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: DomainRecommendNodeListResp[];
    }
  >({
    path: `/api/v1/node/recommend_nodes`,
    method: "GET",
    query: query,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description 文档重新学习
 *
 * @tags Node
 * @name PostApiV1NodeRestudy
 * @summary 文档重新学习
 * @request POST:/api/v1/node/restudy
 * @secure
 * @response `200` `(DomainResponse & {
    data?: V1NodeRestudyResp,

})` OK
 */

export const postApiV1NodeRestudy = (
  param: V1NodeRestudyReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: V1NodeRestudyResp;
    }
  >({
    path: `/api/v1/node/restudy`,
    method: "POST",
    body: param,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Summary Node
 *
 * @tags node
 * @name PostApiV1NodeSummary
 * @summary Summary Node
 * @request POST:/api/v1/node/summary
 * @secure
 * @response `200` `DomainResponse` OK
 */

export const postApiV1NodeSummary = (
  body: DomainNodeSummaryReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/node/summary`,
    method: "POST",
    body: body,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

export const postApiV1NodeImageSummary = (
  body: DomainNodeSummaryReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/node/image_summary`,
    method: "POST",
    body: body,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

export const getApiV1NodeDiff = (
  query: { id: string; kb_id: string },
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: V1NodeDiffResp;
    }
  >({
    path: `/api/v1/node/diff`,
    method: "GET",
    query: query,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

export const postApiV1NodeLock = (
  body: { id: string; kb_id: string },
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/node/lock`,
    method: "POST",
    body: body,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

export const postApiV1NodeUnlock = (
  body: { id: string; kb_id: string },
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/node/unlock`,
    method: "POST",
    body: body,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

export const postApiV1NodeForceUnlock = (
  body: { id: string; kb_id: string },
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/node/force_unlock`,
    method: "POST",
    body: body,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
