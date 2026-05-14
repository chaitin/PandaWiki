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
  Switch,
  lighten,
  alpha,
  useTheme,
  ThemeProvider,
} from '@mui/material';
import AiQaContent from './AiQaContent';
import { useStore } from '@/provider';
import {
  buildWorkModeTheme,
  getInitialQaAppMode,
  persistQaAppMode,
  QA_APP_MODE_CHANGE_EVENT,
  WORK_MODE_PALETTE,
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
  const workModeTheme = useMemo(
    () => (qaWorkMode ? buildWorkModeTheme(theme) : null),
    [qaWorkMode, theme],
  );
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
      {(() => {
        const modalBox = (
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
                    backgroundColor: WORK_MODE_PALETTE.bgDeep,
                    // 顶部一抹橙红高光 + 自上而下的暖白渐变，体现"淘宝橙"主色
                    backgroundImage: `radial-gradient(120% 80% at 50% -10%, rgba(255, 68, 0, 0.12) 0%, rgba(255, 68, 0, 0) 55%), linear-gradient(180deg, ${WORK_MODE_PALETTE.bgMid} 0%, ${WORK_MODE_PALETTE.bgDeep} 60%, #ffebe0 100%)`,
                    border: `1px solid ${WORK_MODE_PALETTE.borderStrong}`,
                    boxShadow: WORK_MODE_PALETTE.shadow,
                    color: WORK_MODE_PALETTE.textPrimary,
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
                    ? WORK_MODE_PALETTE.borderStrong
                    : alpha(theme.palette.text.primary, 0.1),
                  backgroundColor: qaWorkMode
                    ? WORK_MODE_PALETTE.bgRaised
                    : 'transparent',
                }}
              >
                <IconZhinengwenda
                  sx={{
                    fontSize: 16,
                    color: qaWorkMode
                      ? WORK_MODE_PALETTE.accentPrimary
                      : 'primary.main',
                  }}
                />
                <Typography
                  variant='body2'
                  sx={{
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1,
                    mr: 0.5,
                    color: qaWorkMode
                      ? WORK_MODE_PALETTE.textPrimary
                      : 'inherit',
                    letterSpacing: qaWorkMode ? '0.02em' : 'normal',
                  }}
                >
                  智能问答
                </Typography>
                <Stack
                  direction='row'
                  alignItems='center'
                  spacing={0.5}
                  sx={{
                    pl: 1,
                    ml: 0.5,
                    borderLeft: '1px solid',
                    borderColor: qaWorkMode
                      ? WORK_MODE_PALETTE.borderSoft
                      : alpha(theme.palette.text.primary, 0.12),
                  }}
                >
                  <Typography
                    variant='body2'
                    sx={{
                      fontSize: 12,
                      fontWeight: !qaWorkMode ? 600 : 400,
                      color: qaWorkMode
                        ? WORK_MODE_PALETTE.textMuted
                        : 'primary.main',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={() => {
                      setQaAppMode('training');
                      persistQaAppMode('training');
                    }}
                  >
                    培训模式
                  </Typography>
                  <Switch
                    size='small'
                    checked={qaWorkMode}
                    onChange={(_, checked) => {
                      const m: QaAppMode = checked ? 'work' : 'training';
                      setQaAppMode(m);
                      persistQaAppMode(m);
                    }}
                    inputProps={{ 'aria-label': '培训模式与工作模式切换' }}
                    sx={
                      qaWorkMode
                        ? {
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: WORK_MODE_PALETTE.accentBright,
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                              {
                                backgroundColor:
                                  WORK_MODE_PALETTE.accentPrimary,
                                opacity: 0.65,
                              },
                            '& .MuiSwitch-track': {
                              backgroundColor: WORK_MODE_PALETTE.switchTrack,
                            },
                          }
                        : undefined
                    }
                  />
                  <Typography
                    variant='body2'
                    sx={{
                      fontSize: 12,
                      fontWeight: qaWorkMode ? 600 : 400,
                      color: qaWorkMode
                        ? WORK_MODE_PALETTE.accentPrimary
                        : 'text.secondary',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      userSelect: 'none',
                      letterSpacing: qaWorkMode ? '0.04em' : 'normal',
                    }}
                    onClick={() => {
                      setQaAppMode('work');
                      persistQaAppMode('work');
                    }}
                  >
                    工作模式
                  </Typography>
                </Stack>
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
                    color: qaWorkMode
                      ? WORK_MODE_PALETTE.textSecondary
                      : 'text.secondary',
                    borderColor: qaWorkMode
                      ? WORK_MODE_PALETTE.borderStrong
                      : alpha(theme.palette.text.primary, 0.1),
                    backgroundColor: qaWorkMode
                      ? WORK_MODE_PALETTE.bgRaised
                      : 'transparent',
                    '&:hover': qaWorkMode
                      ? {
                          backgroundColor: 'rgba(255, 68, 0, 0.08)',
                          borderColor: WORK_MODE_PALETTE.accentPrimary,
                          color: WORK_MODE_PALETTE.accentPrimary,
                        }
                      : undefined,
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
                    ? WORK_MODE_PALETTE.textMuted
                    : 'text.disabled',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  letterSpacing: qaWorkMode ? '0.04em' : 'normal',
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
        );
        return workModeTheme ? (
          <ThemeProvider theme={workModeTheme}>{modalBox}</ThemeProvider>
        ) : (
          modalBox
        );
      })()}
    </Modal>
  );
};

export default QaModal;
