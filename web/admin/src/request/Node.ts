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
  GetApiV1NodeListGroupNavParams,
  GetApiV1NodeListParams,
  GetApiV1NodeRecommendNodesParams,
  GetApiV1NodeStatsParams,
  GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp,
  V1NodeDetailResp,
  V1NodeMoveNavReq,
  V1NodeRestudyReq,
  V1NodeRestudyResp,
  V1NodeStatsResp,
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
 * @description Get unpublished or unstudied document list grouped by nav
 *
 * @tags node
 * @name GetApiV1NodeListGroupNav
 * @summary Get Node List Grouped by Nav
 * @request GET:/api/v1/node/list/group/nav
 * @secure
 * @response `200` `(DomainPWResponse & {
    data?: (GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp)[],

})` OK
 */

export const getApiV1NodeListGroupNav = (
  query: GetApiV1NodeListGroupNavParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp[];
    }
  >({
    path: `/api/v1/node/list/group/nav`,
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
 * @description Move node (and all its descendants if folder) to a different nav
 *
 * @tags node
 * @name PostApiV1NodeMoveNav
 * @summary Move Node to Nav
 * @request POST:/api/v1/node/move/nav
 * @secure
 * @response `200` `DomainResponse` OK
 */

export const postApiV1NodeMoveNav = (
  body: V1NodeMoveNavReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/node/move/nav`,
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
 * @description Get Node Statistics
 *
 * @tags node
 * @name GetApiV1NodeStats
 * @summary Get Node Statistics
 * @request GET:/api/v1/node/stats
 * @secure
 * @response `200` `(DomainPWResponse & {
    data?: V1NodeStatsResp,

})` OK
 */

export const getApiV1NodeStats = (
  query: GetApiV1NodeStatsParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: V1NodeStatsResp;
    }
  >({
    path: `/api/v1/node/stats`,
    method: "GET",
    query: query,
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
