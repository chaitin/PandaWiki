import TreeMenu, { TreeMenuItem } from '@/components/Drag/DragTree/TreeMenu';
import { ConstsCrawlerSource } from '@/request';
import { Box, Button } from '@mui/material';
import { useState } from 'react';
import AddDocByType from './AddDocByType';
import DocAddByCustomText from './DocAddByCustomText';

interface InputContentProps {
  exportFile?: boolean;
  refresh?: () => void;
  disabled?: boolean;
  context?: React.ReactElement<{ onClick?: any; 'aria-describedby'?: any }>;
  createLocal?: (node: {
    id: string;
    name: string;
    type: 1 | 2;
    emoji?: string;
    parentId?: string | null;
    content_type?: string;
  }) => void;
  scrollTo?: (id: string) => void;
}

const AddDocBtn = ({
  exportFile = true,
  refresh,
  disabled = false,
  context,
  createLocal,
  scrollTo,
}: InputContentProps) => {
  const [customDocOpen, setCustomDocOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [key, setKey] = useState<ConstsCrawlerSource | null>(null);
  const [docFileKey, setDocFileKey] = useState<1 | 2>(1);

  const menuItems: TreeMenuItem[] = [
    {
      key: 'docFile',
      label: '创建文件夹',
      onClick: () => {
        setDocFileKey(1);
        setCustomDocOpen(true);
      },
    },
    {
      key: 'next-line',
      label: '创建文档',
      onClick: () => {
        setDocFileKey(2);
        setCustomDocOpen(true);
      },
    },
    ...(exportFile
      ? [
          {
            key: ConstsCrawlerSource.CrawlerSourceFile,
            label: '通过离线文件导入',
            onClick: () => {
              setUploadOpen(true);
              setKey(ConstsCrawlerSource.CrawlerSourceFile);
            },
          },
          {
            key: ConstsCrawlerSource.CrawlerSourceUrl,
            label: '通过 URL 导入',
            onClick: () => {
              setKey(ConstsCrawlerSource.CrawlerSourceUrl);
              setUploadOpen(true);
            },
          },
          {
            key: ConstsCrawlerSource.CrawlerSourceRSS,
            label: '通过 RSS 导入',
            onClick: () => {
              setUploadOpen(true);
              setKey(ConstsCrawlerSource.CrawlerSourceRSS);
            },
          },
          {
            key: ConstsCrawlerSource.CrawlerSourceSitemap,
            label: '通过 Sitemap 导入',
            onClick: () => {
              setUploadOpen(true);
              setKey(ConstsCrawlerSource.CrawlerSourceSitemap);
            },
          },
          {
            key: ConstsCrawlerSource.CrawlerSourceNotion,
            label: '通过 Notion 导入',
            onClick: () => {
              setUploadOpen(true);
              setKey(ConstsCrawlerSource.CrawlerSourceNotion);
            },
          },
          {
            key: ConstsCrawlerSource.CrawlerSourceEpub,
            label: '通过 Epub 导入',
            onClick: () => {
              setUploadOpen(true);
              setKey(ConstsCrawlerSource.CrawlerSourceEpub);
            },
          },
          {
            key: ConstsCrawlerSource.CrawlerSourceWikijs,
            label: '通过 Wiki.js 导入',
            onClick: () => {
              setUploadOpen(true);
              setKey(ConstsCrawlerSource.CrawlerSourceWikijs);
            },
          },
          {
            key: ConstsCrawlerSource.CrawlerSourceYuque,
            label: '通过 语雀 导入',
            onClick: () => {
              setUploadOpen(true);
              setKey(ConstsCrawlerSource.CrawlerSourceYuque);
            },
          },
          {
            key: ConstsCrawlerSource.CrawlerSourceSiyuan,
            label: '通过 思源笔记 导入',
            onClick: () => {
              setUploadOpen(true);
              setKey(ConstsCrawlerSource.CrawlerSourceSiyuan);
            },
          },
          {
            key: ConstsCrawlerSource.CrawlerSourceMindoc,
            label: '通过 MinDoc 导入',
            onClick: () => {
              setUploadOpen(true);
              setKey(ConstsCrawlerSource.CrawlerSourceMindoc);
            },
          },
          {
            key: ConstsCrawlerSource.CrawlerSourceFeishu,
            label: '通过飞书文档导入',
            onClick: () => {
              setUploadOpen(true);
              setKey(ConstsCrawlerSource.CrawlerSourceFeishu);
            },
          },
          {
            key: ConstsCrawlerSource.CrawlerSourceDingtalk,
            label: '通过钉钉文档导入',
            onClick: () => {
              setUploadOpen(true);
              setKey(ConstsCrawlerSource.CrawlerSourceDingtalk);
            },
          },
          {
            key: ConstsCrawlerSource.CrawlerSourceConfluence,
            label: '通过 Confluence 导入',
            onClick: () => {
              setUploadOpen(true);
              setKey(ConstsCrawlerSource.CrawlerSourceConfluence);
            },
          },
        ]
      : []),
  ];

  const close = () => {
    setUploadOpen(false);
    setCustomDocOpen(false);
  };

  return (
    <Box>
      <TreeMenu
        menu={menuItems}
        context={
          context || (
            <Button variant='contained' disabled={disabled}>
              创建文档
            </Button>
          )
        }
      />
      {key && (
        <AddDocByType
          type={key}
          open={uploadOpen}
          refresh={refresh}
          onCancel={close}
          parentId={null}
        />
      )}
      <DocAddByCustomText
        type={docFileKey}
        open={customDocOpen}
        refresh={refresh}
        onCreated={node => {
          createLocal?.(node);
          scrollTo?.(node.id);
        }}
        onClose={() => setCustomDocOpen(false)}
      />
    </Box>
  );
};

export default AddDocBtn;
