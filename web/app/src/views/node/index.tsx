'use client';

import DocFab from '@/components/docFab';
import DocSkeleton from '@/components/docSkeleton';
import ErrorComponent from '@/components/error';
import ScrollToTopFab from '@/components/scrollToTopFab';
import { useBasePath } from '@/hooks/useBasePath';
import { getDocContentSx } from '@/utils/getDocContentSx';
import useCopy from '@/hooks/useCopy';
import { useStore } from '@/provider';
import { ConstsCopySetting } from '@/request/types';
import { TocList, useTiptap } from '@ctzhian/tiptap';
import { Box } from '@mui/material';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import DocAnchor from './DocAnchor';
import DocContent from './DocContent';

const Doc = ({
  node,
  error,
}: {
  node?: any;
  error?: Partial<Error> & { digest?: string } & { code?: number | string };
}) => {
  const { kbDetail, mobile, catalogWidth } = useStore();
  const [loading, setLoading] = useState(true);
  const [headings, setHeadings] = useState<TocList>([]);
  const [characterCount, setCharacterCount] = useState(0);
  const pathname = usePathname();
  const isMarkdown = useMemo(() => {
    return node?.meta?.content_type === 'md';
  }, [node?.meta?.content_type]);
  const baseUrl = useBasePath();
  const editorRef = useTiptap({
    content: node?.content || '',
    editable: false,
    contentType: isMarkdown ? 'markdown' : 'html',
    immediatelyRender: false,
    baseUrl: baseUrl,
    onTocUpdate: (toc: TocList) => {
      setHeadings(toc);
    },
    onBeforeCreate: () => {
      setLoading(true);
    },
    onCreate: ({ editor }) => {
      setLoading(false);
      setCharacterCount((editor.storage as any).characterCount.characters());
    },
  });

  const docWidth = useMemo(() => {
    return kbDetail?.settings?.theme_and_style?.doc_width || 'full';
  }, [kbDetail]);

  useCopy({
    mode:
      kbDetail?.settings?.copy_setting !== ConstsCopySetting.CopySettingDisabled
        ? 'allow'
        : 'disable',
    blockContextMenuWhenDisabled: false,
    suffix:
      kbDetail?.settings?.copy_setting === ConstsCopySetting.CopySettingAppend
        ? `\n\n-----------------------------------------\n内容来自 ${typeof window !== 'undefined' ? window.location.href : ''}`
        : '',
  });

  useEffect(() => {
    if (node && editorRef) {
      requestAnimationFrame(() => {
        editorRef.setContent(
          node?.content || '',
          isMarkdown ? 'markdown' : 'html',
        );
      });
    }
  }, [node]);

  useEffect(() => {
    document.querySelector('#scroll-container')?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <>
      {error ? (
        <Box
          sx={{
            height: '100%',
            ...getDocContentSx({
              docWidth,
              mobile: mobile ?? false,
              catalogWidth: catalogWidth ?? 260,
              variant: 'error',
            }),
          }}
        >
          <ErrorComponent error={error} />
        </Box>
      ) : (
        <>
          {loading ? (
            <Box
              sx={getDocContentSx({
                docWidth,
                mobile: mobile ?? false,
                catalogWidth: catalogWidth ?? 260,
              })}
            >
              <DocSkeleton showSummary={node?.type === 2} />
            </Box>
          ) : (
            <DocContent
              info={node}
              docWidth={docWidth}
              editorRef={editorRef}
              characterCount={characterCount}
            />
          )}
          {!mobile && <DocAnchor headings={headings} />}
          <DocFab />
          {!mobile && <ScrollToTopFab />}
        </>
      )}
    </>
  );
};

export default Doc;
