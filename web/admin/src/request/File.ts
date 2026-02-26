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
  DomainAnydocUploadResp,
  DomainObjectUploadResp,
  DomainResponse,
  DomainUploadByUrlReq,
  PostApiV1FileUploadAnydocPayload,
  PostApiV1FileUploadPayload,
} from "./types";

/**
 * @description Upload File
 *
 * @tags file
 * @name PostApiV1FileUpload
 * @summary Upload File
 * @request POST:/api/v1/file/upload
 * @response `200` `DomainObjectUploadResp` OK
 */

export const postApiV1FileUpload = (
  data: PostApiV1FileUploadPayload,
  params: RequestParams = {},
) =>
  httpRequest<DomainObjectUploadResp>({
    path: `/api/v1/file/upload`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    ...params,
  });

/**
 * @description Upload Anydoc File
 *
 * @tags file
 * @name PostApiV1FileUploadAnydoc
 * @summary Upload Anydoc File
 * @request POST:/api/v1/file/upload/anydoc
 * @response `200` `DomainAnydocUploadResp` OK
 */

export const postApiV1FileUploadAnydoc = (
  data: PostApiV1FileUploadAnydocPayload,
  params: RequestParams = {},
) =>
  httpRequest<DomainAnydocUploadResp>({
    path: `/api/v1/file/upload/anydoc`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    ...params,
  });

/**
 * @description Upload File By Url
 *
 * @tags file
 * @name PostApiV1FileUploadUrl
 * @summary Upload File By Url
 * @request POST:/api/v1/file/upload/url
 * @response `200` `(DomainResponse & {
    data?: DomainObjectUploadResp,

})` OK
 */

export const postApiV1FileUploadUrl = (
  body: DomainUploadByUrlReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainObjectUploadResp;
    }
  >({
    path: `/api/v1/file/upload/url`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
