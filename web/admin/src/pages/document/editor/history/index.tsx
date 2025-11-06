import EmojiPicker from '@/components/Emoji';
import { DocWidth } from '@/constant/enums';
import {
  DomainGetNodeReleaseDetailResp,
  DomainNodeReleaseListItem,
  getApiProV1NodeReleaseDetail,
  getApiProV1NodeReleaseList,
} from '@/request/pro';
import { useAppSelector } from '@/store';
import { Editor, useTiptap } from '@ctzhian/tiptap';
import { Ellipsis, Icon } from '@ctzhian/ui';
import {
  alpha,
  Box,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { WrapContext } from '..';
import VersionRollback from '../../component/VersionRollback';

const History = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { kb_id } = useAppSelector(state => state.config);
  const { catalogOpen, setCatalogOpen, docWidth } =
    useOutletContext<WrapContext>();
  const theme = useTheme();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [list, setList] = useState<DomainNodeReleaseListItem[]>([]);
  const [curVersion, setCurVersion] =
    useState<DomainNodeReleaseListItem | null>(null);
  const [curNode, setCurNode] = useState<DomainGetNodeReleaseDetailResp | null>(
    null,
  );
  const [characterCount, setCharacterCount] = useState(0);

  const [isMarkdown, setIsMarkdown] = useState(false);

  const editorRef = useTiptap({
    content: '',
    editable: false,
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      setCharacterCount((editor.storage as any).characterCount.characters());
    },
  });

  const editorMdRef = useTiptap({
    content: '',
    contentType: 'markdown',
    editable: false,
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      setCharacterCount((editor.storage as any).characterCount.characters());
    },
  });

  const getDetail = (v: DomainNodeReleaseListItem) => {
    getApiProV1NodeReleaseDetail({ id: v.id!, kb_id: kb_id! }).then(res => {
      setCurNode(res);
      if (res.meta?.content_type === 'md') {
        setIsMarkdown(true);
        editorMdRef.setContent(res.content || '');
      } else {
        setIsMarkdown(false);
        editorRef.setContent(res.content || '');
      }
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
              color: 'text.tertiary',
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
      <Box sx={{ mt: '56px', mr: '292px' }}>
        {curNode && (
          <Box
            sx={{
              p: '48px 72px 150px',
              mx: 'auto',
              width:
                docWidth === 'full'
                  ? `calc(100% - 160px)`
                  : DocWidth[docWidth as keyof typeof DocWidth].value,
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
              flexWrap={'wrap'}
              gap={2}
              sx={{ mb: 4, fontSize: 12, color: 'text.tertiary' }}
            >
              {curNode.editor_account && (
                <Tooltip
                  arrow
                  title={
                    curNode.creator_account || curNode.publisher_account ? (
                      <Stack>
                        {curNode.creator_account && (
                          <Box>创建：{curNode.creator_account}</Box>
                        )}
                        {curNode.publisher_account && (
                          <Box>上次发布：{curNode.publisher_account}</Box>
                        )}
                      </Stack>
                    ) : null
                  }
                >
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={0.5}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Icon type='icon-tianjiawendang' sx={{ fontSize: 9 }} />
                    {curNode.editor_account} 编辑
                  </Stack>
                </Tooltip>
              )}
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
                    color: 'text.tertiary',
                  }}
                >
                  {curNode.meta?.summary}
                </Box>
              </Box>
            )}
            <Box
              sx={{
                '.tiptap': {
                  minHeight: 'calc(100vh - 56px)',
                },
                '.tableWrapper': {
                  maxWidth: '100%',
                  overflowX: 'auto',
                },
              }}
            >
              {isMarkdown ? (
                <Editor editor={editorMdRef.editor} />
              ) : (
                <Editor editor={editorRef.editor} />
              )}
            </Box>
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
          bgcolor: 'background.paper3',
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
              <Ellipsis sx={{ color: 'text.primary' }}>
                {item.release_name}
              </Ellipsis>
              <Box sx={{ fontSize: 13, color: 'text.tertiary' }}>
                {item.release_message}
              </Box>
              <Stack
                direction={'row'}
                alignItems={'center'}
                justifyContent={'space-between'}
                sx={{ mt: 1, height: 21 }}
              >
                {item.publisher_account ? (
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={0.5}
                    sx={{
                      bgcolor: 'primary.main',
                      display: 'inline-flex',
                      color: 'white',
                      borderRadius: '4px',
                      p: 0.5,
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                  >
                    <Icon type='icon-fabu' />
                    {item.publisher_account}
                  </Stack>
                ) : (
                  <Box></Box>
                )}
                {curVersion?.id === item.id && (
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
                    onClick={event => {
                      event.stopPropagation();
                      setConfirmOpen(true);
                    }}
                  >
                    还原
                  </Box>
                )}
              </Stack>
            </Box>
            {idx !== list.length - 1 && <Divider sx={{ my: 0.5 }} />}
          </>
        ))}
      </Stack>
      <VersionRollback
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onOk={async () => {
          navigate(`/doc/editor/${id}`, {
            state: {
              node: curNode,
            },
          });
        }}
        data={curVersion}
      />
    </Box>
  );
};

export default History;
