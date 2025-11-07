'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { IconZhinengwenda, IconJinsousuo } from '@panda-wiki/icons';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  Modal,
  Stack,
  lighten,
  alpha,
  styled,
  Tabs,
  Tab,
} from '@mui/material';
import AiQaContent from './AiQaContent';
import SearchDocContent from './SearchDocContent';
import { useStore } from '@/provider';

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

const StyledTabs = styled(Tabs)(({ theme }) => ({
  minHeight: 'auto',
  position: 'relative',
  borderRadius: '10px',
  padding: theme.spacing(0.5),
  border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
  '& .MuiTabs-indicator': {
    height: '100%',
    borderRadius: '8px',
    backgroundColor: theme.palette.primary.main,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 0,
  },
  '& .MuiTabs-flexContainer': {
    gap: theme.spacing(0.5),
    position: 'relative',
    zIndex: 1,
  },
}));

// 样式化的 Tab 组件 - 白色背景，圆角，深灰色文字
const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: 'auto',
  padding: theme.spacing(0.75, 2),
  borderRadius: '6px',
  backgroundColor: 'transparent',
  fontSize: 12,
  fontWeight: 400,
  textTransform: 'none',
  transition: 'color 0.3s ease-in-out',
  position: 'relative',
  zIndex: 1,
  lineHeight: 1,
  '&:hover': {
    color: theme.palette.text.primary,
  },
  '&.Mui-selected': {
    color: theme.palette.primary.contrastText,
    fontWeight: 500,
  },
}));

const QaModal: React.FC<QaModalProps> = () => {
  const { qaModalOpen, setQaModalOpen, kbDetail, mobile } = useStore();
  const [searchMode, setSearchMode] = useState<'chat' | 'search'>('chat');
  const inputRef = useRef<HTMLInputElement>(null);
  const aiQaInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
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
        if (searchMode === 'chat') {
          aiQaInputRef.current?.querySelector('textarea')?.focus();
        } else {
          inputRef.current?.querySelector('input')?.focus();
        }
      }, 100);
    }
  }, [qaModalOpen, searchMode]);

  useEffect(() => {
    if (!qaModalOpen) {
      setTimeout(() => {
        setSearchMode('chat');
      }, 300);
    }
  }, [qaModalOpen]);

  useEffect(() => {
    const cid = searchParams.get('cid');
    const ask = searchParams.get('ask');
    if (cid || ask) {
      setQaModalOpen?.(true);
    }
  }, []);

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
        sx={theme => ({
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          maxWidth: 800,
          maxHeight: '100%',
          backgroundColor: lighten(theme.palette.background.default, 0.05),
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          overflow: 'hidden',
          outline: 'none',
          pb: 2,
        })}
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
          <StyledTabs
            value={searchMode}
            onChange={(_, value) => {
              setSearchMode(value as 'chat' | 'search');
            }}
            variant='scrollable'
            scrollButtons={false}
          >
            <StyledTab
              label={
                <Stack direction='row' gap={0.5} alignItems='center'>
                  <IconZhinengwenda sx={{ fontSize: 16 }} />
                  {!mobile && <span>智能问答</span>}
                </Stack>
              }
              value='chat'
            />
            <StyledTab
              label={
                <Stack direction='row' gap={0.5} alignItems='center'>
                  <IconJinsousuo sx={{ fontSize: 16 }} />
                  {!mobile && <span>仅搜索文档</span>}
                </Stack>
              }
              value='search'
            />
          </StyledTabs>

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
                borderColor: alpha(theme.palette.text.primary, 0.1),
              })}
            >
              Esc
            </Button>
          )}
        </Box>

        {/* 主内容区域 - 根据模式切换 */}
        <Box
          sx={{
            px: 3,
            flex: 1,
            display: searchMode === 'chat' ? 'flex' : 'none',
            flexDirection: 'column',
          }}
        >
          <AiQaContent
            hotSearch={hotSearch}
            placeholder={placeholder}
            inputRef={aiQaInputRef}
          />
        </Box>
        <Box
          sx={{
            px: 3,
            flex: 1,
            display: searchMode === 'search' ? 'flex' : 'none',
            flexDirection: 'column',
          }}
        >
          <SearchDocContent inputRef={inputRef} placeholder={placeholder} />
        </Box>

        {/* 底部AI生成提示 */}
        <Box
          sx={{
            px: 3,
            pt: kbDetail?.settings?.disclaimer_settings?.content ? 2 : 0,
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
            <Box>{kbDetail?.settings?.disclaimer_settings?.content}</Box>
          </Typography>
        </Box>
      </Box>
    </Modal>
  );
};

export default QaModal;
