'use client';

import CommentInput, {
  CommentInputRef,
  ImageItem,
} from '@/components/commentInput';
import { IconWenjianjia, IconWenjian } from '@panda-wiki/icons';
import Twemoji from '@/components/emoji/Twemoji';
import FolderList from './folderList';
import { DocWidth } from '@/constant';
import { useStore } from '@/provider';
import {
  getShareV1CommentList,
  postShareV1Comment,
} from '@/request/ShareComment';
import { Editor, UseTiptapReturn } from '@ctzhian/tiptap';
import { message, Image } from '@ctzhian/ui';
import { Box, Button, Divider, Stack, TextField, alpha } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { V1ShareNodeDetailResp } from '@/request/types';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { getImagePath } from '@/utils/getImagePath';
import { useBasePath } from '@/hooks';

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
  info?: V1ShareNodeDetailResp;
  editorRef: UseTiptapReturn;
  commentList?: any[];
  characterCount?: number;
}) => {
  const { mobile = false, authInfo, kbDetail, catalogWidth } = useStore();
  const basePath = useBasePath();
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

      // try {
      //   const Cap = (await import('@cap.js/widget')).default;
      //   const cap = new Cap({
      //     apiEndpoint: `${basePath}/share/v1/captcha/`,
      //   });
      //   const solution = await cap.solve();
      //   token = solution.token;
      // } catch (error) {
      //   message.error('验证失败');
      //   console.log(error, 'error---------');
      //   setCommentLoading(false);
      //   return;
      // }

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
        message.success(
          appDetail?.web_app_comment_settings?.moderation_enable
            ? '评论已提交，请耐心等待审核'
            : '评论成功',
        );
      } catch (error: any) {
        console.log(error.message || '评论发布失败');
      } finally {
        setCommentLoading(false);
      }
    },
  );

  useEffect(() => {
    // window.CAP_CUSTOM_WASM_URL =
    //   window.location.origin + `${basePath}/cap@0.0.6/cap_wasm.min.js`;
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
          <Box sx={{ flexShrink: 0 }}>
            <Twemoji text={info.meta.emoji} size={24} />
          </Box>
        ) : info?.type === 1 ? (
          <IconWenjianjia sx={{ flexShrink: 0, mt: 0.5 }} />
        ) : (
          <IconWenjian sx={{ flexShrink: 0, mt: 0.5 }} />
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
        {(info.pv ?? 0) > 0 && (
          <>
            <Box>·</Box>
            <Box>浏览量 {info.pv}</Box>
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
              ...(docWidth !== 'full' && {
                maxWidth: '100%',
              }),
              ...(mobile && {
                width: '100%',
              }),
            },
          },
        }}
      >
        {info.type === 2 && editorRef.editor && (
          <Editor editor={editorRef.editor} />
        )}
        {info.type === 1 && <FolderList list={info.list} />}
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
                    <Image.PreviewGroup>
                      {(item.pic_urls || []).map((url: string) => (
                        <Image
                          alt={url}
                          src={getImagePath(url, basePath)}
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
                      ))}
                    </Image.PreviewGroup>
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
