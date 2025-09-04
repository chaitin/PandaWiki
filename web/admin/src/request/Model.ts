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
  DomainCreateModelReq,
  DomainGetProviderModelListReq,
  DomainGetProviderModelListResp,
  DomainPWResponse,
  DomainResponse,
  DomainUpdateModelReq,
  GithubComChaitinPandaWikiDomainCheckModelReq,
  GithubComChaitinPandaWikiDomainCheckModelResp,
  GithubComChaitinPandaWikiDomainModelListItem,
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
  httpRequest<DomainResponse>({
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
  httpRequest<DomainResponse>({
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
    data?: GithubComChaitinPandaWikiDomainCheckModelResp,

})` OK
 */

export const postApiV1ModelCheck = (
  model: GithubComChaitinPandaWikiDomainCheckModelReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: GithubComChaitinPandaWikiDomainCheckModelResp;
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
 * @description get model list
 *
 * @tags model
 * @name GetApiV1ModelList
 * @summary get model list
 * @request GET:/api/v1/model/list
 * @response `200` `(DomainPWResponse & {
    data?: GithubComChaitinPandaWikiDomainModelListItem,

})` OK
 */

export const getApiV1ModelList = (params: RequestParams = {}) =>
  httpRequest<
    DomainPWResponse & {
      data?: GithubComChaitinPandaWikiDomainModelListItem;
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
 * @name PostApiV1ModelProviderSupported
 * @summary get provider supported model list
 * @request POST:/api/v1/model/provider/supported
 * @response `200` `(DomainPWResponse & {
    data?: DomainGetProviderModelListResp,

})` OK
 */

export const postApiV1ModelProviderSupported = (
  params: DomainGetProviderModelListReq,
  requestParams: RequestParams = {},
) =>
  httpRequest<
    DomainPWResponse & {
      data?: DomainGetProviderModelListResp;
    }
  >({
    path: `/api/v1/model/provider/supported`,
    method: "POST",
    body: params,
    type: ContentType.Json,
    format: "json",
    ...requestParams,
  });
