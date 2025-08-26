import EmojiPicker from '@/components/Emoji';
import {
  DomainGetNodeReleaseDetailResp,
  DomainNodeReleaseListItem,
  getApiProV1NodeReleaseDetail,
  getApiProV1NodeReleaseList,
} from '@/request/pro';
import { useAppSelector } from '@/store';
import light from '@/themes/light';
import componentStyleOverrides from '@/themes/override';
import {
  alpha,
  Box,
  Divider,
  IconButton,
  Stack,
  useTheme,
} from '@mui/material';
import { Editor, EditorThemeProvider, useTiptap } from '@yu-cq/tiptap';
import { Icon, Message } from 'ct-mui';
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { WrapContext } from '..';

const History = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { kb_id } = useAppSelector(state => state.config);
  const { catalogOpen, setCatalogOpen } = useOutletContext<WrapContext>();
  const theme = useTheme();

  const [list, setList] = useState<DomainNodeReleaseListItem[]>([]);
  const [curVersion, setCurVersion] =
    useState<DomainNodeReleaseListItem | null>(null);
  const [curNode, setCurNode] = useState<DomainGetNodeReleaseDetailResp | null>(
    null,
  );
  const [characterCount, setCharacterCount] = useState(0);

  const editorRef = useTiptap({
    content: '',
    editable: false,
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      setCharacterCount((editor.storage as any).characterCount.characters());
    },
    onError: (error: Error) => Message.error(error.message),
  });

  const getDetail = (v: DomainNodeReleaseListItem) => {
    getApiProV1NodeReleaseDetail({ id: v.id! }).then(res => {
      setCurNode(res);
      editorRef.editor.commands.setContent(res.content || '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  useEffect(() => {
    if (curVersion) {
      getDetail(curVersion);
    }
  }, [curVersion]);

  useEffect(() => {
    if (!id || !kb_id) return;
    getApiProV1NodeReleaseList({
      node_id: id,
      kb_id: kb_id,
    }).then(res => {
      setList(res || []);
      if (res.length > 0) {
        setCurVersion(res[0]);
      }
    });
  }, [id, kb_id]);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Stack
        direction={'row'}
        alignItems={'center'}
        justifyContent={'space-between'}
        gap={1}
        sx={{
          position: 'fixed',
          top: 0,
          left: catalogOpen ? 292 : 0,
          right: 0,
          zIndex: 2,
          bgcolor: 'background.default',
          transition: 'left 0.3s ease-in-out',
          height: 56,
          px: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {!catalogOpen && (
          <Stack
            alignItems='center'
            justifyContent='space-between'
            onClick={() => setCatalogOpen(true)}
            sx={{
              cursor: 'pointer',
              color: 'text.auxiliary',
              ':hover': {
                color: 'text.primary',
              },
            }}
          >
            <Icon
              type='icon-muluzhankai'
              sx={{
                fontSize: 24,
              }}
            />
          </Stack>
        )}
        <Box sx={{ flex: 1 }}>历史版本</Box>
        <IconButton
          size='small'
          sx={{ flexShrink: 0 }}
          onClick={() => {
            navigate(`/doc/editor/${id}`);
          }}
        >
          <Icon type='icon-chahao' />
        </IconButton>
      </Stack>
      <Box sx={{ mt: '56px', width: 'calc(100% - 292px)' }}>
        {curNode && (
          <Box
            sx={{
              p: '48px 72px 150px',
              mx: 'auto',
              maxWidth: 892,
              minWidth: '386px',
            }}
          >
            <Stack
              direction={'row'}
              alignItems={'center'}
              gap={1}
              sx={{ mb: 2 }}
            >
              <EmojiPicker
                readOnly
                type={2}
                sx={{ flexShrink: 0, width: 36, height: 36 }}
                iconSx={{ fontSize: 28 }}
                value={curNode?.meta?.emoji}
              />
              <Box
                sx={{
                  fontSize: 28,
                  fontWeight: 'bold',
                }}
              >
                {curNode?.name || ''}
              </Box>
            </Stack>
            <Stack
              direction={'row'}
              alignItems={'center'}
              gap={2}
              sx={{ mb: 4, fontSize: 12, color: 'text.auxiliary' }}
            >
              <Stack direction={'row'} alignItems={'center'} gap={0.5}>
                <Icon type='icon-a-shijian2' />
                {curVersion?.release_message}
              </Stack>
              <Stack direction={'row'} alignItems={'center'} gap={0.5}>
                <Icon type='icon-ziti' />
                {characterCount} 字
              </Stack>
            </Stack>
            {(curNode.meta?.summary?.length ?? 0) > 0 && (
              <Box
                sx={{
                  fontSize: 14,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '10px',
                  p: 2,
                  mb: 4,
                }}
              >
                <Box
                  sx={{
                    fontWeight: 'bold',
                    mb: 1,
                  }}
                >
                  内容摘要
                </Box>
                <Box
                  sx={{
                    color: 'text.auxiliary',
                  }}
                >
                  {curNode.meta?.summary}
                </Box>
              </Box>
            )}
            <EditorThemeProvider
              colors={{ light }}
              mode='light'
              theme={{
                components: componentStyleOverrides,
              }}
            >
              <Box
                sx={{
                  '.tiptap': {
                    minHeight: 'calc(100vh - 56px)',
                  },
                }}
              >
                <Editor editor={editorRef.editor} />
              </Box>
            </EditorThemeProvider>
          </Box>
        )}
      </Box>
      <Stack
        sx={{
          position: 'fixed',
          top: 56,
          right: 0,
          flexShrink: 0,
          width: 292,
          p: 0.5,
          bgcolor: 'background.paper2',
          height: 'calc(100vh - 56px)',
          overflow: 'auto',
          borderLeft: '1px solid',
          borderColor: 'divider',
        }}
      >
        {list.map((item, idx) => (
          <>
            <Box
              key={item.id}
              sx={{
                borderRadius: 1,
                p: 2,
                cursor: 'pointer',
                bgcolor:
                  curVersion?.id === item.id
                    ? alpha(theme.palette.primary.main, 0.1)
                    : 'transparent',
                '&:hover': {
                  bgcolor:
                    curVersion?.id === item.id
                      ? alpha(theme.palette.primary.main, 0.1)
                      : 'action.hover',
                },
              }}
              onClick={() => {
                setCurVersion(item);
              }}
            >
              <Stack
                direction={'row'}
                alignItems={'center'}
                justifyContent={'space-between'}
                sx={{ mb: 1 }}
              >
                <Box
                  sx={{
                    color: 'text.primary',
                  }}
                >
                  {item.release_name}
                </Box>
                <Box
                  sx={{
                    fontSize: 14,
                    color: 'primary.main',
                    borderRadius: '4px',
                    px: 1,
                    ':hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                  onClick={() => {
                    navigate(`/doc/editor/${id}`, {
                      state: {
                        node: curNode,
                      },
                    });
                  }}
                >
                  还原
                </Box>
              </Stack>
              <Box sx={{ fontSize: 13, color: 'text.auxiliary' }}>
                {item.release_message}
              </Box>
            </Box>
            {idx !== list.length - 1 && <Divider sx={{ my: 0.5 }} />}
          </>
        ))}
      </Stack>
    </Box>
  );
};

export default History;
