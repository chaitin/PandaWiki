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
import { DomainResponse, DomainStatPageReq } from "./types";

/**
 * @description RecordPage
 *
 * @tags share_stat
 * @name PostShareV1StatPage
 * @summary RecordPage
 * @request POST:/share/v1/stat/page
 * @response `200` `DomainResponse` OK
 */

export const postShareV1StatPage = (
  request: DomainStatPageReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/share/v1/stat/page`,
    method: "POST",
    body: request,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
