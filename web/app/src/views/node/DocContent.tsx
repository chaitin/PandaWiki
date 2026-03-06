'use client';

import CommentInput, {
  CommentInputRef,
  ImageItem,
} from '@/components/commentInput';
import { DocWidth } from '@/constant';
import { useBasePath } from '@/hooks';
import { getDocContentSx } from '@/utils/getDocContentSx';
import { useStore } from '@/provider';
import {
  getShareV1CommentList,
  postShareV1Comment,
} from '@/request/ShareComment';
import { ConstsCopySetting, V1ShareNodeDetailResp } from '@/request/types';
import { copyText, findAdjacentDocuments } from '@/utils';
import { Editor, UseTiptapReturn } from '@ctzhian/tiptap';
import { message } from '@ctzhian/ui';
import { Box, alpha } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import FolderList from './folderList';
import AdjacentDocNav from './components/AdjacentDocNav';
import DocMetaInfo from './components/DocMetaInfo';
import CommentSection from './components/CommentSection';

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
  const { mobile = false, authInfo, kbDetail, catalogWidth, tree } = useStore();
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
    defaultValues: { content: '', name: '' },
  });

  const commentInputRef = useRef<CommentInputRef>(null);
  const [contentFocused, setContentFocused] = useState(false);
  const [commentImages, setCommentImages] = useState<ImageItem[]>([]);

  const adjacentDocs = useMemo(() => {
    if (!tree || !docId || info?.type !== 2) return undefined;
    return findAdjacentDocuments(tree, docId);
  }, [tree, docId, info?.type]);

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
        const cap = new Cap({ apiEndpoint: `${basePath}/share/v1/captcha/` });
        const solution = await cap.solve();
        token = solution.token;
      } catch (error) {
        message.error('验证失败');
        setCommentLoading(false);
        return;
      }
      try {
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
    window.CAP_CUSTOM_WASM_URL =
      window.location.origin + `${basePath}/cap@0.0.6/cap_wasm.min.js`;
  }, [basePath]);

  if (!editorRef || !info) return null;

  const onCopyDocMd = () => {
    let context = editorRef.getMarkdown() || '';
    if (
      kbDetail?.settings?.copy_setting === ConstsCopySetting.CopySettingAppend
    ) {
      context += `\n\n-----------------------------------------\n内容来自 ${typeof window !== 'undefined' ? window.location.href : ''}`;
    }
    copyText(context);
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
          backgroundColor: `${alpha(theme.palette.primary.main, 0.2)} !important`,
        },
        ...(getDocContentSx({
          docWidth: docWidth || 'full',
          mobile,
          catalogWidth: catalogWidth ?? 260,
        }) as Record<string, unknown>),
      })}
    >
      <DocMetaInfo
        info={info}
        characterCount={characterCount}
        kbDetailCopySetting={kbDetail?.settings?.copy_setting}
        onCopyDocMd={onCopyDocMd}
      />

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
              ...(docWidth !== 'full' && { maxWidth: '100%' }),
              ...(mobile && { width: '100%' }),
            },
          },
        }}
      >
        {info.type === 2 && editorRef.editor && (
          <Editor editor={editorRef.editor} />
        )}
        {info.type === 1 && <FolderList list={info.list} />}
      </Box>

      {adjacentDocs && (adjacentDocs.prev || adjacentDocs.next) && (
        <AdjacentDocNav
          prev={adjacentDocs.prev}
          next={adjacentDocs.next}
          basePath={basePath}
          hasCommentSection={appDetail?.web_app_comment_settings?.is_enable}
        />
      )}

      {appDetail?.web_app_comment_settings?.is_enable && (
        <CommentSection
          commentList={commentList}
          contentFocused={contentFocused}
          control={control}
          errors={errors}
          onSubmit={onSubmit}
          commentLoading={commentLoading}
          commentInputRef={commentInputRef}
          commentImages={commentImages}
          onContentFocus={() => setContentFocused(true)}
          onContentBlur={() => setContentFocused(false)}
          onImagesChange={setCommentImages}
          basePath={basePath}
          showNameInput={!authInfo?.username}
        />
      )}
    </Box>
  );
};

export default DocContent;
