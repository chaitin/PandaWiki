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
  DomainLicenseResp,
  DomainResponse,
  PostApiV1LicensePayload,
} from "./types";

/**
 * @description Get license
 *
 * @tags license
 * @name GetApiV1License
 * @summary Get license
 * @request GET:/api/v1/license
 * @response `200` `(DomainResponse & {
    data?: DomainLicenseResp,

})` OK
 */

export const getApiV1License = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainLicenseResp;
    }
  >({
    path: `/api/v1/license`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Upload license
 *
 * @tags license
 * @name PostApiV1License
 * @summary Upload license
 * @request POST:/api/v1/license
 * @response `200` `(DomainResponse & {
    data?: DomainLicenseResp,

})` OK
 */

export const postApiV1License = (
  data: PostApiV1LicensePayload,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: DomainLicenseResp;
    }
  >({
    path: `/api/v1/license`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });
