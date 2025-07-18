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
import { DomainResponse } from "./types";

/**
 * @description GetAppInfo
 *
 * @tags share_app
 * @name GetShareV1AppWebInfo
 * @summary GetAppInfo
 * @request GET:/share/v1/app/web/info
 * @response `200` `DomainResponse` OK
 */

export const getShareV1AppWebInfo = (params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/share/v1/app/web/info`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetWidgetAppInfo
 *
 * @tags share_app
 * @name GetShareV1AppWidgetInfo
 * @summary GetWidgetAppInfo
 * @request GET:/share/v1/app/widget/info
 * @response `200` `DomainResponse` OK
 */

export const getShareV1AppWidgetInfo = (params: RequestParams = {}) =>
  request<DomainResponse>({
    path: `/share/v1/app/widget/info`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });
