import request from './request';
import {
  AppDetail,
  CheckModelData,
  ConversationDetail,
  ConversationDistributionItem,
  ConversationListItem,
  CreateModelData,
  CreateNodeData,
  CreateNodeSummaryData,
  FeedbackListItem,
  GetConversationListData,
  GetModelNameData,
  GetNodeRecommendData,
  HotDocsItem,
  ImportDocByFeishuFormData,
  KnowledgeBaseListItem,
  LicenseInfo,
  ModelListItem,
  NodeDetail,
  NodeListFilterData,
  NodeListItem,
  NodeReleaseDetail,
  NodeReleaseItem,
  Paging,
  RecommendNode,
  RefererHostItem,
  ReleaseListItem,
  ResposeList,
  ScrapeRSSItem,
  StatInstantPageItme,
  StatTypeItem,
  TrendData,
  UpdateAppDetailData,
  UpdateKnowledgeBaseData,
  UpdateModelData,
  UpdateNodeActionData,
  UpdateNodeData,
  UpdateUserInfo,
  UserForm,
  UserInfo,
} from './type';

export type * from './type';

// =============================================》user

export const login = (data: UserForm): Promise<{ token: string }> =>
  request({ url: 'api/v1/user/login', method: 'post', data });

export const getUserList = (): Promise<UserInfo[]> =>
  request({ url: 'api/v1/user/list', method: 'get' });

export const getUser = (): Promise<UserInfo> =>
  request({ url: 'api/v1/user', method: 'get' });

export const createUser = (data: UserForm): Promise<void> =>
  request({ url: 'api/v1/user/create', method: 'post', data });

export const updateUser = (data: UpdateUserInfo): Promise<void> =>
  request({ url: 'api/v1/user/reset_password', method: 'put', data });

export const deleteUser = (body: { user_id: string }): Promise<void> =>
  request({ url: 'api/v1/user/delete', method: 'delete', data: body });

// =============================================》knowledge base

export const getKnowledgeBaseList = (): Promise<KnowledgeBaseListItem[]> =>
  request({ url: 'api/v1/knowledge_base/list', method: 'get' });

export const getKnowledgeBaseDetail = (params: {
  id: string;
}): Promise<KnowledgeBaseListItem> =>
  request({ url: 'api/v1/knowledge_base/detail', method: 'get', params });

export const updateKnowledgeBase = (
  data: Partial<UpdateKnowledgeBaseData>,
): Promise<void> =>
  request({ url: 'api/v1/knowledge_base/detail', method: 'put', data });

export const createKnowledgeBase = (
  data: Partial<UpdateKnowledgeBaseData>,
): Promise<{ id: string }> =>
  request({ url: 'api/v1/knowledge_base', method: 'post', data });

export const deleteKnowledgeBase = (params: { id: string }): Promise<void> =>
  request({ url: 'api/v1/knowledge_base/detail', method: 'delete', params });

export const getReleaseList = (
  params: { kb_id: string } & Paging,
): Promise<ResposeList<ReleaseListItem>> =>
  request({ url: 'api/v1/knowledge_base/release/list', method: 'get', params });

export const addRelease = (data: {
  kb_id: string;
  tag: string;
  message: string;
  node_ids: string[];
}): Promise<void> =>
  request({ url: 'api/v1/knowledge_base/release', method: 'post', data });

// =============================================》node

export const getNodeList = (
  params: NodeListFilterData,
): Promise<NodeListItem[]> =>
  request({ url: 'api/v1/node/list', method: 'get', params });

export const getNodeDetail = (params: { id: string }): Promise<NodeDetail> =>
  request({ url: 'api/v1/node/detail', method: 'get', params });

export const moveNode = (data: {
  id: string;
  parent_id: string | null;
  next_id: string | null;
  prev_id: string | null;
}): Promise<void> => request({ url: 'api/v1/node/move', method: 'post', data });

export const batchMoveNode = (data: {
  ids: string[];
  parent_id: string;
  kb_id: string;
}): Promise<void> =>
  request({ url: 'api/v1/node/batch_move', method: 'post', data });

export const updateNodeAction = (data: UpdateNodeActionData): Promise<void> =>
  request({ url: 'api/v1/node/action', method: 'post', data });

export const updateNode = (data: UpdateNodeData): Promise<void> =>
  request({ url: 'api/v1/node/detail', method: 'put', data });

export const createNode = (data: CreateNodeData): Promise<{ id: string }> =>
  request({ url: 'api/v1/node', method: 'post', data });

export const createNodeSummary = (
  data: CreateNodeSummaryData,
): Promise<{ summary: string }> =>
  request({ url: 'api/v1/node/summary', method: 'post', data });

export const getNodeRecommend = (
  params: GetNodeRecommendData,
): Promise<RecommendNode[]> =>
  request({ url: 'api/v1/node/recommend_nodes', method: 'get', params });

export const getNodeReleaseList = (params: {
  kb_id: string;
  node_id: string;
}): Promise<NodeReleaseItem[]> =>
  request({ url: 'api/v1/node/release/list', method: 'get', params });

export const getNodeReleaseDetail = (params: {
  id: string;
}): Promise<NodeReleaseDetail> =>
  request({ url: 'api/v1/node/release/detail', method: 'get', params });

// =============================================》crawler

export const scrapeCrawler = (
  data: { url: string; kb_id: string },
  config?: { signal: AbortSignal },
): Promise<{ content: string; title: string }> =>
  request({ url: 'api/v1/crawler/scrape', method: 'post', data, ...config });

export const scrapeRSS = (data: {
  url: string;
}): Promise<{ items: ScrapeRSSItem[] }> =>
  request({ url: 'api/v1/crawler/parse_rss', method: 'post', data });

export const scrapeSitemap = (data: {
  url: string;
}): Promise<{ items: ScrapeRSSItem[] }> =>
  request({ url: 'api/v1/crawler/parse_sitemap', method: 'post', data });

export const getNotionIntegration = (data: {
  integration: string;
}): Promise<{ id: string; title: string }[]> =>
  request({ url: 'api/v1/crawler/notion/get_list', method: 'post', data });

export const getNotionIntegrationDetail = (data: {
  pages: { id: string; title: string }[];
  integration: string;
  kb_id: string;
}): Promise<{ content: string; title: string }[]> =>
  request({ url: 'api/v1/crawler/notion/get_doc', method: 'post', data });

export const convertEpub = (
  data: FormData,
): Promise<{ content: string; title: string }> =>
  request({ url: 'api/v1/crawler/epub/convert', method: 'post', data });

export const parseWikijs = (
  data: FormData,
): Promise<{ id: string; content: string; title: string }[]> =>
  request({
    url: 'api/v1/crawler/wikijs/analysis_export_file',
    method: 'post',
    data,
  });

export const parseConfluence = (
  data: FormData,
): Promise<{ id: string; content: string; title: string }[]> =>
  request({
    url: 'api/v1/crawler/confluence/analysis_export_file',
    method: 'post',
    data,
  });

export const parseYuque = (
  data: FormData,
): Promise<{ id: string; content: string; title: string }[]> =>
  request({
    url: 'api/v1/crawler/yuque/analysis_export_file',
    method: 'post',
    data,
  });

export const parseSiyuan = (
  data: FormData,
): Promise<{ id: string; content: string; title: string }[]> =>
  request({
    url: 'api/v1/crawler/siyuan/analysis_export_file',
    method: 'post',
    data,
  });

export const parseMinDoc = (
  data: FormData,
): Promise<{ id: string; content: string; title: string }[]> =>
  request({
    url: 'api/v1/crawler/siyuan/analysis_export_file',
    method: 'post',
    data,
  });

export const getFeishuKnowledgeBase = (
  data: ImportDocByFeishuFormData,
): Promise<{ space_id: string; name: string }[]> =>
  request({ url: 'api/v1/crawler/feishu/list_spaces', method: 'post', data });

export const getFeishuCloudDocs = (
  data: ImportDocByFeishuFormData,
): Promise<
  { url: string; name: string; obj_token: string; obj_type: number }[]
> => request({ url: 'api/v1/crawler/feishu/list_doc', method: 'post', data });

export const getFeishuKBDocById = (
  data: ImportDocByFeishuFormData & { space_id: string },
): Promise<
  {
    space_id: string;
    title: string;
    url: string;
    obj_token: string;
    obj_type: number;
  }[]
> =>
  request({ url: 'api/v1/crawler/feishu/search_wiki', method: 'post', data });

export const getFeishuDocDetail = (
  data: ImportDocByFeishuFormData & {
    kb_id: string;
    sources: {
      url: string;
      obj_token: string;
      obj_type: number;
    }[];
  },
): Promise<{ content: string; title: string }[]> =>
  request({ url: 'api/v1/crawler/feishu/get_doc', method: 'post', data });

// =============================================》file

export const uploadFile = (
  data: FormData,
  config?: {
    onUploadProgress?: (event: { progress: number }) => void;
    abortSignal?: AbortSignal;
  },
): Promise<{ key: string }> =>
  request({
    url: 'api/v1/file/upload',
    method: 'post',
    data,
    onUploadProgress: config?.onUploadProgress
      ? progressEvent => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1),
          );
          config.onUploadProgress?.({ progress });
        }
      : undefined,
    signal: config?.abortSignal,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// =============================================》app

export const getAppDetail = (params: {
  kb_id: string;
  type: number;
}): Promise<AppDetail> =>
  request({ url: 'api/v1/app/detail', method: 'get', params });

export const updateAppDetail = (
  params: { id: string },
  app: UpdateAppDetailData,
): Promise<void> =>
  request({ url: 'api/v1/app', method: 'put', params, data: app });

// =============================================》model

export const getModelNameList = (
  data: GetModelNameData,
): Promise<{ models: { model: string }[] }> =>
  request({ url: 'api/v1/model/provider/supported', method: 'post', data });

export const testModel = (data: CheckModelData): Promise<{ error: string }> =>
  request({ url: 'api/v1/model/check', method: 'post', data });

export const getModelList = (): Promise<ModelListItem[]> =>
  request({ url: 'api/v1/model/list', method: 'get' });

export const createModel = (data: CreateModelData): Promise<{ id: string }> =>
  request({ url: 'api/v1/model', method: 'post', data });

export const deleteModel = (params: { id: string }): Promise<void> =>
  request({ url: 'api/v1/model', method: 'delete', params });

export const updateModel = (data: UpdateModelData): Promise<void> =>
  request({ url: 'api/v1/model', method: 'put', data });

// =============================================》share

export const getAppLink = (params: { link: string }): Promise<AppDetail> =>
  request({ url: 'share/v1/app/link', method: 'get', params });

// =============================================》conversation

export const getConversationList = (
  params: GetConversationListData,
): Promise<ResposeList<ConversationListItem>> =>
  request({ url: 'api/v1/conversation', method: 'get', params });

export const getConversationDetail = (params: {
  id: string;
}): Promise<ConversationDetail> =>
  request({ url: 'api/v1/conversation/detail', method: 'get', params });

// =============================================》feedback

export const getFeedbackList = (
  params: { kb_id: string } & Paging,
): Promise<ResposeList<FeedbackListItem>> =>
  request({ url: 'api/v1/comment', method: 'get', params });

export const deleteFeedback = (params: { ids: string[] }): Promise<void> =>
  request({ url: 'api/v1/comment/list', method: 'delete', params });

export const getFeedbackEvaluateList = (
  params: { kb_id: string } & Paging,
): Promise<ResposeList<FeedbackListItem>> =>
  request({
    url: 'api/v1/conversation/message/list',
    method: 'get',
    params,
  });

export const getFeedbackEvaluateDetail = (params: {
  id: string;
}): Promise<ConversationDetail> =>
  request({ url: 'api/v1/conversation/message/detail', method: 'get', params });

// =============================================》stat

export const statInstantPage = (params: {
  kb_id: string;
}): Promise<StatInstantPageItme[]> =>
  request({ url: 'api/v1/stat/instant_pages', method: 'get', params });

export const statInstantCount = (params: {
  kb_id: string;
}): Promise<(Omit<TrendData, 'name'> & { time: string })[]> =>
  request({ url: 'api/v1/stat/instant_count', method: 'get', params });

export const statGeoCount = (params: {
  kb_id: string;
}): Promise<Record<string, number>> =>
  request({ url: 'api/v1/stat/geo_count', method: 'get', params });

export const statCount = (params: { kb_id: string }): Promise<StatTypeItem> =>
  request({ url: 'api/v1/stat/count', method: 'get', params });

export const statBrowsers = (params: {
  kb_id: string;
}): Promise<{ browser: TrendData[]; os: TrendData[] }> =>
  request({ url: 'api/v1/stat/browsers', method: 'get', params });

export const statHotPages = (params: {
  kb_id: string;
}): Promise<HotDocsItem[]> =>
  request({ url: 'api/v1/stat/hot_pages', method: 'get', params });

export const statRefererHosts = (params: {
  kb_id: string;
}): Promise<RefererHostItem[]> =>
  request({ url: 'api/v1/stat/referer_hosts', method: 'get', params });

export const statConversationDistribution = (params: {
  kb_id: string;
}): Promise<ConversationDistributionItem[]> =>
  request({
    url: 'api/v1/stat/conversation_distribution',
    method: 'get',
    params,
  });

// =============================================》release
export const getLicenseInfo = (): Promise<LicenseInfo> =>
  request({ url: 'api/v1/license', method: 'get' });

export const activeLicense = (data: FormData): Promise<void> =>
  request({ url: 'api/v1/license', method: 'post', data });
