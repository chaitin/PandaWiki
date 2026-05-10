import httpRequest, { ContentType, RequestParams } from './httpClient';

export interface CategoryPromptItem {
  id: string;
  name: string;
  content: string;
  /** 检索属性维度，逗号分隔 */
  attributes?: string;
}

export const getApiV1CategoryPrompts = (
  query: { id: string },
  params: RequestParams = {},
) =>
  httpRequest<{ items: CategoryPromptItem[] }>({
    path: '/api/v1/knowledge_base/category_prompts',
    method: 'GET',
    query,
    type: ContentType.Json,
    format: 'json',
    ...params,
  });

export const putApiV1CategoryPrompts = (
  body: { kb_id: string; items: CategoryPromptItem[] },
  params: RequestParams = {},
) =>
  httpRequest<unknown>({
    path: '/api/v1/knowledge_base/category_prompts',
    method: 'PUT',
    body,
    type: ContentType.Json,
    format: 'json',
    ...params,
  });
