'use client'

import { NodeDetail } from "@/assets/type";
import { IconFile, IconFolder } from "@/components/icons";
import { useStore } from "@/provider";
import { Box, Stack } from "@mui/material";
import { TiptapReader, UseTiptapEditorReturn } from 'ct-tiptap-editor';
import dayjs from "dayjs";
import 'dayjs/locale/zh-cn';
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale('zh-cn')

const DocContent = ({ info, editorRef }: { info?: NodeDetail, editorRef: UseTiptapEditorReturn }) => {
  const { mobile = false, kbDetail, catalogShow } = useStore()
  if (!editorRef || !info) return null

  const catalogSetting = kbDetail?.settings?.catalog_settings

  return <Box sx={{
    width: `calc(100% - ${catalogShow ? catalogSetting?.catalog_width ?? 260 : 16}px - 225px)`,
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
  }}>
    <Stack direction={mobile ? 'column' : 'row'} alignItems={mobile ? 'flex-start' : 'center'} justifyContent='space-between' sx={{
      bgcolor: 'background.paper',
      p: 3,
      borderRadius: '10px',
      border: '1px solid',
      borderColor: 'divider',
    }}>
      <Stack direction={'row'} alignItems={'flex-start'} gap={1} sx={{ fontSize: 32, lineHeight: '40px', fontWeight: '700', color: 'text.primary' }}>
        {info?.meta?.emoji ? <Box sx={{ flexShrink: 0 }}>{info?.meta?.emoji}</Box>
          : info?.type === 1 ? <IconFolder sx={{ flexShrink: 0, mt: 0.5 }} />
            : <IconFile sx={{ flexShrink: 0, mt: 0.5 }} />}
        {info?.name}
      </Stack>
      <Stack
        direction={mobile ? 'row' : 'column'}
        alignItems={'center'}
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
        }}>
        <Box>{dayjs(info?.created_at).fromNow()}创建</Box>
        {info?.updated_at && info.updated_at.slice(0, 1) !== '0' && <Box>{dayjs(info.updated_at).fromNow()}更新</Box>}
      </Stack>
    </Stack>
    <Box sx={{
      mt: 3,
      // .tiptap.ProseMirror {
      //   --blockquote-bg-color: var(--tt-gray-light-900);
      //   --link-text-color: var(--tt-brand-color-500);
      //   --separator-color: var(--tt-gray-light-a-200);
      //   --thread-text: var(--tt-gray-light-900);
      //   --placeholder-color: var(--tt-gray-light-a-400);
      //   --tiptap-mathematics-bg-color: var(--tt-gray-light-a-200);
      //   --tiptap-mathematics-border-color: var(--tt-brand-color-500);
      // }

      '.tiptap.ProseMirror': {
        color: 'text.primary',
      }
    }}>
      <TiptapReader editorRef={editorRef} />
    </Box>
  </Box>
};

export default DocContent;