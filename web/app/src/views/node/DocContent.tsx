'use client';

import { NodeDetail } from '@/assets/type';
import CommentInput, {
  CommentInputRef,
  ImageItem,
} from '@/components/commentInput';
import { IconFile, IconFolder } from '@/components/icons';
import { DocWidth } from '@/constant';
import { useStore } from '@/provider';
import {
  getShareV1CommentList,
  postShareV1Comment,
} from '@/request/ShareComment';
import { Editor, UseTiptapReturn } from '@ctzhian/tiptap';
import { message } from '@ctzhian/ui';
import { Box, Button, Divider, Stack, TextField, alpha } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { PhotoProvider, PhotoView } from 'react-photo-view';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const DocContent = ({
  info,
  docWidth,
  editorRef,
  commentList: propsCommentList,
  characterCount,
}: {
  docWidth?: string;
  info?: NodeDetail;
  editorRef: UseTiptapReturn;
  commentList?: any[];
  characterCount?: number;
}) => {
  const { mobile = false, authInfo, kbDetail, catalogWidth } = useStore();

  const params = useParams() || {};
  const [commentLoading, setCommentLoading] = useState(false);
  const docId = params.id as string;
  const [commentList, setCommentList] = useState<any[]>(propsCommentList ?? []);
  const [appDetail, setAppDetail] = useState<any>(kbDetail?.settings);
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

  const commentInputRef = useRef<CommentInputRef>(null);
  const [contentFocused, setContentFocused] = useState(false);
  const [commentImages, setCommentImages] = useState<ImageItem[]>([]);

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

      try {
        const Cap = (await import('@cap.js/widget')).default;
        const cap = new Cap({
          apiEndpoint: '/share/v1/captcha/',
        });
        const solution = await cap.solve();
        token = solution.token;
      } catch (error) {
        message.error('验证失败');
        console.log(error, 'error---------');
        setCommentLoading(false);
        return;
      }

      try {
        // 先上传所有图片
        let imageUrls: string[] = [];
        if (commentImages.length > 0 && commentInputRef.current) {
          imageUrls = await commentInputRef.current.uploadImages();
        }

        await postShareV1Comment({
          content: data.content,
          pic_urls: imageUrls,
          node_id: docId,
          user_name: data.name,
          captcha_token: token,
        });

        getComment();
        reset();
        commentInputRef.current?.clearImages();
        setCommentImages([]);
        message.success('评论成功');
      } catch (error: any) {
        console.log(error.message || '评论发布失败');
      } finally {
        setCommentLoading(false);
      }
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
        <Box sx={{ color: 'text.tertiary', fontSize: 12 }}>
          {country === '中国' ? `${province}-${city}` : `${country}`}
        </Box>
      </>
    );
  };

  return (
    <Box
      id='doc-content'
      sx={theme => ({
        wordBreak: 'break-all',
        color: 'text.primary',
        position: 'relative',
        zIndex: 1,
        '& ::selection': {
          backgroundColor: `${alpha(
            theme.palette.primary.main,
            0.2,
          )} !important`,
        },
        ...(docWidth === 'full' &&
          !mobile && {
            flexGrow: 1,
            width: 0,
          }),
        ...(docWidth !== 'full' &&
          !mobile && {
            width: DocWidth[docWidth as keyof typeof DocWidth].value,
            maxWidth: `calc(100% - ${catalogWidth}px - 240px - 192px)`,
          }),
        ...(mobile && {
          mx: 'auto',
          marginTop: 3,
          width: '100%',
          px: 3,
        }),
      })}
    >
      <Stack
        direction={'row'}
        alignItems={'flex-start'}
        gap={1}
        sx={{
          fontSize: 30,
          lineHeight: '36px',
          fontWeight: 'bold',
          color: 'text.primary',
          mb: '10px',
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
        direction='row'
        alignItems='center'
        gap={1}
        sx={{
          fontSize: 14,
          mb: 4,
          color: 'text.tertiary',
        }}
      >
        {info?.created_at && (
          <Box>
            {info?.creator_account && info?.creator_account === 'admin'
              ? '管理员'
              : info?.creator_account}{' '}
            {dayjs(info?.created_at).fromNow()}创建
          </Box>
        )}
        {info?.updated_at && info.updated_at.slice(0, 1) !== '0' && (
          <>
            <Box>·</Box>
            <Box>
              {info?.editor_account && info?.editor_account === 'admin'
                ? '管理员'
                : info?.editor_account}{' '}
              {dayjs(info.updated_at).fromNow()}更新
            </Box>
          </>
        )}
        {!!characterCount && characterCount > 0 && (
          <>
            <Box>·</Box>
            <Box>{characterCount} 字</Box>
          </>
        )}
      </Stack>
      {info?.meta?.summary && (
        <Box
          sx={{
            mb: 6,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            bgcolor: 'background.paper3',
            p: '20px',
            fontSize: 14,
            lineHeight: '28px',
            backdropFilter: 'blur(5px)',
          }}
        >
          <Box sx={{ fontWeight: 'bold', mb: 2, lineHeight: '22px' }}>
            内容摘要
          </Box>
          <Box>{info?.meta?.summary}</Box>
        </Box>
      )}
      <Box
        className='editor-container'
        sx={{
          mt: 6,
          '.tiptap.ProseMirror': {
            '.tableWrapper': {
              width:
                docWidth === 'full'
                  ? '100%'
                  : DocWidth[docWidth as keyof typeof DocWidth].value,
              overflowX: 'auto',
              ...(mobile && {
                width: '100%',
              }),
            },
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
                <CommentInput
                  value={field.value}
                  onChange={field.onChange}
                  onImagesChange={setCommentImages}
                  ref={commentInputRef}
                  onFocus={() => {
                    setContentFocused(true);
                  }}
                  onBlur={() => {
                    setContentFocused(false);
                    field.onBlur?.();
                  }}
                  placeholder='请输入评论'
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
                  <Stack direction='row' gap={1}>
                    <PhotoProvider
                      maskOpacity={0.3}
                      toolbarRender={({ rotate, onRotate, onScale, scale }) => {
                        return (
                          <>
                            <svg
                              className='PhotoView-Slider__toolbarIcon'
                              width='44'
                              height='44'
                              viewBox='0 0 768 768'
                              fill='white'
                              onClick={() => onScale(scale + 0.2)}
                            >
                              <path d='M384 640.5q105 0 180.75-75.75t75.75-180.75-75.75-180.75-180.75-75.75-180.75 75.75-75.75 180.75 75.75 180.75 180.75 75.75zM384 64.5q132 0 225.75 93.75t93.75 225.75-93.75 225.75-225.75 93.75-225.75-93.75-93.75-225.75 93.75-225.75 225.75-93.75zM415.5 223.5v129h129v63h-129v129h-63v-129h-129v-63h129v-129h63z' />
                            </svg>
                            <svg
                              className='PhotoView-Slider__toolbarIcon'
                              width='44'
                              height='44'
                              viewBox='0 0 768 768'
                              fill='white'
                              onClick={() => onScale(scale - 0.2)}
                            >
                              <path d='M384 640.5q105 0 180.75-75.75t75.75-180.75-75.75-180.75-180.75-75.75-180.75 75.75-75.75 180.75 75.75 180.75 180.75 75.75zM384 64.5q132 0 225.75 93.75t93.75 225.75-93.75 225.75-225.75 93.75-225.75-93.75-93.75-225.75 93.75-225.75 225.75-93.75zM223.5 352.5h321v63h-321v-63z' />
                            </svg>
                            <svg
                              className='PhotoView-Slider__toolbarIcon'
                              onClick={() => onRotate(rotate + 90)}
                              width='44'
                              height='44'
                              fill='white'
                              viewBox='0 0 768 768'
                            >
                              <path d='M565.5 202.5l75-75v225h-225l103.5-103.5c-34.5-34.5-82.5-57-135-57-106.5 0-192 85.5-192 192s85.5 192 192 192c84 0 156-52.5 181.5-127.5h66c-28.5 111-127.5 192-247.5 192-141 0-255-115.5-255-256.5s114-256.5 255-256.5c70.5 0 135 28.5 181.5 75z' />
                            </svg>
                          </>
                        );
                      }}
                    >
                      {(item.pic_urls || []).map((url: string) => (
                        <PhotoView key={url} src={url}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={url}
                            src={url}
                            width={80}
                            height={80}
                            style={{
                              borderRadius: '4px',
                              objectFit: 'cover',
                              boxShadow: '0px 0px 3px 1px rgba(0,0,5,0.15)',
                              cursor: 'pointer',
                            }}
                            referrerPolicy='no-referrer'
                          />
                        </PhotoView>
                      ))}
                    </PhotoProvider>
                  </Stack>
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
    </Box>
  );
};

export default DocContent;
