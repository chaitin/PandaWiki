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
  DomainConversationDetailResp,
  DomainResponse,
  GetApiV1ConversationDetailParams,
  GetApiV1ConversationParams,
  V1ConversationListItems,
} from "./types";

/**
 * @description get conversation list
 *
 * @tags conversation
 * @name GetApiV1Conversation
 * @summary get conversation list
 * @request GET:/api/v1/conversation
 * @response `200` `(DomainResponse & {
    data?: V1ConversationListItems,

})` OK
 */

export const getApiV1Conversation = (
  query: GetApiV1ConversationParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: V1ConversationListItems;
    }
  >({
    path: `/api/v1/conversation`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description get conversation detail
 *
 * @tags conversation
 * @name GetApiV1ConversationDetail
 * @summary get conversation detail
 * @request GET:/api/v1/conversation/detail
 * @response `200` `(DomainResponse & {
    data?: DomainConversationDetailResp,

})` OK
 */

export const getApiV1ConversationDetail = (
  query: GetApiV1ConversationDetailParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: DomainConversationDetailResp;
    }
  >({
    path: `/api/v1/conversation/detail`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
