import {
  AnydocChild,
  ConstsCrawlerSource,
  ConstsCrawlerStatus,
  postApiV1CrawlerResults,
  V1CrawlerParseResp,
} from '@/request';
import { v4 as uuidv4 } from 'uuid';
import { ListDataItem } from '.';

export type FormData = {
  app_id?: string;
  app_secret?: string;
  user_access_token?: string;
  unionid?: string;
  url?: string;
  space_id?: string;
};

/**
 * 验证表单数据
 */
export const validateFormData = (
  formData: FormData,
  type: ConstsCrawlerSource,
): { isValid: boolean; errorMessage?: string } => {
  if (
    [
      ConstsCrawlerSource.CrawlerSourceUrl,
      ConstsCrawlerSource.CrawlerSourceRSS,
      ConstsCrawlerSource.CrawlerSourceSitemap,
      ConstsCrawlerSource.CrawlerSourceNotion,
    ].includes(type)
  ) {
    if (!formData.url?.trim()) {
      return { isValid: false, errorMessage: '请输入有效的地址' };
    }
  }

  if (type === ConstsCrawlerSource.CrawlerSourceFeishu) {
    if (!formData.app_id?.trim()) {
      return { isValid: false, errorMessage: '请输入 App ID' };
    }
    if (!formData.app_secret?.trim()) {
      return { isValid: false, errorMessage: '请输入 Client Secret' };
    }
    if (!formData.user_access_token?.trim()) {
      return { isValid: false, errorMessage: '请输入 User Access Token' };
    }
  }

  if (type === ConstsCrawlerSource.CrawlerSourceDingtalk) {
    if (!formData.app_id?.trim()) {
      return { isValid: false, errorMessage: '请输入 App ID' };
    }
    if (!formData.app_secret?.trim()) {
      return { isValid: false, errorMessage: '请输入 App Secret' };
    }
    if (!formData.unionid?.trim()) {
      return { isValid: false, errorMessage: '请输入 Union ID' };
    }
  }

  return { isValid: true };
};

/**
 * 轮询查询爬虫结果
 * @param taskId 任务ID
 * @param maxAttempts 最大尝试次数，默认60次
 * @param interval 轮询间隔（毫秒），默认2000ms
 */
export const pollCrawlerResults = async (
  taskId: string,
  maxAttempts = 60 * 15,
  interval = 2000,
): Promise<{ status: ConstsCrawlerStatus; content?: string }> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const resultsResp = await postApiV1CrawlerResults({
      task_ids: [taskId],
    });

    const result = resultsResp.list?.[0];
    if (!result) {
      throw new Error('未获取到结果');
    }

    // 如果状态是完成或失败，返回结果
    if (
      result.status === ConstsCrawlerStatus.CrawlerStatusCompleted ||
      result.status === ConstsCrawlerStatus.CrawlerStatusFailed
    ) {
      return {
        status: result.status,
        content: result.content,
      };
    }

    // 等待一段时间后重试
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  // 超时
  throw new Error('轮询超时');
};

export const flattenCrawlerParseResponse = (
  response: V1CrawlerParseResp,
  parentId: string | null = null,
  extraFields: Partial<ListDataItem> = {},
): ListDataItem[] => {
  const result: ListDataItem[] = [];
  const platformId = response.id || '';

  /**
   * 递归处理单个节点
   * @param node AnydocChild 节点
   * @param currentParentId 当前父节点的 ID
   */
  const processNode = (
    node: AnydocChild | undefined,
    currentParentId: string | null,
  ) => {
    if (!node || !node.value) {
      return;
    }

    const { value, children } = node;

    // root 节点或 id 为空节点不创建 item，子节点直接挂到当前父节点下
    if (!value.id || value.id === 'root') {
      if (children && children.length > 0) {
        children.forEach(child => processNode(child, currentParentId));
      }
      return;
    }

    // 创建 ListDataItem
    const item: ListDataItem = {
      uuid: uuidv4(),
      platform_id: platformId,
      id: value.id,
      title: value.title || '',
      summary: value.summary || '',
      file_type: value.file_type,
      file: value.file ?? false,
      parent_id: currentParentId || '',
      open: !value.file, // 文件夹默认展开
      status: 'parsed',
      folderReq: true,
      ...extraFields, // 合并额外字段
    };

    result.push(item);

    // 递归处理子节点，使用当前节点的 id 作为子节点的 parent_id
    if (children && children.length > 0) {
      children.forEach(child => processNode(child, value.id!));
    }
  };

  // 从 docs 根节点开始处理
  if (response.docs) {
    processNode(response.docs, parentId);
  }

  return result;
};
