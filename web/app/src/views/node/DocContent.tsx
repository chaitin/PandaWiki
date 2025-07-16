'use client';

import { NodeDetail } from '@/assets/type';
import { IconFile, IconFolder } from '@/components/icons';
import { useStore } from '@/provider';
import { Box, Stack, Button, Divider, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { TiptapReader, UseTiptapEditorReturn } from 'ct-tiptap-editor';
import { message } from 'ct-mui';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import { apiClient } from '@/api';
import React, { useEffect, useState } from 'react';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const DocContent = ({
  info,
  editorRef,
  docId,
}: {
  info?: NodeDetail;
  editorRef: UseTiptapEditorReturn;
  docId: string;
}) => {
  const { mobile = false, kbDetail, catalogShow } = useStore();
  const [commentList, setCommentList] = useState<any[]>([]);
  const [appDetail, setAppDetail] = useState<any>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      content: '',
      name: '',
    },
  });

  const getComment = async () => {
    const res = await apiClient.clientGetComment(docId, info?.kb_id ?? '');
    if (res.success) {
      setCommentList(res.data?.Comments ?? []);
    } else {
      message.error(res.message || '获取评论失败');
    }
  };

  const getAppDetail = async () => {
    const res = await apiClient.serverGetKBInfo(info?.kb_id ?? '');
    if (res.success) {
      setAppDetail(res.data?.settings);
    } else {
      message.error(res.message || '获取应用详情失败');
    }
  };

  useEffect(() => {
    if (info?.kb_id) {
      getAppDetail();
    }
  }, [info]);

  useEffect(() => {
    if (
      docId &&
      info?.kb_id &&
      appDetail?.web_app_comment_settings?.is_enable
    ) {
      getComment();
    }
  }, [docId, info, appDetail]);

  const onSubmit = handleSubmit(
    async (data: { content: string; name: string }) => {
      const res = await apiClient.clientPostComment({
        content: data.content,
        node_id: docId,
        user_name: data.name,
        kb_id: info?.kb_id ?? '',
      });
      if (res.success) {
        getComment();
        message.success('评论成功');
      }
    }
  );
  if (!editorRef || !info) return null;

  const catalogSetting = kbDetail?.settings?.catalog_settings;

  return (
    <Box
      sx={{
        width: `calc(100% - ${
          catalogShow ? catalogSetting?.catalog_width ?? 260 : 16
        }px - 225px)`,
        ml: catalogShow ? `${catalogSetting?.catalog_width ?? 260}px` : '16px',
        wordBreak: 'break-all',
        color: 'text.primary',
        px: 10,
        position: 'relative',
        zIndex: 1,
        ...(mobile && {
          width: '100%',
          marginLeft: 0,
          marginTop: '77px',
          px: 3,
          table: {
            minWidth: 'auto !important',
          },
        }),
      }}
    >
      <Stack
        direction={mobile ? 'column' : 'row'}
        alignItems={mobile ? 'flex-start' : 'center'}
        justifyContent='space-between'
        sx={{
          bgcolor: 'background.paper',
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
          '.editor-table': {
            width: 'auto',
            maxWidth: '100%',
          },
        }}
      >
        <TiptapReader editorRef={editorRef} />
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
              borderColor: 'divider',
              borderRadius: 2,
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
              direction='row'
              justifyContent='space-between'
              alignItems='center'
              sx={{ fontSize: 14, color: 'text.secondary' }}
            >
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
              <Button variant='contained' onClick={onSubmit}>
                发送
              </Button>
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
    </Box>
  );
};

export default DocContent;
