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
  DomainShareConversationDetailResp,
  GetShareV1ConversationDetailParams,
} from "./types";

/**
 * @description GetConversationDetail
 *
 * @tags share_conversation
 * @name GetShareV1ConversationDetail
 * @summary GetConversationDetail
 * @request GET:/share/v1/conversation/detail
 * @response `200` `(DomainResponse & {
    data?: DomainShareConversationDetailResp,

})` OK
 */

export const getShareV1ConversationDetail = (
  query: GetShareV1ConversationDetailParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainShareConversationDetailResp;
    }
  >({
    path: `/share/v1/conversation/detail`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
