'use client';
import { WidgetInfo } from '@/assets/type';
import { useStore } from '@/provider';
import {
  alpha,
  Box,
  Button,
  lighten,
  Stack,
  styled,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { IconJinsousuo, IconZhinengwenda } from '@panda-wiki/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import AiQaContent from './AiQaContent';
import SearchDocContent from './SearchDocContent';

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

const Widget = () => {
  const { widget, mobile } = useStore();

  const defaultSearchMode = useMemo(() => {
    return widget?.settings?.widget_bot_settings?.search_mode || 'all';
  }, [widget]);

  const [searchMode, setSearchMode] = useState<
    WidgetInfo['settings']['widget_bot_settings']['search_mode']
  >(defaultSearchMode !== 'doc' ? 'qa' : 'doc');
  const inputRef = useRef<HTMLInputElement>(null);
  const aiQaInputRef = useRef<HTMLInputElement>(null);

  const placeholder = useMemo(() => {
    return widget?.settings?.widget_bot_settings?.placeholder || '搜索...';
  }, [widget]);

  const hotSearch = useMemo(() => {
    return widget?.settings?.widget_bot_settings?.recommend_questions || [];
  }, [widget]);

  // modal打开时自动聚焦
  useEffect(() => {
    setTimeout(() => {
      if (searchMode === 'qa') {
        aiQaInputRef.current?.querySelector('textarea')?.focus();
      } else {
        inputRef.current?.querySelector('input')?.focus();
      }
    }, 100);
  }, [searchMode]);

  return (
    <Box
      sx={(theme: import('@mui/material/styles').Theme) => ({
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        maxWidth: '100vw',
        height: '100vh',
        backgroundColor: lighten(theme.palette.background.default, 0.05),
        borderRadius: '10px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        overflow: 'hidden',
        outline: 'none',
        pb: 2,
      })}
      onClick={e => e.stopPropagation()}
    >
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
        {defaultSearchMode === 'all' ? (
          <StyledTabs
            value={searchMode}
            onChange={(_, value) => {
              setSearchMode(value as 'qa' | 'doc');
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
              value='qa'
            />
            <StyledTab
              label={
                <Stack direction='row' gap={0.5} alignItems='center'>
                  <IconJinsousuo sx={{ fontSize: 16 }} />
                  {!mobile && <span>仅搜索文档</span>}
                </Stack>
              }
              value='doc'
            />
          </StyledTabs>
        ) : (
          <Box></Box>
        )}
        <Button
          variant='outlined'
          color='primary'
          size='small'
          sx={(theme: import('@mui/material/styles').Theme) => ({
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
      </Box>
      <Box
        sx={{
          px: 3,
          flex: 1,
          display: searchMode === 'qa' ? 'flex' : 'none',
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
          display: searchMode === 'doc' ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        <SearchDocContent inputRef={inputRef} placeholder={placeholder} />
      </Box>
      {!widget?.settings?.widget_bot_settings?.copyright_hide_enabled && (
        <Box
          sx={{
            px: 3,
            pt: 2,
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
              {widget?.settings?.widget_bot_settings?.copyright_info ||
                '本网站由 PandaWiki 提供技术支持'}
            </Box>
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Widget;
