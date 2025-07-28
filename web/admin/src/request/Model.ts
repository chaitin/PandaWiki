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
  DomainCheckModelReq,
  DomainCheckModelResp,
  DomainCreateModelReq,
  DomainGetProviderModelListResp,
  DomainModelDetailResp,
  DomainModelListItem,
  DomainResponse,
  DomainUpdateModelReq,
  GetApiV1ModelDetailParams,
  GetApiV1ModelProviderSupportedParams,
} from "./types";

/**
 * @description update model
 *
 * @tags model
 * @name PutApiV1Model
 * @request PUT:/api/v1/model
 * @response `200` `DomainResponse` OK
 */

export const putApiV1Model = (
  model: DomainUpdateModelReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/model`,
    method: "PUT",
    body: model,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description create model
 *
 * @tags model
 * @name PostApiV1Model
 * @summary create model
 * @request POST:/api/v1/model
 * @response `200` `DomainResponse` OK
 */

export const postApiV1Model = (
  model: DomainCreateModelReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/model`,
    method: "POST",
    body: model,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description check model
 *
 * @tags model
 * @name PostApiV1ModelCheck
 * @summary check model
 * @request POST:/api/v1/model/check
 * @response `200` `(DomainResponse & {
    data?: DomainCheckModelResp,

})` OK
 */

export const postApiV1ModelCheck = (
  model: DomainCheckModelReq,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: DomainCheckModelResp;
    }
  >({
    path: `/api/v1/model/check`,
    method: "POST",
    body: model,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description get model detail
 *
 * @tags model
 * @name GetApiV1ModelDetail
 * @summary get model detail
 * @request GET:/api/v1/model/detail
 * @response `200` `(DomainResponse & {
    data?: DomainModelDetailResp,

})` OK
 */

export const getApiV1ModelDetail = (
  query: GetApiV1ModelDetailParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: DomainModelDetailResp;
    }
  >({
    path: `/api/v1/model/detail`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description get model list
 *
 * @tags model
 * @name GetApiV1ModelList
 * @summary get model list
 * @request GET:/api/v1/model/list
 * @response `200` `(DomainResponse & {
    data?: DomainModelListItem,

})` OK
 */

export const getApiV1ModelList = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainModelListItem;
    }
  >({
    path: `/api/v1/model/list`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description get provider supported model list
 *
 * @tags model
 * @name GetApiV1ModelProviderSupported
 * @summary get provider supported model list
 * @request GET:/api/v1/model/provider/supported
 * @response `200` `(DomainResponse & {
    data?: DomainGetProviderModelListResp,

})` OK
 */

export const getApiV1ModelProviderSupported = (
  query: GetApiV1ModelProviderSupportedParams,
  params: RequestParams = {},
) =>
  request<
    DomainResponse & {
      data?: DomainGetProviderModelListResp;
    }
  >({
    path: `/api/v1/model/provider/supported`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
