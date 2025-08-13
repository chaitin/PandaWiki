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
  DomainAnalysisConfluenceResp,
  DomainEpubResp,
  DomainGetDocsReq,
  DomainGetDocxReq,
  DomainGetDocxResp,
  DomainGetSpaceListReq,
  DomainGetSpaceListResp,
  DomainNotnionGetListReq,
  DomainPage,
  DomainPageInfo,
  DomainParseURLReq,
  DomainParseURLResp,
  DomainResponse,
  DomainScrapeReq,
  DomainScrapeResp,
  DomainSearchDocxReq,
  DomainSearchDocxResp,
  DomainSearchWikiReq,
  DomainSearchWikiResp,
  DomainSiYuanResp,
  DomainWikiJSResp,
  DomainYuqueResp,
  PostApiV1CrawlerConfluenceAnalysisExportFilePayload,
  PostApiV1CrawlerEpubConvertPayload,
  PostApiV1CrawlerSiyuanAnalysisExportFilePayload,
  PostApiV1CrawlerWikijsAnalysisExportFilePayload,
  PostApiV1CrawlerYuqueAnalysisExportFilePayload,
} from "./types";

/**
 * @description Analyze Confluence Export File
 *
 * @tags crawler
 * @name PostApiV1CrawlerConfluenceAnalysisExportFile
 * @summary AnalysisConfluenceExportFile
 * @request POST:/api/v1/crawler/confluence/analysis_export_file
 * @response `200` `(DomainResponse & {
    data?: (DomainAnalysisConfluenceResp)[],

})` OK
 */

export const postApiV1CrawlerConfluenceAnalysisExportFile = (
  data: PostApiV1CrawlerConfluenceAnalysisExportFilePayload,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainAnalysisConfluenceResp[];
    }
  >({
    path: `/api/v1/crawler/confluence/analysis_export_file`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });

/**
 * @description QpubConvert
 *
 * @tags crawler
 * @name PostApiV1CrawlerEpubConvert
 * @summary QpubConvert
 * @request POST:/api/v1/crawler/epub/convert
 * @response `200` `(DomainResponse & {
    data?: DomainEpubResp,

})` OK
 */

export const postApiV1CrawlerEpubConvert = (
  data: PostApiV1CrawlerEpubConvertPayload,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainEpubResp;
    }
  >({
    path: `/api/v1/crawler/epub/convert`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });

/**
 * @description Get Docx in Feishu Spaces
 *
 * @tags crawler
 * @name PostApiV1CrawlerFeishuGetDoc
 * @summary FeishuGetDocx
 * @request POST:/api/v1/crawler/feishu/get_doc
 * @response `200` `(DomainResponse & {
    data?: (DomainGetDocxResp)[],

})` OK
 */

export const postApiV1CrawlerFeishuGetDoc = (
  body: DomainGetDocxReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainGetDocxResp[];
    }
  >({
    path: `/api/v1/crawler/feishu/get_doc`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description List Docx in Feishu Spaces
 *
 * @tags crawler
 * @name PostApiV1CrawlerFeishuListDoc
 * @summary FeishuListDoc
 * @request POST:/api/v1/crawler/feishu/list_doc
 * @response `200` `(DomainResponse & {
    data?: (DomainSearchDocxResp)[],

})` OK
 */

export const postApiV1CrawlerFeishuListDoc = (
  body: DomainSearchDocxReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainSearchDocxResp[];
    }
  >({
    path: `/api/v1/crawler/feishu/list_doc`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description List All Feishu Spaces
 *
 * @tags crawler
 * @name PostApiV1CrawlerFeishuListSpaces
 * @summary FeishuListSpaces
 * @request POST:/api/v1/crawler/feishu/list_spaces
 * @response `200` `(DomainResponse & {
    data?: (DomainGetSpaceListResp)[],

})` OK
 */

export const postApiV1CrawlerFeishuListSpaces = (
  body: DomainGetSpaceListReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainGetSpaceListResp[];
    }
  >({
    path: `/api/v1/crawler/feishu/list_spaces`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Search Wiki in Feishu Spaces
 *
 * @tags crawler
 * @name PostApiV1CrawlerFeishuSearchWiki
 * @summary FeishuSearchWiki
 * @request POST:/api/v1/crawler/feishu/search_wiki
 * @response `200` `(DomainResponse & {
    data?: (DomainSearchWikiResp)[],

})` OK
 */

export const postApiV1CrawlerFeishuSearchWiki = (
  body: DomainSearchWikiReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainSearchWikiResp[];
    }
  >({
    path: `/api/v1/crawler/feishu/search_wiki`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description GetDocs
 *
 * @tags crawler
 * @name PostApiV1CrawlerNotionGetDoc
 * @summary GetDocs
 * @request POST:/api/v1/crawler/notion/get_doc
 * @response `200` `(DomainResponse & {
    data?: (DomainPage)[],

})` OK
 */

export const postApiV1CrawlerNotionGetDoc = (
  body: DomainGetDocsReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainPage[];
    }
  >({
    path: `/api/v1/crawler/notion/get_doc`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description NotionGetList
 *
 * @tags crawler
 * @name PostApiV1CrawlerNotionGetList
 * @summary NotionGetList
 * @request POST:/api/v1/crawler/notion/get_list
 * @response `200` `(DomainResponse & {
    data?: (DomainPageInfo)[],

})` OK
 */

export const postApiV1CrawlerNotionGetList = (
  body: DomainNotnionGetListReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainPageInfo[];
    }
  >({
    path: `/api/v1/crawler/notion/get_list`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Parse RSS
 *
 * @tags crawler
 * @name PostApiV1CrawlerParseRss
 * @summary Parse RSS
 * @request POST:/api/v1/crawler/parse_rss
 * @response `200` `(DomainResponse & {
    data?: DomainParseURLResp,

})` OK
 */

export const postApiV1CrawlerParseRss = (
  body: DomainParseURLReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainParseURLResp;
    }
  >({
    path: `/api/v1/crawler/parse_rss`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Parse Sitemap
 *
 * @tags crawler
 * @name PostApiV1CrawlerParseSitemap
 * @summary Parse Sitemap
 * @request POST:/api/v1/crawler/parse_sitemap
 * @response `200` `(DomainResponse & {
    data?: DomainParseURLResp,

})` OK
 */

export const postApiV1CrawlerParseSitemap = (
  body: DomainParseURLReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainParseURLResp;
    }
  >({
    path: `/api/v1/crawler/parse_sitemap`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Scrape
 *
 * @tags crawler
 * @name PostApiV1CrawlerScrape
 * @summary Scrape
 * @request POST:/api/v1/crawler/scrape
 * @response `200` `(DomainResponse & {
    data?: DomainScrapeResp,

})` OK
 */

export const postApiV1CrawlerScrape = (
  body: DomainScrapeReq,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainScrapeResp;
    }
  >({
    path: `/api/v1/crawler/scrape`,
    method: "POST",
    body: body,
    type: ContentType.Json,
    format: "json",
    ...params,
  });

/**
 * @description Analyze SiYuan Export File
 *
 * @tags crawler
 * @name PostApiV1CrawlerSiyuanAnalysisExportFile
 * @summary AnalysisSiyuanExportFile
 * @request POST:/api/v1/crawler/siyuan/analysis_export_file
 * @response `200` `(DomainResponse & {
    data?: (DomainSiYuanResp)[],

})` OK
 */

export const postApiV1CrawlerSiyuanAnalysisExportFile = (
  data: PostApiV1CrawlerSiyuanAnalysisExportFilePayload,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainSiYuanResp[];
    }
  >({
    path: `/api/v1/crawler/siyuan/analysis_export_file`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });

/**
 * @description AnalysisWikijsExportFile
 *
 * @tags crawler
 * @name PostApiV1CrawlerWikijsAnalysisExportFile
 * @summary AnalysisWikijsExportFile
 * @request POST:/api/v1/crawler/wikijs/analysis_export_file
 * @response `200` `(DomainResponse & {
    data?: (DomainWikiJSResp)[],

})` OK
 */

export const postApiV1CrawlerWikijsAnalysisExportFile = (
  data: PostApiV1CrawlerWikijsAnalysisExportFilePayload,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainWikiJSResp[];
    }
  >({
    path: `/api/v1/crawler/wikijs/analysis_export_file`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });

/**
 * @description Analyze Yuque Export File
 *
 * @tags crawler
 * @name PostApiV1CrawlerYuqueAnalysisExportFile
 * @summary AnalysisYuqueExportFile
 * @request POST:/api/v1/crawler/yuque/analysis_export_file
 * @response `200` `(DomainResponse & {
    data?: (DomainYuqueResp)[],

})` OK
 */

export const postApiV1CrawlerYuqueAnalysisExportFile = (
  data: PostApiV1CrawlerYuqueAnalysisExportFilePayload,
  params: RequestParams = {},
) =>
  httpRequest<
    DomainResponse & {
      data?: DomainYuqueResp[];
    }
  >({
    path: `/api/v1/crawler/yuque/analysis_export_file`,
    method: "POST",
    body: data,
    type: ContentType.FormData,
    format: "json",
    ...params,
  });
