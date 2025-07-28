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
  DomainConversationMessage,
  DomainPaginatedResultArrayDomainConversationMessageListItem,
  DomainResponse,
  GetApiV1ConversationMessageDetailParams,
  GetApiV1ConversationMessageListParams,
} from "./types";

/**
 * @description Get message detail
 *
 * @tags Message
 * @name GetApiV1ConversationMessageDetail
 * @summary Get message detail
 * @request GET:/api/v1/conversation/message/detail
 * @response `200` `(DomainResponse & {
    data?: DomainConversationMessage,

})` OK
 */

export const getApiV1ConversationMessageDetail = (
  query: GetApiV1ConversationMessageDetailParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: DomainConversationMessage;
    }
  >({
    path: `/api/v1/conversation/message/detail`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetMessageFeedBackList
 *
 * @tags Message
 * @name GetApiV1ConversationMessageList
 * @summary GetMessageFeedBackList
 * @request GET:/api/v1/conversation/message/list
 * @response `200` `(DomainResponse & {
    data?: DomainPaginatedResultArrayDomainConversationMessageListItem,

})` MessageList
 */

export const getApiV1ConversationMessageList = (
  query: GetApiV1ConversationMessageListParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: DomainPaginatedResultArrayDomainConversationMessageListItem;
    }
  >({
    path: `/api/v1/conversation/message/list`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
