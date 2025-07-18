import request, { ContentType, RequestParams } from './httpClient';
import { DomainResponse } from './types';

export enum GithubComChaitinPandaWikiProDomainCommentStatus {
  CommentStatusReject = -1,
  CommentStatusPending = 0,
  CommentStatusAccepted = 1,
}

export interface DomainCommentModerateListReq {
  ids: string[];
  status: GithubComChaitinPandaWikiProDomainCommentStatus;
}

/**
 * @description Moderate comment list
 *
 * @tags comment
 * @name PostApiV1CommentModerate
 * @summary Moderate comment list
 * @request POST:/api/v1/comment_moderate
 * @response `200` `DomainResponse` Success
 */

export const postApiV1CommentModerate = (
  req: DomainCommentModerateListReq,
  params: RequestParams = {}
) =>
  request<DomainResponse>({
    path: `/api/v1/comment_moderate`,
    method: 'POST',
    body: req,
    type: ContentType.Json,
    format: 'json',
    ...params,
  });
