import { ConstsCrawlerSource } from '@/request';

// 文档状态常量
export const DOCUMENT_STATUS = {
  DEFAULT: 'default',
  WAITING: 'waiting',
  UPLOADING: 'uploading',
  UPLOAD_DONE: 'upload-done',
  UPLOAD_ERROR: 'upload-error',
  PULLING: 'pulling',
  PULL_DONE: 'pull-done',
  PULL_ERROR: 'pull-error',
  CREATING: 'creating',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

// 项目类型常量
export const ITEM_TYPE = {
  FILE: 'file',
  OTHER: 'other',
  FOLDER: 'folder',
} as const;

export const NoParseTypes: readonly ConstsCrawlerSource[] = [
  ConstsCrawlerSource.CrawlerSourceFile,
  ConstsCrawlerSource.CrawlerSourceEpub,
] as const;

// 需要上传文件的导入类型
export const UPLOAD_FILE_TYPES: readonly ConstsCrawlerSource[] = [
  ConstsCrawlerSource.CrawlerSourceFile,
  ConstsCrawlerSource.CrawlerSourceEpub,
  ConstsCrawlerSource.CrawlerSourceWikijs,
  ConstsCrawlerSource.CrawlerSourceYuque,
  ConstsCrawlerSource.CrawlerSourceSiyuan,
  ConstsCrawlerSource.CrawlerSourceMindoc,
  ConstsCrawlerSource.CrawlerSourceConfluence,
] as const;

// 需要解析的导入类型
export const PARSE_TYPES: readonly ConstsCrawlerSource[] = [
  ConstsCrawlerSource.CrawlerSourceConfluence,
  ConstsCrawlerSource.CrawlerSourceWikijs,
  ConstsCrawlerSource.CrawlerSourceSiyuan,
  ConstsCrawlerSource.CrawlerSourceMindoc,
  ConstsCrawlerSource.CrawlerSourceNotion,
] as const;

// 需要抓取的导入类型
export const SCRAPE_TYPES: readonly ConstsCrawlerSource[] = [
  ConstsCrawlerSource.CrawlerSourceRSS,
  ConstsCrawlerSource.CrawlerSourceSitemap,
] as const;

// 类型配置
export const TYPE_CONFIG: Record<
  ConstsCrawlerSource,
  {
    label: string;
    okText?: string;
    accept?: string;
    usage?: string;
  }
> = {
  [ConstsCrawlerSource.CrawlerSourceFile]: {
    label: '通过离线文件导入',
    okText: '导入文件',
    accept: '.txt, .md, .xls, .xlsx, .docx, .pdf, .html, .pptx',
    usage:
      'https://wiki.webinfra.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%E7%A6%BB%E7%BA%BF%E6%96%87%E4%BB%B6%E5%AF%BC%E5%85%A5',
  },
  [ConstsCrawlerSource.CrawlerSourceUrl]: {
    label: '通过 URL 导入',
    usage:
      'https://wiki.webinfra.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%20URL%20%E5%AF%BC%E5%85%A5',
  },
  [ConstsCrawlerSource.CrawlerSourceRSS]: {
    label: '通过 RSS 导入',
    usage:
      'https://wiki.webinfra.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%20RSS%20%E5%AF%BC%E5%85%A5',
  },
  [ConstsCrawlerSource.CrawlerSourceSitemap]: {
    label: '通过 Sitemap 导入',
    usage:
      'https://wiki.webinfra.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%20SiteMap%20%E5%AF%BC%E5%85%A5',
  },
  [ConstsCrawlerSource.CrawlerSourceNotion]: {
    label: '通过 Notion 导入',
    usage:
      'https://wiki.webinfra.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%20Notion%20%E5%AF%BC%E5%85%A5',
  },
  [ConstsCrawlerSource.CrawlerSourceEpub]: {
    label: '通过 Epub 导入',
    accept: '.epub',
    usage:
      'https://wiki.webinfra.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%20Epub%20%E5%AF%BC%E5%85%A5',
  },
  [ConstsCrawlerSource.CrawlerSourceWikijs]: {
    label: '通过 Wiki.js 导入',
    accept: '.zip',
    usage:
      'https://wiki.webinfra.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%20Wiki.js%20%E5%AF%BC%E5%85%A5',
  },
  [ConstsCrawlerSource.CrawlerSourceYuque]: {
    label: '通过语雀导入',
    accept: '.lakebook',
    usage:
      'https://wiki.webinfra.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%E8%AF%AD%E9%9B%80%E5%AF%BC%E5%85%A5',
  },
  [ConstsCrawlerSource.CrawlerSourceSiyuan]: {
    label: '通过思源笔记导入',
    accept: '.zip',
    usage:
      'https://wiki.webinfra.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%E6%80%9D%E6%BA%90%E7%AC%94%E8%AE%B0%E5%AF%BC%E5%85%A5',
  },
  [ConstsCrawlerSource.CrawlerSourceMindoc]: {
    label: '通过 MinDoc 导入',
    accept: '.zip',
    usage:
      'https://wiki.webinfra.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%20MinDoc%20%E5%AF%BC%E5%85%A5',
  },
  [ConstsCrawlerSource.CrawlerSourceFeishu]: {
    label: '通过飞书文档导入',
    okText: '拉取知识库',
    usage:
      'https://wiki.webinfra.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%E9%A3%9E%E4%B9%A6%E6%96%87%E6%A1%A3%E5%AF%BC%E5%85%A5',
  },
  [ConstsCrawlerSource.CrawlerSourceConfluence]: {
    label: '通过 Confluence 导入',
    accept: '.zip',
    usage:
      'https://wiki.webinfra.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%20Confluence%20%E5%AF%BC%E5%85%A5',
  },
};
