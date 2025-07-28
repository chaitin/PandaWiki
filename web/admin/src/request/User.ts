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
  DomainCreateUserReq,
  DomainDeleteUserReq,
  DomainLoginReq,
  DomainLoginResp,
  DomainResetPasswordReq,
  DomainResponse,
  DomainUserInfoResp,
  DomainUserListItemResp,
} from "./types";

/**
 * @description GetUser
 *
 * @tags user
 * @name GetApiV1User
 * @summary GetUser
 * @request GET:/api/v1/user
 * @response `200` `DomainUserInfoResp` OK
 */

export const getApiV1User = (params: RequestParams = {}) =>
  request<DomainUserInfoResp>({
    path: `/api/v1/user`,
    method: "GET",
    type: ContentType.Json,
    ...params,
  });

/**
 * @description CreateUser
 *
 * @tags user
 * @name PostApiV1UserCreate
 * @summary CreateUser
 * @request POST:/api/v1/user/create
 * @response `200` `DomainResponse` OK
 */

export const postApiV1UserCreate = (
  body: DomainCreateUserReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/user/create`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description DeleteUser
 *
 * @tags user
 * @name DeleteApiV1UserDelete
 * @summary DeleteUser
 * @request DELETE:/api/v1/user/delete
 * @response `200` `DomainResponse` OK
 */

export const deleteApiV1UserDelete = (
  body: DomainDeleteUserReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/user/delete`,
    method: "DELETE",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description ListUsers
 *
 * @tags user
 * @name GetApiV1UserList
 * @summary ListUsers
 * @request GET:/api/v1/user/list
 * @response `200` `(DomainResponse & {
    data?: (DomainUserListItemResp)[],

})` OK
 */

export const getApiV1UserList = (params: RequestParams = {}) =>
  request<
    DomainResponse & {
      data?: DomainUserListItemResp[];
    }
  >({
    path: `/api/v1/user/list`,
    method: "GET",
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Login
 *
 * @tags user
 * @name PostApiV1UserLogin
 * @summary Login
 * @request POST:/api/v1/user/login
 * @response `200` `DomainLoginResp` OK
 */

export const postApiV1UserLogin = (
  body: DomainLoginReq,
  params: RequestParams = {},
) =>
  request<DomainLoginResp>({
    path: `/api/v1/user/login`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description ResetPassword
 *
 * @tags user
 * @name PutApiV1UserResetPassword
 * @summary ResetPassword
 * @request PUT:/api/v1/user/reset_password
 * @response `200` `DomainResponse` OK
 */

export const putApiV1UserResetPassword = (
  body: DomainResetPasswordReq,
  params: RequestParams = {},
) =>
  request<DomainResponse>({
    path: `/api/v1/user/reset_password`,
    method: "PUT",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
