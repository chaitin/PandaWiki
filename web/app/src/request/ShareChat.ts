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

import { ContentType, RequestParams } from "./httpClient";
import {
  DomainChatRequest,
  DomainFeedbackRequest,
  DomainResponse,
  PostShareV1ChatMessageParams,
  PostShareV1ChatWidgetParams,
} from "./types";

/**
 * @description Process user feedback for chat conversations
 *
 * @tags share_chat
 * @name PostShareV1ChatFeedback
 * @summary Handle chat feedback
 * @request POST:/share/v1/chat/feedback
 * @response `200` `DomainResponse` OK
 */

export const postShareV1ChatFeedback = (
  request: DomainFeedbackRequest,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/share/v1/chat/feedback`,
    method: "POST",
    body: request,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description ChatMessage
 *
 * @tags share_chat
 * @name PostShareV1ChatMessage
 * @summary ChatMessage
 * @request POST:/share/v1/chat/message
 * @response `200` `DomainResponse` OK
 */

export const postShareV1ChatMessage = (
  query: PostShareV1ChatMessageParams,
  request: DomainChatRequest,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/share/v1/chat/message`,
    method: "POST",
    query: query,
    body: request,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description ChatWidget
 *
 * @tags share_chat
 * @name PostShareV1ChatWidget
 * @summary ChatWidget
 * @request POST:/share/v1/chat/widget
 * @response `200` `DomainResponse` OK
 */

export const postShareV1ChatWidget = (
  query: PostShareV1ChatWidgetParams,
  request: DomainChatRequest,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/share/v1/chat/widget`,
    method: "POST",
    query: query,
    body: request,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
