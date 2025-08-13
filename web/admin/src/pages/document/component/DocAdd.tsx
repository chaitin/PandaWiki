import { ImportDocType } from '@/api';
import { addOpacityToColor } from '@/utils';
import { Box, Button, Stack, useTheme } from '@mui/material';
import { MenuSelect } from 'ct-mui';
import { useState } from 'react';
import DocAddByCustomText from './DocAddByCustomText';
import ImportDoc from './ImportDoc';

interface InputContentProps {
  refresh: () => void;
}

const DocAdd = ({ refresh }: InputContentProps) => {
  const theme = useTheme();
  const [customDocOpen, setCustomDocOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [key, setKey] = useState<ImportDocType>('URL');
  const [docFileKey, setDocFileKey] = useState<1 | 2>(1);

  const ImportContentWays = {
    docFile: {
      label: '创建文件夹',
      onClick: () => {
        setDocFileKey(1);
        setCustomDocOpen(true);
      },
    },
    customDoc: {
      label: '创建文档',
      onClick: () => {
        setDocFileKey(2);
        setCustomDocOpen(true);
      },
    },
    OfflineFile: {
      label: '通过离线文件导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('OfflineFile');
      },
    },
    URL: {
      label: '通过 URL 导入',
      onClick: () => {
        setKey('URL');
        setUrlOpen(true);
      },
    },
    RSS: {
      label: '通过 RSS 导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('RSS');
      },
    },
    Sitemap: {
      label: '通过 Sitemap 导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('Sitemap');
      },
    },
    Notion: {
      label: '通过 Notion 导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('Notion');
      },
    },
    Epub: {
      label: '通过 Epub 导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('Epub');
      },
    },
    'Wiki.js': {
      label: '通过 Wiki.js 导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('Wiki.js');
      },
    },
    Yuque: {
      label: '通过 语雀 导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('Yuque');
      },
    },
    Siyuan: {
      label: '通过 思源笔记 导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('Siyuan');
      },
    },
    MinDoc: {
      label: '通过 MinDoc 导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('MinDoc');
      },
    },
    Feishu: {
      label: '通过飞书文档导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('Feishu');
      },
    },
    Confluence: {
      label: '通过 Confluence 导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('Confluence');
      },
    },
  };

  const close = () => {
    setUrlOpen(false);
    setCustomDocOpen(false);
  };

  return (
    <Box>
      <MenuSelect
        list={Object.entries(ImportContentWays).map(([key, value]) => ({
          key,
          label: (
            <Box key={key}>
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{
                  fontSize: 14,
                  px: 2,
                  lineHeight: '40px',
                  height: 40,
                  width: 180,
                  borderRadius: '5px',
                  cursor: 'pointer',
                  ':hover': {
                    bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1),
                  },
                }}
                onClick={value.onClick}
              >
                {value.label}
              </Stack>
              {key === 'customDoc' && (
                <Box
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: theme.palette.divider,
                    my: 0.5,
                  }}
                />
              )}
            </Box>
          ),
        }))}
        context={<Button variant='contained'>创建文档</Button>}
      />
      <ImportDoc type={key} open={urlOpen} refresh={refresh} onCancel={close} />
      <DocAddByCustomText
        type={docFileKey}
        open={customDocOpen}
        refresh={refresh}
        onClose={() => setCustomDocOpen(false)}
      />
    </Box>
  );
};

export default DocAdd;
