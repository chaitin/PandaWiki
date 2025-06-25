import request from "./request"
import {
  AppDetail,
  CheckModelData,
  ConversationDetail,
  ConversationListItem,
  CreateModelData,
  CreateNodeData,
  CreateNodeSummaryData,
  GetConversationListData,
  GetModelNameData,
  GetNodeRecommendData,
  KnowledgeBaseListItem,
  ModelListItem,
  NodeDetail,
  NodeListFilterData,
  NodeListItem,
  Paging,
  RecommendNode,
  ReleaseListItem,
  ResposeList,
  ScrapeRSSItem,
  UpdateAppDetailData,
  UpdateKnowledgeBaseData,
  UpdateModelData,
  UpdateNodeActionData,
  UpdateNodeData,
  UpdateUserInfo,
  UserForm,
  UserInfo
} from "./type"

export type * from "./type"

// =============================================》user

export const login = (data: UserForm): Promise<{ token: string }> =>
  request({ url: 'api/v1/user/login', method: 'post', data })

export const getUserList = (): Promise<UserInfo[]> =>
  request({ url: 'api/v1/user/list', method: 'get' })

export const getUser = (): Promise<UserInfo> =>
  request({ url: 'api/v1/user', method: 'get' })

export const createUser = (data: UserForm): Promise<void> =>
  request({ url: 'api/v1/user/create', method: 'post', data })

export const updateUser = (data: UpdateUserInfo): Promise<void> =>
  request({ url: 'api/v1/user/reset_password', method: 'put', data })

export const deleteUser = (body: { user_id: string }): Promise<void> =>
  request({ url: 'api/v1/user/delete', method: 'delete', data: body })

// =============================================》knowledge base

export const getKnowledgeBaseList = (): Promise<KnowledgeBaseListItem[]> =>
  request({ url: 'api/v1/knowledge_base/list', method: 'get' })

export const getKnowledgeBaseDetail = (params: { id: string }): Promise<KnowledgeBaseListItem> =>
  request({ url: 'api/v1/knowledge_base/detail', method: 'get', params })

export const updateKnowledgeBase = (data: Partial<UpdateKnowledgeBaseData>): Promise<void> =>
  request({ url: 'api/v1/knowledge_base/detail', method: 'put', data })

export const createKnowledgeBase = (data: Partial<UpdateKnowledgeBaseData>): Promise<{ id: string }> =>
  request({ url: 'api/v1/knowledge_base', method: 'post', data })

export const deleteKnowledgeBase = (params: { id: string }): Promise<void> =>
  request({ url: 'api/v1/knowledge_base/detail', method: 'delete', params })

export const getReleaseList = (params: { kb_id: string } & Paging): Promise<ResposeList<ReleaseListItem>> =>
  request({ url: 'api/v1/knowledge_base/release/list', method: 'get', params })

export const addRelease = (data: { kb_id: string, tag: string, message: string, node_ids: string[] }): Promise<void> =>
  request({ url: 'api/v1/knowledge_base/release', method: 'post', data })

// =============================================》node

export const getNodeList = (params: NodeListFilterData): Promise<NodeListItem[]> =>
  request({ url: 'api/v1/node/list', method: 'get', params })

export const getNodeDetail = (params: { id: string }): Promise<NodeDetail> =>
  request({ url: 'api/v1/node/detail', method: 'get', params })

export const moveNode = (data: { id: string, parent_id: string | null, next_id: string | null, prev_id: string | null }): Promise<void> =>
  request({ url: 'api/v1/node/move', method: 'post', data })

export const updateNodeAction = (data: UpdateNodeActionData): Promise<void> =>
  request({ url: 'api/v1/node/action', method: 'post', data })

export const updateNode = (data: UpdateNodeData): Promise<void> =>
  request({ url: 'api/v1/node/detail', method: 'put', data })

export const createNode = (data: CreateNodeData): Promise<{ id: string }> =>
  request({ url: 'api/v1/node', method: 'post', data })

export const createNodeSummary = (data: CreateNodeSummaryData): Promise<{ summary: string }> =>
  request({ url: 'api/v1/node/summary', method: 'post', data })

export const getNodeRecommend = (params: GetNodeRecommendData): Promise<RecommendNode[]> =>
  request({ url: 'api/v1/node/recommend_nodes', method: 'get', params })

// =============================================》crawler

export const scrapeCrawler = (data: { url: string, kb_id: string }, config?: { signal: AbortSignal }): Promise<{ content: string, title: string }> =>
  request({ url: 'api/v1/crawler/scrape', method: 'post', data, ...config })

export const scrapeRSS = (data: { url: string }): Promise<{ items: ScrapeRSSItem[] }> =>
  request({ url: 'api/v1/crawler/parse_rss', method: 'post', data })

export const scrapeSitemap = (data: { url: string }): Promise<{ items: ScrapeRSSItem[] }> =>
  request({ url: 'api/v1/crawler/parse_sitemap', method: 'post', data })

export const getNotionIntegration = (data: { integration: string }): Promise<{ id: string, title: string }[]> =>
  request({ url: 'api/v1/crawler/notion/get_list', method: 'post', data })

export const getNotionIntegrationDetail = (data: { pages: { id: string, title: string }[], integration: string, kb_id: string }): Promise<{ content: string, title: string }[]> =>
  request({ url: 'api/v1/crawler/notion/get_doc', method: 'post', data })

export const convertEpub = (data: FormData): Promise<{ content: string, title: string }> =>
  request({ url: 'api/v1/crawler/epub/convert', method: 'post', data })

export const parseWikijs = (data: FormData): Promise<{ id: string, content: string, title: string }[]> =>
  request({ url: 'api/v1/crawler/wikijs/analysis_export_file', method: 'post', data })

// =============================================》file

export const uploadFile = (
  data: FormData,
  config?: {
    onUploadProgress?: (event: { progress: number }) => void,
    abortSignal?: AbortSignal
  }
): Promise<{ key: string }> =>
  request({
    url: 'api/v1/file/upload',
    method: 'post',
    data,
    onUploadProgress: config?.onUploadProgress ? (progressEvent) => {
      const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
      config.onUploadProgress?.({ progress })
    } : undefined,
    signal: config?.abortSignal,
    headers: { 'Content-Type': 'multipart/form-data' }
  })

// =============================================》app

export const getAppDetail = (params: { kb_id: string, type: number }): Promise<AppDetail> =>
  request({ url: 'api/v1/app/detail', method: 'get', params })

export const updateAppDetail = (params: { id: string, }, app: UpdateAppDetailData): Promise<void> =>
  request({ url: 'api/v1/app', method: 'put', params, data: app })

// =============================================》model

export const getModelNameList = (data: GetModelNameData): Promise<{ models: { model: string }[] }> =>
  request({ url: 'api/v1/model/provider/supported', method: 'post', data })

export const testModel = (data: CheckModelData): Promise<{ error: string }> =>
  request({ url: 'api/v1/model/check', method: 'post', data })

export const getModelList = (): Promise<ModelListItem[]> =>
  request({ url: 'api/v1/model/list', method: 'get' })

export const createModel = (data: CreateModelData): Promise<{ id: string }> =>
  request({ url: 'api/v1/model', method: 'post', data })

export const deleteModel = (params: { id: string, }): Promise<void> =>
  request({ url: 'api/v1/model', method: 'delete', params })

export const updateModel = (data: UpdateModelData): Promise<void> =>
  request({ url: 'api/v1/model', method: 'put', data })

// =============================================》share

export const getAppLink = (params: { link: string }): Promise<AppDetail> =>
  request({ url: 'share/v1/app/link', method: 'get', params })

// =============================================》conversation

export const getConversationList = (params: GetConversationListData): Promise<ResposeList<ConversationListItem>> =>
  request({ url: 'api/v1/conversation', method: 'get', params })

export const getConversationDetail = (params: { id: string }): Promise<ConversationDetail> =>
  request({ url: 'api/v1/conversation/detail', method: 'get', params })
