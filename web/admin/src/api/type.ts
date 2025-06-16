import { AppType, IconMap, ModelProvider } from "@/constant/enums"

export type Paging = {
  page?: number
  per_page?: number
}

export type ResposeList<T> = {
  total: number
  data: T[]
}

export interface BaseItem {
  id: string
}

export type TrendData = { count: number, date: string }

// =============================================》user
export type UserForm = {
  account: string,
  password: string,
}

export type UserInfo = {
  id: string,
  account: string,
  last_access?: string,
  created_at?: string
}

export type UpdateUserInfo = {
  id: string
  new_password: string
}

// =============================================》knowledge base
export type UpdateKnowledgeBaseData = {
  id: string,
  name: string,
  access_settings: {
    hosts?: string[] | null,
    ports?: number[] | null,
    ssl_ports?: number[] | null,
    private_key?: string,
    public_key?: string,
    base_url?: string,
  }
}

export interface KnowledgeBaseFormData {
  name: string
  domain: string
  http: boolean
  https: boolean
  port: number
  ssl_port: number
  httpsCert: string
  httpsKey: string
}

export type KnowledgeBaseAccessSettings = {
  hosts: string[] | null,
  ports: number[] | null,
  private_key: string,
  public_key: string,
  base_url: string,
  ssl_ports: number[] | null
}

export type KnowledgeBaseStats = {
  doc_count: number,
  chunk_count: number,
  word_count: number,
}

export type KnowledgeBaseListItem = Pick<UpdateKnowledgeBaseData, 'id' | 'name'> & {
  created_at: string,
  updated_at: string,
  access_settings: KnowledgeBaseAccessSettings,
  stats: KnowledgeBaseStats
}

export interface CardWebHeaderBtn {
  id: string
  url: string
  variant: 'contained' | 'outlined',
  showIcon: boolean
  icon: string
  text: string
  target: '_blank' | '_self'
}

export type ReleaseListItem = {
  created_at: string,
  id: string,
  kb_id: string,
  message: string,
  tag: string
}

// =============================================》node
export type NodeListItem = {
  id: string,
  name: string,
  type: 1 | 2,
  emoji: string,
  position: number,
  parent_id: string,
  summary: string,
  created_at: string,
  updated_at: string,
  status: 1 | 2 // 1 草稿 2 发布
  visibility: 1 | 2 // 1 私有 2 公开
}

export type GetNodeRecommendData = {
  kb_id: string
  node_ids: string[]
}

export type CreateNodeSummaryData = {
  kb_id: string
  id: string
}

export type NodeDetail = {
  id: string,
  name: string,
  type: 1 | 2,
  content: string,
  kb_id: string,
  meta: {
    emoji?: string,
    summary?: string
  },
  created_at: string,
  updated_at: string
}

export type CreateNodeData = {
  kb_id: string
  content?: string
  name?: string
  parent_id?: string | null
  type: 1 | 2
  emoji?: string
}

export type NodeListFilterData = {
  kb_id: string
  search?: string
}

export type NodeAction = 'delete'

export type UpdateNodeActionData = {
  ids: string[],
  kb_id: string,
  action: NodeAction
}

export type UpdateNodeData = {
  kb_id: string,
  content?: string,
  id: string,
  name?: string,
  emoji?: string,
  status?: 1 | 2
  visibility?: 1 | 2
}

export interface ITreeItem {
  id: string;
  name: string;
  level: number;
  order?: number;
  emoji?: string
  parentId?: string | null;
  summary?: string
  children?: ITreeItem[];
  type: 1 | 2;
  isEditting?: boolean;
  canHaveChildren?: boolean;
  updated_at?: string;
  status?: 1 | 2
  visibility?: 1 | 2
}


// =============================================》crawler

export type ScrapeRSSItem = {
  desc: string,
  published: string,
  title: string,
  url: string
}

// =============================================》app

export type AppCommonInfo = {
  name: string
  type: keyof typeof AppType
}

export type AppStats = {
  day_counts: TrendData[],
  last_24h_count: number,
  last_24h_ip_count: number
}

export type AppListItem = {
  id: string,
  link: string,
  stats: AppStats | null
  settings: {
    icon: string,
  },
} & AppCommonInfo

export type DingBotSetting = {
  dingtalk_bot_client_id: string,
  dingtalk_bot_client_secret: string,
  dingtalk_bot_welcome_str: string,
  dingtalk_bot_template_id: string,
}

export type WecomBotSetting = {
  wecom_bot_agent_id: number
  wecom_bot_corp_secret: string
  wecom_bot_suite_token: string
  wecom_bot_suite_id: string
  wecom_bot_suite_encoding_aes_key: string
  wecom_bot_corp_id: string
  wecom_bot_welcome_str: string
}

export type FeishuBotSetting = {
  feishu_bot_app_id: string
  feishu_bot_app_secret: string
  feishu_bot_welcome_str: string
}

export type HeaderSetting = {
  title: string,
  icon: string,
  btns: CardWebHeaderBtn[],
}

export type WelcomeSetting = {
  welcome_str: string,
  search_placeholder: string,
  recommend_questions: string[],
  recommend_node_ids: string[],
}

export type SEOSetting = {
  keyword: string,
  desc: string,
  auto_sitemap: boolean,
}

export type CustomCodeSetting = {
  head_code: string,
  body_code: string
}

export type AppSetting = HeaderSetting & WelcomeSetting & SEOSetting & CustomCodeSetting & DingBotSetting & WecomBotSetting & FeishuBotSetting & {
  base_url: string
}

export type RecommendNode = {
  id: string,
  name: string,
  type: 1 | 2,
  parent_id: string,
  summary: string
  position: number
  recommend_nodes?: RecommendNode[]
}

export type AppDetail = {
  id: string,
  link: string,
  stats: AppStats | null
  settings: AppSetting
  kb_id: string
  recommend_nodes: RecommendNode[]
} & AppCommonInfo

export type UpdateAppDetailData = {
  name?: string
  settings?: Partial<AppSetting>
}

export type AppConfigEditData = {
  link: string
  name: string
  recommend_questions: string[]
  search_placeholder: string
  icon: string
  desc: string
  position: number[]
  plugin_ids: string[]
  associated_kb_ids: string[]
}

// =============================================》model

export type GetModelNameData = {
  type: 'chat' | 'embedding' | 'rerank',
  provider: keyof typeof ModelProvider | '',
  api_header: string,
  api_key: string,
  base_url: string
}

export type CreateModelData = {
  model: string
} & GetModelNameData

export type CheckModelData = {
  api_version: string
} & CreateModelData

export type UpdateModelData = {
  id: string
} & CheckModelData

export type ModelListItem = {
  completion_tokens: number,
  id: string,
  model: keyof typeof IconMap,
  type: 'chat' | 'embedding' | 'rerank'
  api_version: string,
  prompt_tokens: number,
  total_tokens: number
} & GetModelNameData

// =============================================》conversation

export type GetConversationListData = {
  kb_id?: string,
  remote_ip?: string,
  subject?: string,
} & Paging

export type ConversationListItem = {
  app_name: string,
  created_at: string,
  id: string,
  model: string,
  ip_address: {
    city: string,
    country: string,
    ip: string,
    province: string
  },
  remote_ip: string,
  subject: string
}

export type ConversationDetail = {
  app_id: string,
  created_at: string,
  id: string,
  remote_ip: string,
  subject: string
  messages: {
    app_id: string,
    completion_tokens: number,
    content: string,
    conversation_id: string,
    created_at: string,
    id: string,
    model: string,
    prompt_tokens: number,
    provider: keyof typeof ModelProvider,
    remote_ip: string,
    role: 'assistant' | 'user',
    total_tokens: number
  }[],
  references: {
    app_id: string,
    conversation_id: string,
    doc_id: string,
    favicon: string,
    title: string,
    url: string
  }[],
}

export type ChatConversationItem = {
  role: 'assistant' | 'user',
  content: string,
}