'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { IconZhinengwenda } from '@panda-wiki/icons';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  Modal,
  Stack,
  lighten,
  alpha,
  useTheme,
} from '@mui/material';
import AiQaContent from './AiQaContent';
import { useStore } from '@/provider';
import {
  getInitialQaAppMode,
  QA_APP_MODE_CHANGE_EVENT,
  type QaAppMode,
} from '@panda-wiki/ui';

interface SearchSuggestion {
  id: string;
  title: string;
  description?: string;
  type?: 'recent' | 'suggestion' | 'trending';
}

interface QaModalProps {
  placeholder?: string;
  initialValue?: string;
  onSearch?: (value?: string, type?: 'search' | 'chat') => void;
  onSearchSuggestions?: (query: string) => Promise<SearchSuggestion[]>;
  defaultSuggestions?: SearchSuggestion[];
}

const QaModal: React.FC<QaModalProps> = () => {
  const theme = useTheme();
  const { qaModalOpen, setQaModalOpen, kbDetail, mobile } = useStore();
  const [qaAppMode, setQaAppMode] = useState<QaAppMode>(() =>
    getInitialQaAppMode(),
  );
  const aiQaInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const qaWorkMode = qaAppMode === 'work';
  const onClose = () => {
    setQaModalOpen?.(false);
  };

  const placeholder = useMemo(() => {
    return (
      kbDetail?.settings?.web_app_custom_style?.header_search_placeholder ||
      '搜索...'
    );
  }, [kbDetail]);

  const hotSearch = useMemo(() => {
    const bannerConfig = kbDetail?.settings?.web_app_landing_configs?.find(
      item => item.type === 'banner',
    );
    return bannerConfig?.banner_config?.hot_search || [];
  }, [kbDetail]);

  // modal打开时自动聚焦
  useEffect(() => {
    if (qaModalOpen) {
      setTimeout(() => {
        aiQaInputRef.current?.querySelector('textarea')?.focus();
      }, 100);
    }
  }, [qaModalOpen]);

  useEffect(() => {
    const cid = searchParams.get('cid');
    const ask = searchParams.get('ask');
    if (cid || ask) {
      setQaModalOpen?.(true);
    }
  }, []);

  useEffect(() => {
    const onModeChange = (e: Event) => {
      const d = (e as CustomEvent<QaAppMode>).detail;
      if (d === 'training' || d === 'work') setQaAppMode(d);
    };
    window.addEventListener(QA_APP_MODE_CHANGE_EVENT, onModeChange);
    return () =>
      window.removeEventListener(QA_APP_MODE_CHANGE_EVENT, onModeChange);
  }, []);

  useEffect(() => {
    if (qaModalOpen) {
      setQaAppMode(getInitialQaAppMode());
    }
  }, [qaModalOpen]);

  return (
    <Modal
      open={qaModalOpen as boolean}
      onClose={onClose}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        p: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          maxWidth: 800,
          maxHeight: '100%',
          borderRadius: '10px',
          overflow: 'hidden',
          outline: 'none',
          pb: 2,
          ...(qaWorkMode
            ? theme.palette.mode === 'light'
              ? {
                  backgroundColor: '#f8fafc',
                  backgroundImage:
                    'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
                  border: '1px solid rgba(148, 163, 184, 0.45)',
                  boxShadow: '0 16px 48px rgba(15, 23, 42, 0.12)',
                }
              : {
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  backgroundImage:
                    'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
                }
            : {
                backgroundColor: lighten(
                  theme.palette.background.default,
                  0.05,
                ),
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              }),
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部标签栏 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            pt: 2,
            pb: 2.5,
          }}
        >
          <Stack
            direction='row'
            alignItems='center'
            gap={1}
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: '10px',
              border: '1px solid',
              borderColor: qaWorkMode
                ? theme.palette.mode === 'light'
                  ? 'rgba(148, 163, 184, 0.55)'
                  : 'rgba(148, 163, 184, 0.22)'
                : alpha(theme.palette.text.primary, 0.1),
            }}
          >
            <IconZhinengwenda sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography
              variant='body2'
              sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1 }}
            >
              智能问答
            </Typography>
            <Typography
              variant='caption'
              sx={theme => ({
                fontSize: 11,
                px: 0.75,
                py: 0.25,
                borderRadius: '4px',
                backgroundColor: alpha(
                  qaWorkMode
                    ? theme.palette.mode === 'light'
                      ? '#0f172a'
                      : '#64748b'
                    : theme.palette.primary.main,
                  0.1,
                ),
                color: qaWorkMode
                  ? theme.palette.mode === 'light'
                    ? '#0f172a'
                    : '#cbd5e1'
                  : 'primary.main',
                fontWeight: 600,
              })}
            >
              {qaWorkMode ? '工作模式' : '培训模式'}
            </Typography>
          </Stack>

          {/* Esc按钮 */}
          {!mobile && (
            <Button
              variant='outlined'
              color='primary'
              onClick={onClose}
              size='small'
              sx={theme => ({
                minWidth: 'auto',
                px: 1,
                py: '1px',
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'none',
                color: 'text.secondary',
                borderColor: qaWorkMode
                  ? theme.palette.mode === 'light'
                    ? 'rgba(148, 163, 184, 0.65)'
                    : 'rgba(148, 163, 184, 0.28)'
                  : alpha(theme.palette.text.primary, 0.1),
              })}
            >
              Esc
            </Button>
          )}
        </Box>

        {/* 主内容区域 - 智能问答 */}
        <Box
          sx={{
            px: 3,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <AiQaContent
            hotSearch={hotSearch}
            placeholder={placeholder}
            inputRef={aiQaInputRef}
            qaWorkMode={qaWorkMode}
          />
        </Box>

        {/* 底部AI生成提示 */}
        <Box
          sx={{
            px: 3,
            pt: !kbDetail?.settings?.conversation_setting
              ?.copyright_hide_enabled
              ? 2
              : 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant='caption'
            sx={{
              color: 'text.disabled',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box>
              {!kbDetail?.settings?.conversation_setting
                ?.copyright_hide_enabled &&
                (kbDetail?.settings?.conversation_setting?.copyright_info ||
                  '本网站由 PandaWiki 提供技术支持')}
            </Box>
          </Typography>
        </Box>
      </Box>
    </Modal>
  );
};

export default QaModal;
