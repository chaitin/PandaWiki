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
  GetApiProV1BlockParams,
  GithubComChaitinPandaWikiProDomainBlockWords,
  GithubComChaitinPandaWikiProDomainCreateBlockWordsReq,
} from "./types";

/**
 * @description Get question block words
 *
 * @tags block
 * @name GetApiProV1Block
 * @summary Get question block words
 * @request GET:/api/pro/v1/block
 * @response `200` `(DomainResponse & {
    data?: GithubComChaitinPandaWikiProDomainBlockWords,

})` OK
 */

export const getApiProV1Block = (
  query: GetApiProV1BlockParams,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: GithubComChaitinPandaWikiProDomainBlockWords;
    }
  >({
    path: `/api/pro/v1/block`,
    method: "GET",
    query: query,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Create new block words
 *
 * @tags block
 * @name PostApiProV1Block
 * @summary Create new block words
 * @request POST:/api/pro/v1/block
 * @response `200` `DomainResponse` OK
 */

export const postApiProV1Block = (
  req: GithubComChaitinPandaWikiProDomainCreateBlockWordsReq,
  params: RequestParams = {},
) =>
  httpRequest<DomainResponse>({
    path: `/api/pro/v1/block`,
    method: "POST",
    body: req,
    type: ContentType.Json,
    format: "json",
    ...params,
  });
