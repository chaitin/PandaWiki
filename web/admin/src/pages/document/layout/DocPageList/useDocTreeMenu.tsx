import { ITreeItem } from '@/api';
import {
  TreeMenuItem,
  TreeMenuOptions,
} from '@/components/Drag/DragTree/TreeMenu';
import { ConstsCrawlerSource } from '@/request/types';
import { ConstsNodeRagInfoStatus } from '@/request/types';
import { useCallback } from 'react';
import type { DocTreeMenuHandlers } from './types';

const IMPORT_SOURCES: { key: ConstsCrawlerSource; label: string }[] = [
  { key: ConstsCrawlerSource.CrawlerSourceFile, label: '通过离线文件导入' },
  { key: ConstsCrawlerSource.CrawlerSourceUrl, label: '通过 URL 导入' },
  { key: ConstsCrawlerSource.CrawlerSourceRSS, label: '通过 RSS 导入' },
  { key: ConstsCrawlerSource.CrawlerSourceSitemap, label: '通过 Sitemap 导入' },
  { key: ConstsCrawlerSource.CrawlerSourceNotion, label: '通过 Notion 导入' },
  { key: ConstsCrawlerSource.CrawlerSourceEpub, label: '通过 Epub 导入' },
  { key: ConstsCrawlerSource.CrawlerSourceWikijs, label: '通过 Wiki.js 导入' },
  { key: ConstsCrawlerSource.CrawlerSourceYuque, label: '通过 语雀 导入' },
  { key: ConstsCrawlerSource.CrawlerSourceSiyuan, label: '通过 思源笔记 导入' },
  { key: ConstsCrawlerSource.CrawlerSourceMindoc, label: '通过 MinDoc 导入' },
  { key: ConstsCrawlerSource.CrawlerSourceFeishu, label: '通过飞书文档导入' },
  { key: ConstsCrawlerSource.CrawlerSourceDingtalk, label: '通过钉钉文档导入' },
  {
    key: ConstsCrawlerSource.CrawlerSourceConfluence,
    label: '通过 Confluence 导入',
  },
];

export function useDocTreeMenu(
  handlers: DocTreeMenuHandlers,
): (opra: TreeMenuOptions) => TreeMenuItem[] {
  const {
    handleUrl,
    handleDelete,
    handlePublish,
    handleRestudy,
    handleProperties,
    handleFrontDoc,
  } = handlers;

  return useCallback(
    (opra: TreeMenuOptions): TreeMenuItem[] => {
      const { item, createItem, renameItem, isEditing } = opra;
      const menuItems: TreeMenuItem[] = [];

      if (item.type === 1) {
        menuItems.push(
          { label: '创建文件夹', key: 'folder', onClick: () => createItem(1) },
          {
            label: '创建文档',
            key: 'doc',
            children: [
              {
                label: '创建富文本',
                key: 'rich_text',
                onClick: () => createItem(2, 'html'),
              },
              {
                label: '创建 Markdown',
                key: 'md',
                onClick: () => createItem(2, 'md'),
              },
            ],
          },
          {
            label: '导入文档',
            key: 'next-line',
            children: IMPORT_SOURCES.map(({ key: k, label }) => ({
              label,
              key: k,
              onClick: () => handleUrl(item, k),
            })),
          },
        );
      }

      if (item.type === 2) {
        if (item.status === 1 || item.status === 0) {
          menuItems.push({
            label: item.status === 1 ? '发布更新' : '发布文档',
            key: 'update_publish',
            onClick: () => handlePublish(item),
          });
        }
        if (item.status !== 0) {
          menuItems.push({
            label:
              item.rag_status === ConstsNodeRagInfoStatus.NodeRagStatusPending
                ? '学习文档'
                : '重新学习',
            key: 'restudy',
            onClick: () => handleRestudy(item),
          });
        }
        menuItems.push(
          {
            label: '文档属性',
            key: 'properties',
            onClick: () => handleProperties(item),
          },
          {
            label: '前台查看',
            key: 'front_doc',
            onClick: () => handleFrontDoc(item.id),
          },
        );
      }

      if (!isEditing) {
        menuItems.push({ label: '重命名', key: 'rename', onClick: renameItem });
      }
      menuItems.push({
        label: '删除',
        color: 'error',
        key: 'delete',
        onClick: () => handleDelete(item),
      });

      return menuItems;
    },
    [
      handleUrl,
      handleDelete,
      handlePublish,
      handleRestudy,
      handleProperties,
      handleFrontDoc,
    ],
  );
}
