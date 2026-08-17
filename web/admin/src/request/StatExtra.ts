import httpRequest, { ContentType, RequestParams } from './httpClient';

export interface HotQuestionItem {
  question?: string;
  count?: number;
}

/**
 * 热门问题 Top10（自定义接口，未在 swagger 生成文件中）。
 */
export const getApiV1StatHotQuestions = (
  query: { kb_id: string; day: number },
  params: RequestParams = {},
) =>
  httpRequest<HotQuestionItem[]>({
    path: `/api/v1/stat/hot_questions`,
    method: 'GET',
    query,
    secure: true,
    type: ContentType.Json,
    format: 'json',
    ...params,
  });
