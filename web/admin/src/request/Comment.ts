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
  DomainCommentDeleteReq,
  DomainPWResponse,
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
 * @response `200` `(DomainPWResponse & {
    data?: V1CommentLists,

})` conversationList
 */

export const getApiV1Comment = (
  query: GetApiV1CommentParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
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
 * @description CommentDelete
 *
 * @tags comment
 * @name PostApiV1CommentDelete
 * @summary CommentDelete
 * @request POST:/api/v1/comment/delete
 * @response `200` `DomainResponse` total
 */

export const postApiV1CommentDelete = (
  req: DomainCommentDeleteReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/v1/comment/delete`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
