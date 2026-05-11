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
  WORK_MODE_CHROME,
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
            ? {
                backgroundColor: WORK_MODE_CHROME.panel,
                backgroundImage:
                  'linear-gradient(165deg, #1a1610 0%, #0a0a0a 42%, #0f0e0c 100%)',
                border: `1px solid ${WORK_MODE_CHROME.borderGold}`,
                boxShadow:
                  '0 24px 64px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(212, 175, 55, 0.08)',
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
                ? WORK_MODE_CHROME.borderGold
                : alpha(theme.palette.text.primary, 0.1),
              ...(qaWorkMode && {
                backgroundColor: alpha(WORK_MODE_CHROME.gold, 0.06),
              }),
            }}
          >
            <IconZhinengwenda
              sx={{
                fontSize: 16,
                color: qaWorkMode ? WORK_MODE_CHROME.gold : 'primary.main',
              }}
            />
            <Typography
              variant='body2'
              sx={{
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1,
                color: qaWorkMode ? WORK_MODE_CHROME.text : 'text.primary',
              }}
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
                border: qaWorkMode
                  ? `1px solid ${WORK_MODE_CHROME.borderGoldDim}`
                  : 'none',
                backgroundColor: alpha(
                  qaWorkMode
                    ? WORK_MODE_CHROME.gold
                    : theme.palette.primary.main,
                  qaWorkMode ? 0.18 : 0.1,
                ),
                color: qaWorkMode
                  ? WORK_MODE_CHROME.goldBright
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
                borderColor: qaWorkMode
                  ? WORK_MODE_CHROME.borderGold
                  : alpha(theme.palette.text.primary, 0.1),
                color: qaWorkMode ? WORK_MODE_CHROME.gold : 'text.secondary',
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
              color: qaWorkMode
                ? alpha(WORK_MODE_CHROME.text, 0.38)
                : 'text.disabled',
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
