export interface NavBtn {
  id: string
  url: string
  variant: 'contained' | 'outlined',
  showIcon: boolean
  icon: string
  text: string
  target: '_blank' | '_self'
}

export interface FooterSetting {
  footer_style: 'simple' | 'complex',
  corp_name: string,
  icp: string,
  brand_name: string,
  brand_desc: string,
  brand_logo: string,
  brand_groups: BrandGroup[],
}

export interface BrandGroup {
  name: string,
  links: {
    name: string,
    url: string,
  }[],
}

export interface AuthSetting {
  enabled: boolean
  password?: string
}

export interface CatalogSetting {
  catalog_visible: 1 | 2,
  catalog_folder: 1 | 2,
  catalog_width: number,
}

export interface KBDetail {
  name: string,
  settings: {
    title: string,
    btns: NavBtn[],
    icon: string,
    welcome_str: string,
    search_placeholder: string,
    recommend_questions: string[],
    recommend_node_ids: string[],
    desc: string,
    keyword: string,
    auto_sitemap: boolean,
    head_code: string,
    body_code: string,
    theme_mode?: 'light' | 'dark',
    simple_auth?: AuthSetting | null,
    footer_settings?: FooterSetting | null,
    catalog_settings?: CatalogSetting | null,
  },
  recommend_nodes: RecommendNode[]
}

export type RecommendNode = {
  id: string,
  name: string,
  type: 1 | 2,
  emoji: string,
  parent_id: string,
  summary: string
  position: number
  recommend_nodes?: RecommendNode[]
}

export interface NodeDetail {
  id: string
  kb_id: string
  name: string
  content: string
  created_at: string
  updated_at: string
  type: 1 | 2
  meta: {
    summary: string
    emoji?: string
  }
}

export interface NodeListItem {
  id: string,
  name: string,
  type: 1 | 2,
  emoji: string,
  position: number,
  parent_id: string,
  summary: string,
  created_at: string,
  updated_at: string,
}

export interface ChunkResultItem {
  node_id: string
  name: string
  summary: string
}


export interface ITreeItem {
  id: string;
  name: string;
  level: number;
  order?: number;
  parentId?: string | null;
  children?: ITreeItem[];
  type: 1 | 2;
  emoji?: string;
  defaultExpand?: boolean;
}
