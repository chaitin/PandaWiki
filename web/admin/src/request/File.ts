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
import { DomainObjectUploadResp, PostApiV1FileUploadPayload } from "./types";

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
  request<DomainObjectUploadResp>({
    path: `/api/v1/file/upload`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    ...params,
  });
