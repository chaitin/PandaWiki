'use client';

import { KBDetail, NodeDetail } from '@/assets/type';
import FeedbackDialog from '@/components/feedbackModal';
import { IconFile, IconFolder } from '@/components/icons';
import TextSelectionTooltip from '@/components/textSelectionTooltip';
import { useTextSelection } from '@/hooks/useTextSelection';
import { useStore } from '@/provider';
import { postShareProV1DocumentFeedback } from '@/request/pro/DocumentFeedback';
import {
  getShareV1CommentList,
  postShareV1Comment,
} from '@/request/ShareComment';
import { base64ToFile } from '@/utils';
import { Box, Button, Divider, Stack, TextField, alpha } from '@mui/material';
import { Editor, UseTiptapReturn } from '@yu-cq/tiptap';
import { message } from 'ct-mui';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

// @ts-ignore
import Cap from '@cap.js/widget';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const DocContent = ({
  info,
  editorRef,
  kbInfo,
  commentList: propsCommentList,
}: {
  info?: NodeDetail;
  editorRef: UseTiptapReturn;
  kbInfo?: KBDetail;
  commentList?: any[];
}) => {
  const { mobile = false, authInfo, kbDetail } = useStore();
  const params = useParams() || {};
  const [commentLoading, setCommentLoading] = useState(false);
  const docId = params.id as string;
  const [commentList, setCommentList] = useState<any[]>(propsCommentList ?? []);
  const [appDetail, setAppDetail] = useState<any>(kbInfo?.settings);
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      content: '',
      name: '',
    },
  });

  const contentInputRef = useRef<HTMLInputElement>(null);
  const [contentFocused, setContentFocused] = useState(false);

  // 反馈弹窗状态
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    selectedText: string;
    screenshot?: string;
  }>({ selectedText: '' });

  // 使用划词功能hook
  const {
    selectedText,
    tooltipAnchor,
    tooltipOpen,
    screenshot,
    isCapturingScreenshot,
    containerRef: docContentRef,
    handleFeedbackSuggestion,
    clearSelection,
  } = useTextSelection({
    onFeedback: (text: string, screenshotData?: string) => {
      // 打开反馈弹窗
      setFeedbackData({
        selectedText: text,
        screenshot: screenshotData,
      });
      setFeedbackDialogOpen(true);
    },
    isEnabled: appDetail?.document_feedback_is_enabled,
  });

  // 关闭反馈弹窗
  const handleFeedbackDialogClose = () => {
    setFeedbackDialogOpen(false);
    setFeedbackData({ selectedText: '' });
    // 清理选择状态
    clearSelection();
  };

  // 提交反馈
  const handleFeedbackSubmit = async (data: {
    correction_suggestion: string;
  }) => {
    return await postShareProV1DocumentFeedback({
      content: feedbackData.selectedText,
      correction_suggestion: data.correction_suggestion,
      node_id: docId,
      image: feedbackData.screenshot
        ? base64ToFile(
          feedbackData.screenshot!,
          `${info?.name || 'screenshot'}.png`,
        )
        : undefined,
    });
  };

  const getComment = async () => {
    const res = await getShareV1CommentList({ id: docId });
    setCommentList(res.data ?? []);
  };

  useEffect(() => {
    if (
      docId &&
      info?.kb_id &&
      appDetail?.web_app_comment_settings?.is_enable
    ) {
      getComment();
    }
  }, [docId, info?.kb_id, appDetail?.web_app_comment_settings?.is_enable]);

  const onSubmit = handleSubmit(
    async (data: { content: string; name: string }) => {
      setCommentLoading(true);
      let token = '';
      // @ts-ignore
      if (kbDetail?.settings?.captcha_settings?.comment_status === 'enable') {
        const cap = new Cap({
          apiEndpoint: '/share/v1/captcha/',
        });
        try {
          const solution = await cap.solve();
          token = solution.token;
        } catch (error) {
          message.error('验证失败');
          console.log(error, 'error---------');
          return;
        }
      }

      await postShareV1Comment({
        content: data.content,
        node_id: docId,
        user_name: data.name,
        captcha_token: token,
      }).then(res => {
        getComment();
        reset();
        message.success('评论成功');
      });
      setCommentLoading(false);
    },
  );

  useEffect(() => {
    // @ts-ignore
    window.CAP_CUSTOM_WASM_URL =
      window.location.origin + '/cap@0.0.6/cap_wasm.min.js';
  }, []);

  if (!editorRef || !info) return null;

  const renderIp = (ip_address: any = {}) => {
    const { city = '', country = '未知', province = '', ip } = ip_address;
    return (
      <>
        <Box>{ip}</Box>
        <Box sx={{ color: 'text.auxiliary', fontSize: 12 }}>
          {country === '中国' ? `${province}-${city}` : `${country}`}
        </Box>
      </>
    );
  };

  return (
    <Box
      id='doc-content'
      ref={docContentRef}
      sx={theme => ({
        width: 'calc(100% - 220px)',
        wordBreak: 'break-all',
        color: 'text.primary',
        px: 10,
        position: 'relative',
        zIndex: 1,
        '& ::selection': {
          backgroundColor: `${alpha(
            theme.palette.primary.main,
            0.2,
          )} !important`,
        },
        ...(mobile && {
          marginTop: 3,
          width: '100%',
          px: 3,
          table: {
            minWidth: 'auto !important',
          },
        }),
      })}
    >
      <Stack
        direction={mobile ? 'column' : 'row'}
        alignItems={mobile ? 'flex-start' : 'center'}
        justifyContent='space-between'
        sx={{
          bgcolor: 'background.paper2',
          p: 3,
          borderRadius: '10px',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction={'row'}
          alignItems={'flex-start'}
          gap={1}
          sx={{
            fontSize: 32,
            lineHeight: '40px',
            fontWeight: '700',
            color: 'text.primary',
          }}
        >
          {info?.meta?.emoji ? (
            <Box sx={{ flexShrink: 0 }}>{info?.meta?.emoji}</Box>
          ) : info?.type === 1 ? (
            <IconFolder sx={{ flexShrink: 0, mt: 0.5 }} />
          ) : (
            <IconFile sx={{ flexShrink: 0, mt: 0.5 }} />
          )}
          {info?.name}
        </Stack>
        <Stack
          direction={mobile ? 'row' : 'column'}
          alignItems={mobile ? 'center' : 'flex-end'}
          gap={1}
          sx={{
            fontSize: 12,
            textAlign: 'right',
            width: 100,
            color: 'text.tertiary',
            flexShrink: 0,
            ...(mobile && {
              width: 'auto',
              mt: 1,
            }),
          }}
        >
          {info?.created_at && (
            <Box>{dayjs(info?.created_at).fromNow()}创建</Box>
          )}
          {info?.updated_at && info.updated_at.slice(0, 1) !== '0' && (
            <Box>{dayjs(info.updated_at).fromNow()}更新</Box>
          )}
        </Stack>
      </Stack>
      <Box
        className='editor-container'
        sx={{
          mt: 3,
          '.tiptap.ProseMirror': {
            color: 'text.primary',
          },
        }}
      >
        {editorRef.editor && <Editor editor={editorRef.editor} />}
      </Box>
      {appDetail?.web_app_comment_settings?.is_enable && (
        <>
          {' '}
          <Divider sx={{ my: 4 }} />
          <Box sx={{ fontWeight: 700, fontSize: 18, mb: 3 }}>评论</Box>
          <Box
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: contentFocused ? 'text.primary' : 'divider',
              borderRadius: 2,
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <Controller
              name='content'
              control={control}
              rules={{
                required: '请输入评论',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  inputRef={contentInputRef}
                  onFocus={e => {
                    setContentFocused(true);
                    // field.onFocus?.(e);
                  }}
                  onBlur={e => {
                    setContentFocused(false);
                    field.onBlur?.();
                  }}
                  placeholder='请输入评论'
                  fullWidth
                  multiline
                  minRows={4}
                  sx={{
                    '.MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                      padding: 0,
                    },

                    '.MuiInputBase-root': {
                      padding: 0,
                    },
                  }}
                  error={!!errors.content}
                  helperText={errors.content?.message}
                />
              )}
            />

            <Divider sx={{ my: 2 }} />
            <Stack
              direction='row-reverse'
              justifyContent='space-between'
              alignItems='center'
              sx={{ fontSize: 14, color: 'text.secondary' }}
            >
              <Button
                variant='contained'
                onClick={onSubmit}
                loading={commentLoading}
              >
                发送
              </Button>
              {!authInfo?.username && (
                <Controller
                  rules={{
                    required: '请输入你的昵称',
                  }}
                  name='name'
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      placeholder='你的昵称'
                      size='small'
                      sx={{
                        '.MuiOutlinedInput-notchedOutline': {
                          border: '1px solid',
                          borderColor: 'var(--mui-palette-divider) !important',
                        },
                      }}
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              )}
            </Stack>
          </Box>
          <Stack gap={1} sx={{ mt: 4 }}>
            {commentList.map((item, index) => (
              <React.Fragment key={item.id}>
                <Stack gap={1}>
                  <Box sx={{ fontSize: 14, fontWeight: 700 }}>
                    {item.info.user_name}
                  </Box>
                  <Box sx={{ fontSize: 14 }}>{item.content}</Box>
                  <Stack
                    direction='row'
                    justifyContent='flex-end'
                    alignItems='center'
                    gap={2}
                    sx={{
                      color: 'text.tertiary',
                      fontSize: 12,
                    }}
                  >
                    {renderIp(item.ip_address)}
                    <Box>{dayjs(item.created_at).fromNow()}</Box>
                  </Stack>
                </Stack>
                <Divider sx={{ my: 3, color: 'text.tertiary', fontSize: 14 }}>
                  {index !== commentList.length - 1 ? '' : '没有更多了'}
                </Divider>
              </React.Fragment>
            ))}
          </Stack>
        </>
      )}

      {/* 划词提示tooltip */}
      <TextSelectionTooltip
        open={tooltipOpen}
        selectedText={selectedText}
        anchorPosition={tooltipAnchor}
        onFeedbackClick={handleFeedbackSuggestion}
        isCapturingScreenshot={isCapturingScreenshot}
      />

      {/* 反馈弹窗 */}
      <FeedbackDialog
        open={feedbackDialogOpen}
        onClose={handleFeedbackDialogClose}
        selectedText={feedbackData.selectedText}
        screenshot={feedbackData.screenshot}
        onSubmit={handleFeedbackSubmit}
      />
    </Box>
  );
};

export default DocContent;
