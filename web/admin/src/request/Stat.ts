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
  DomainResponse,
  GetApiV1StatBrowsersParams,
  GetApiV1StatConversationDistributionParams,
  GetApiV1StatCountParams,
  GetApiV1StatGeoCountParams,
  GetApiV1StatHotPagesParams,
  GetApiV1StatInstantCountParams,
  GetApiV1StatInstantPagesParams,
  GetApiV1StatRefererHostsParams,
} from "./types";

/**
 * @description GetBrowsers
 *
 * @tags stat
 * @name GetApiV1StatBrowsers
 * @summary GetBrowsers
 * @request GET:/api/v1/stat/browsers
 * @response `200` `DomainResponse` OK
 */

export const getApiV1StatBrowsers = (
  query: GetApiV1StatBrowsersParams,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/stat/browsers`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetConversationDistribution
 *
 * @tags stat
 * @name GetApiV1StatConversationDistribution
 * @summary GetConversationDistribution
 * @request GET:/api/v1/stat/conversation_distribution
 * @response `200` `DomainResponse` OK
 */

export const getApiV1StatConversationDistribution = (
  query: GetApiV1StatConversationDistributionParams,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/stat/conversation_distribution`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetCount
 *
 * @tags stat
 * @name GetApiV1StatCount
 * @summary GetCount
 * @request GET:/api/v1/stat/count
 * @response `200` `DomainResponse` OK
 */

export const getApiV1StatCount = (
  query: GetApiV1StatCountParams,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/stat/count`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetGeoCount
 *
 * @tags stat
 * @name GetApiV1StatGeoCount
 * @summary GetGeoCount
 * @request GET:/api/v1/stat/geo_count
 * @response `200` `DomainResponse` OK
 */

export const getApiV1StatGeoCount = (
  query: GetApiV1StatGeoCountParams,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/stat/geo_count`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetHotPages
 *
 * @tags stat
 * @name GetApiV1StatHotPages
 * @summary GetHotPages
 * @request GET:/api/v1/stat/hot_pages
 * @response `200` `DomainResponse` OK
 */

export const getApiV1StatHotPages = (
  query: GetApiV1StatHotPagesParams,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/stat/hot_pages`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetInstantCount
 *
 * @tags stat
 * @name GetApiV1StatInstantCount
 * @summary GetInstantCount
 * @request GET:/api/v1/stat/instant_count
 * @response `200` `DomainResponse` OK
 */

export const getApiV1StatInstantCount = (
  query: GetApiV1StatInstantCountParams,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/stat/instant_count`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetInstantPages
 *
 * @tags stat
 * @name GetApiV1StatInstantPages
 * @summary GetInstantPages
 * @request GET:/api/v1/stat/instant_pages
 * @response `200` `DomainResponse` OK
 */

export const getApiV1StatInstantPages = (
  query: GetApiV1StatInstantPagesParams,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/stat/instant_pages`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetRefererHosts
 *
 * @tags stat
 * @name GetApiV1StatRefererHosts
 * @summary GetRefererHosts
 * @request GET:/api/v1/stat/referer_hosts
 * @response `200` `DomainResponse` OK
 */

export const getApiV1StatRefererHosts = (
  query: GetApiV1StatRefererHostsParams,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/stat/referer_hosts`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
