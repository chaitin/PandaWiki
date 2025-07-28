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
  DeleteApiV1CommentListParams,
  DomainCommentModerateListReq,
  DomainResponse,
  GetApiV1CommentParams,
  V1CommentLists,
} from "./types";

/**
 * @description GetCommentModeratedList
 *
 * @tags comment
 * @name GetApiV1Comment
 * @summary GetCommentModeratedList
 * @request GET:/api/v1/comment
 * @response `200` `(DomainResponse & {
    data?: V1CommentLists,

})` conversationList
 */

export const getApiV1Comment = (
  query: GetApiV1CommentParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: V1CommentLists;
    }
  >({
    path: `/api/v1/comment`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description DeleteCommentList
 *
 * @tags comment
 * @name DeleteApiV1CommentList
 * @summary DeleteCommentList
 * @request DELETE:/api/v1/comment/list
 * @response `200` `DomainResponse` total
 */

export const deleteApiV1CommentList = (
  query: DeleteApiV1CommentListParams,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/comment/list`,
    method: "DELETE",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Moderate comment list
 *
 * @tags comment
 * @name PostApiV1CommentModerate
 * @summary Moderate comment list
 * @request POST:/api/v1/comment_moderate
 * @response `200` `DomainResponse` Success
 */

export const postApiV1CommentModerate = (
  req: DomainCommentModerateListReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/comment_moderate`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
