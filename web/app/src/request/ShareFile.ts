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
  DomainResponse,
  PostShareV1CommonFileUploadPayload,
  V1FileUploadResp,
  V1ShareFileUploadUrlReq,
  V1ShareFileUploadUrlResp,
} from "./types";

/**
 * @description 前台用户上传文件,目前只支持图片文件上传
 *
 * @tags ShareFile
 * @name PostShareV1CommonFileUpload
 * @summary 文件上传
 * @request POST:/share/v1/common/file/upload
 * @response `200` `(DomainResponse & {
    data?: V1FileUploadResp,

})` OK
 */

export const postShareV1CommonFileUpload = (
  data: PostShareV1CommonFileUploadPayload,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: V1FileUploadResp;
    }
  >({
    path: `/share/v1/common/file/upload`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });

/**
 * @description 前台用户上传文件,目前只支持图片文件上传
 *
 * @tags ShareFile
 * @name PostShareV1CommonFileUploadUrl
 * @summary 文件上传
 * @request POST:/share/v1/common/file/upload/url
 * @response `200` `(DomainResponse & {
    data?: V1ShareFileUploadUrlResp,

})` OK
 */

export const postShareV1CommonFileUploadUrl = (
  body: V1ShareFileUploadUrlReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: V1ShareFileUploadUrlResp;
    }
  >({
    path: `/share/v1/common/file/upload/url`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
