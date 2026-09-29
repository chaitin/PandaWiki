'use client';
import { postShareProV1ContributeSubmit } from '@/request/pro/ShareContribute';
import { V1NodeDetailResp } from '@/request/types';
import { message } from '@ctzhian/ui';
import { Box, Stack, useMediaQuery } from '@mui/material';
import { useParams } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import Edit from './edit';

export interface WrapContext {
  catalogOpen: boolean;
  setCatalogOpen: (open: boolean) => void;
  nodeDetail: V1NodeDetailResp | null;
  setNodeDetail: (detail: V1NodeDetailResp) => void;
  onSave: (
    content: string,
    reason: string,
    token: string,
    contentType?: 'html' | 'md',
  ) => void;
  saveLoading: boolean;
}

const WrapContext = createContext<WrapContext | undefined>(undefined);

export const useWrapContext = () => {
  const context = useContext(WrapContext);
  if (!context) {
    throw new Error('useWrapContext must be used within a WrapContextProvider');
  }
  return context;
};

const DocEditor = () => {
  const { id } = useParams();
  const isWideScreen = useMediaQuery('(min-width:1400px)');
  const [saveLoading, setSaveLoading] = useState(false);
  const [nodeDetail, setNodeDetail] = useState<V1NodeDetailResp | null>(
    id
      ? null
      : {
          name: '',
          content: '',
        },
  );
  const [catalogOpen, setCatalogOpen] = useState(true);

  const onSave = (
    content: string,
    reason: string,
    token: string,
    contentType?: 'html' | 'md',
  ) => {
    setSaveLoading(true);
    return postShareProV1ContributeSubmit({
      node_id: id ? id[0] : undefined,
      name: nodeDetail!.name,
      content,
      type: id ? 'edit' : 'add',
      reason,
      emoji: nodeDetail?.meta?.emoji,
      captcha_token: token,
      content_type: contentType || 'html',
    }).then(() => {
      message.success('保存成功, 即将关闭页面');
      setTimeout(() => {
        setSaveLoading(false);
        try {
          // 优先尝试直接关闭当前窗口
          window.close();
          // 若浏览器阻止关闭，则尽量离开当前页
          setTimeout(() => {
            // 仍未关闭时，尝试回退；若无历史则跳首页
            if (history.length > 1) {
              history.back();
            } else {
              // 某些浏览器可通过替换为 _self 再关闭
              try {
                window.open('', '_self');
                window.close();
              } catch (e) { console.warn("[PandaWiki] Editor error:", e); }
              // 最终兜底：跳转到首页
              setTimeout(() => {
                if (!document.hidden) {
                  window.location.href = '/';
                }
              }, 50);
            }
          }, 0);
        } catch (e) { console.warn("[PandaWiki] Editor error:", e); }
      }, 3000);
    });
  };

  useEffect(() => {
    setCatalogOpen(isWideScreen);
  }, [isWideScreen]);

  return (
    <Stack
      direction='row'
      sx={{ color: 'text.primary', bgcolor: 'background.default' }}
    >
      <Box sx={{ flexGrow: 1 }}>
        <WrapContext.Provider
          value={{
            catalogOpen,
            setCatalogOpen,
            nodeDetail,
            setNodeDetail,
            onSave,
            saveLoading,
          }}
        >
          <Edit />
        </WrapContext.Provider>
      </Box>
    </Stack>
  );
};

export default DocEditor;
