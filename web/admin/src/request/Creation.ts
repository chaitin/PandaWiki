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
import { DomainTextReq } from "./types";

/**
 * @description Text creation
 *
 * @tags creation
 * @name PostApiV1CreationText
 * @summary Text creation
 * @request POST:/api/v1/creation/text
 * @response `200` `string` success
 */

export const postApiV1CreationText = (
  body: DomainTextReq,
  params: RequestParams = {},
) =>
  request<string>({
    path: `/api/v1/creation/text`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
