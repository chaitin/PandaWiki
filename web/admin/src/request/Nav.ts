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
  DeleteApiV1NavDeleteParams,
  DomainPWResponse,
  GetApiV1NavListParams,
  V1NavAddReq,
  V1NavListResp,
  V1NavMoveReq,
  V1NavUpdateReq,
} from "./types";

/**
 * @description Add Nav
 *
 * @tags Nav
 * @name PostApiV1NavAdd
 * @summary 添加分栏
 * @request POST:/api/v1/nav/add
 * @secure
 * @response `200` `DomainPWResponse` OK
 */

export const postApiV1NavAdd = (
  body: V1NavAddReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainPWResponse>({
    path: `/api/v1/nav/add`,
    method: "POST",
    body: body,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description DeleteNav Nav
 *
 * @tags Nav
 * @name DeleteApiV1NavDelete
 * @summary 删除栏目
 * @request DELETE:/api/v1/nav/delete
 * @secure
 * @response `200` `DomainPWResponse` OK
 */

export const deleteApiV1NavDelete = (
  query: DeleteApiV1NavDeleteParams,
  params: RequestParams = {},
) =>
  httpRequest<DomainPWResponse>({
    path: `/api/v1/nav/delete`,
    method: "DELETE",
    query: query,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Get Nav List
 *
 * @tags Nav
 * @name GetApiV1NavList
 * @summary 获取分栏列表
 * @request GET:/api/v1/nav/list
 * @secure
 * @response `200` `(DomainPWResponse & {
    data?: (V1NavListResp)[],

})` OK
 */

export const getApiV1NavList = (
  query: GetApiV1NavListParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: V1NavListResp[];
    }
  >({
    path: `/api/v1/nav/list`,
    method: "GET",
    query: query,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Move Nav
 *
 * @tags Nav
 * @name PostApiV1NavMove
 * @summary 移动栏目
 * @request POST:/api/v1/nav/move
 * @secure
 * @response `200` `DomainPWResponse` OK
 */

export const postApiV1NavMove = (
  body: V1NavMoveReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainPWResponse>({
    path: `/api/v1/nav/move`,
    method: "POST",
    body: body,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Update Nav
 *
 * @tags Nav
 * @name PatchApiV1NavUpdate
 * @summary 更新栏目信息
 * @request PATCH:/api/v1/nav/update
 * @secure
 * @response `200` `DomainPWResponse` OK
 */

export const patchApiV1NavUpdate = (
  body: V1NavUpdateReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainPWResponse>({
    path: `/api/v1/nav/update`,
    method: "PATCH",
    body: body,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
