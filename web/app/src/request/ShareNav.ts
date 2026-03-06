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
import { DomainResponse, GetShareV1NavListParams } from "./types";

/**
 * @description ShareNavList
 *
 * @tags share_nav
 * @name GetShareV1NavList
 * @summary 前台获取栏目列表
 * @request GET:/share/v1/nav/list
 * @response `200` `DomainResponse` OK
 */

export const getShareV1NavList = (
  query: GetShareV1NavListParams,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/share/v1/nav/list`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
