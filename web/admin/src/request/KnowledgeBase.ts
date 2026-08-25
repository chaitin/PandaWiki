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
  DeleteApiV1KnowledgeBaseDetailParams,
  DeleteApiV1KnowledgeBaseUserDeleteParams,
  DomainCreateKBReleaseReq,
  DomainCreateKnowledgeBaseReq,
  DomainGetKBReleaseListResp,
  DomainKnowledgeBaseDetail,
  DomainKnowledgeBaseListItem,
  DomainPWResponse,
  DomainResponse,
  DomainUpdateKnowledgeBaseReq,
  GetApiV1KnowledgeBaseDetailParams,
  GetApiV1KnowledgeBaseReleaseListParams,
  GetApiV1KnowledgeBaseUserListParams,
  V1KBUserInviteReq,
  V1KBUserListItemResp,
  V1KBUserUpdateReq,
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
  httpRequest<DomainResponse>({
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
 * @secure
 * @response `200` `(DomainPWResponse & {
    data?: DomainKnowledgeBaseDetail,

})` OK
 */

export const getApiV1KnowledgeBaseDetail = (
  query: GetApiV1KnowledgeBaseDetailParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: DomainKnowledgeBaseDetail;
    }
  >({
    path: `/api/v1/knowledge_base/detail`,
    method: "GET",
    query: query,
    secure: true,
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
  httpRequest<DomainResponse>({
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
  httpRequest<DomainResponse>({
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
 * @response `200` `(DomainPWResponse & {
    data?: (DomainKnowledgeBaseListItem)[],

})` OK
 */

export const getApiV1KnowledgeBaseList = (params: RequestParams = {}) =>
  httpRequest<
    DomainPWResponse & {
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
  httpRequest<DomainResponse>({
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
 * @response `200` `(DomainPWResponse & {
    data?: DomainGetKBReleaseListResp,

})` OK
 */

export const getApiV1KnowledgeBaseReleaseList = (
  query: GetApiV1KnowledgeBaseReleaseListParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
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

/**
 * @description Rollback KB release (restore node snapshots to nodes)
 *
 * @tags knowledge_base
 * @name PostApiV1KnowledgeBaseReleaseRollback
 * @summary RollbackKBRelease
 * @request POST:/api/v1/knowledge_base/release/rollback
 * @response `200` `DomainResponse` OK
 */

export const postApiV1KnowledgeBaseReleaseRollback = (
  body: { kb_id: string; release_id: string },
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/knowledge_base/release/rollback`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Delete KB release (non-current version only)
 *
 * @tags knowledge_base
 * @name DeleteApiV1KnowledgeBaseRelease
 * @summary DeleteKBRelease
 * @request DELETE:/api/v1/knowledge_base/release
 * @response `200` `DomainResponse` OK
 */

export const deleteApiV1KnowledgeBaseRelease = (
  query: { kb_id: string; release_id: string },
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/knowledge_base/release`,
    method: "DELETE",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Remove user from knowledge base
 *
 * @tags knowledge_base
 * @name DeleteApiV1KnowledgeBaseUserDelete
 * @summary KBUserDelete
 * @request DELETE:/api/v1/knowledge_base/user/delete
 * @secure
 * @response `200` `DomainResponse` OK
 */

export const deleteApiV1KnowledgeBaseUserDelete = (
  query: DeleteApiV1KnowledgeBaseUserDeleteParams,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/knowledge_base/user/delete`,
    method: "DELETE",
    query: query,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Invite user to knowledge base
 *
 * @tags knowledge_base
 * @name PostApiV1KnowledgeBaseUserInvite
 * @summary KBUserInvite
 * @request POST:/api/v1/knowledge_base/user/invite
 * @secure
 * @response `200` `DomainResponse` OK
 */

export const postApiV1KnowledgeBaseUserInvite = (
  param: V1KBUserInviteReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/knowledge_base/user/invite`,
    method: "POST",
    body: param,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description KBUserList
 *
 * @tags knowledge_base
 * @name GetApiV1KnowledgeBaseUserList
 * @summary KBUserList
 * @request GET:/api/v1/knowledge_base/user/list
 * @secure
 * @response `200` `(DomainPWResponse & {
    data?: (V1KBUserListItemResp)[],

})` OK
 */

export const getApiV1KnowledgeBaseUserList = (
  query: GetApiV1KnowledgeBaseUserListParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: V1KBUserListItemResp[];
    }
  >({
    path: `/api/v1/knowledge_base/user/list`,
    method: "GET",
    query: query,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Update user permission in knowledge base
 *
 * @tags knowledge_base
 * @name PatchApiV1KnowledgeBaseUserUpdate
 * @summary KBUserUpdate
 * @request PATCH:/api/v1/knowledge_base/user/update
 * @secure
 * @response `200` `DomainResponse` OK
 */

export const patchApiV1KnowledgeBaseUserUpdate = (
  param: V1KBUserUpdateReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/knowledge_base/user/update`,
    method: "PATCH",
    body: param,
    secure: true,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
