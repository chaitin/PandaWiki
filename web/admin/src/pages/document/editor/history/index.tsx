import EmojiPicker from '@/components/Emoji';
import { DocWidth } from '@/constant/enums';
import { getApiV1NodeDetail, putApiV1NodeDetail } from '@/request';
import {
  DomainGetNodeReleaseDetailResp,
  DomainNodeReleaseListItem,
  getApiProV1NodeReleaseDetail,
  getApiProV1NodeReleaseList,
} from '@/request/pro';
import { DomainNodeStatus, V1NodeDetailResp } from '@/request/types';
import { useAppSelector } from '@/store';
import { Editor, EditorDiff, useTiptap } from '@ctzhian/tiptap';
import { Ellipsis } from '@ctzhian/ui';
import {
  alpha,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  IconAShijian2,
  IconChahao,
  IconCorrection,
  IconFabu,
  IconMuluzhankai,
  IconTianjiawendang,
  IconZiti,
} from '@panda-wiki/icons';
import dayjs from 'dayjs';
import { Fragment, useEffect, useRef, useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { WrapContext } from '..';
import VersionRollback from '../../component/VersionRollback';

/** 目录栏宽度，与右侧版本列表宽度一致 */
const CATALOG_WIDTH = 292;

const History = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { kb_id, nav_id } = useAppSelector(state => state.config);
  const { catalogOpen, setCatalogOpen, docWidth } =
    useOutletContext<WrapContext>();
  const theme = useTheme();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [list, setList] = useState<
    (DomainNodeReleaseListItem & V1NodeDetailResp)[]
  >([]);
  const [curVersion, setCurVersion] = useState<
    (DomainNodeReleaseListItem & V1NodeDetailResp) | null
  >(null);
  const [curNode, setCurNode] = useState<DomainGetNodeReleaseDetailResp | null>(
    null,
  );
  const [characterCount, setCharacterCount] = useState(0);

  const [isMarkdown, setIsMarkdown] = useState(false);
  const [prevVersionContent, setPrevVersionContent] = useState<string>('');
  const [prevVersionNode, setPrevVersionNode] =
    useState<DomainGetNodeReleaseDetailResp | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const currentVersionIdRef = useRef<string | undefined | null>(null);

  const editorRef = useTiptap({
    content: '',
    editable: false,
    baseUrl: window.__BASENAME__ || '',
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      setCharacterCount((editor.storage as any).characterCount.characters());
    },
  });

  const editorMdRef = useTiptap({
    content: '',
    contentType: 'markdown',
    editable: false,
    baseUrl: window.__BASENAME__ || '',
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      setCharacterCount((editor.storage as any).characterCount.characters());
    },
  });

  useEffect(() => {
    if (!curVersion || !kb_id) return;
    if (
      curVersion.status === DomainNodeStatus.NodeStatusReleased &&
      !curVersion.id
    ) {
      setDiffLoading(false);
      return;
    }

    const versionId = curVersion.id;
    currentVersionIdRef.current = versionId ?? null;

    setPrevVersionContent('');
    setPrevVersionNode(null);
    setDiffLoading(true);

    const currentVersionPromise =
      curVersion.status !== DomainNodeStatus.NodeStatusReleased
        ? Promise.resolve().then(() => {
            const versionId = curVersion.id;
            return getApiV1NodeDetail({ id: id, kb_id: kb_id }).then(res => {
              if (currentVersionIdRef.current === versionId) {
                setCurNode(res);
                if (res.meta?.content_type === 'md') {
                  setIsMarkdown(true);
                  editorMdRef.setContent(res.content || '');
                } else {
                  setIsMarkdown(false);
                  editorRef.setContent(res.content || '');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
              return res;
            });
          })
        : (() => {
            const releaseId = curVersion.id;
            if (!releaseId) return Promise.resolve(null);
            return getApiProV1NodeReleaseDetail({
              id: releaseId,
              kb_id: kb_id,
            }).then(res => {
              if (currentVersionIdRef.current === versionId) {
                setCurNode(res);
                if (res.meta?.content_type === 'md') {
                  setIsMarkdown(true);
                  editorMdRef.setContent(res.content || '');
                } else {
                  setIsMarkdown(false);
                  editorRef.setContent(res.content || '');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
              return res;
            });
          })();

    const currentIndex = list.findIndex(item => item.id === curVersion.id);

    let prevVersionPromise: Promise<DomainGetNodeReleaseDetailResp | null> =
      Promise.resolve(null);

    if (
      currentIndex === 0 &&
      curVersion.status !== DomainNodeStatus.NodeStatusReleased
    ) {
      // 草稿场景：上一版本为 list[1]（首个已发布版本）
      if (list.length > 1) {
        const firstRelease = list[1];
        if (firstRelease.id) {
          prevVersionPromise = getApiProV1NodeReleaseDetail({
            id: firstRelease.id,
            kb_id: kb_id,
          }).then(res => {
            if (currentVersionIdRef.current === versionId) {
              return res;
            }
            return null;
          });
        }
      }
    } else if (curVersion.status === DomainNodeStatus.NodeStatusReleased) {
      // 已发布场景：上一版本为 list[currentIndex + 1]（更早的发布版本）
      if (currentIndex >= 0 && currentIndex < list.length - 1) {
        const nextRelease = list[currentIndex + 1];
        if (nextRelease.id) {
          prevVersionPromise = getApiProV1NodeReleaseDetail({
            id: nextRelease.id,
            kb_id: kb_id,
          }).then(res => {
            if (currentVersionIdRef.current === versionId) {
              return res;
            }
            return null;
          });
        }
      }
    }
    Promise.all([currentVersionPromise, prevVersionPromise])
      .then(([, prevRes]) => {
        if (currentVersionIdRef.current === versionId) {
          if (prevRes) {
            setPrevVersionContent(prevRes.content || '');
            setPrevVersionNode(prevRes);
          } else {
            setPrevVersionContent('');
            setPrevVersionNode(null);
          }
          setDiffLoading(false);
        }
      })
      .catch(() => {
        if (currentVersionIdRef.current === versionId) {
          setDiffLoading(false);
        }
      });
  }, [curVersion, list, id, kb_id]);

  useEffect(() => {
    if (!id || !kb_id) return;
    Promise.all([
      getApiV1NodeDetail({ id: id, kb_id: kb_id }),
      getApiProV1NodeReleaseList({
        node_id: id,
        kb_id: kb_id,
      }),
    ])
      .then(([node, releases]) => {
        const releaseList = releases.map(item => ({
          ...item,
          status: DomainNodeStatus.NodeStatusReleased,
        }));

        if (node.status !== DomainNodeStatus.NodeStatusReleased) {
          // @ts-expect-error 忽略类型错误
          releaseList.unshift(node);
          setCurVersion(node);
        } else {
          if (releases.length > 0) {
            setCurVersion(releases[0]);
          } else {
            // 已发布但无历史版本：将当前文档作为唯一版本展示
            const nodeAsRelease = {
              ...node,
              status: DomainNodeStatus.NodeStatusReleased,
            };
            releaseList.push(nodeAsRelease);
            setCurVersion(nodeAsRelease);
          }
        }
        setList(releaseList);
      })
      .catch(() => {
        // 接口失败时保持初始状态
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
          left: catalogOpen ? CATALOG_WIDTH : 0,
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
            <IconMuluzhankai
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
          <IconChahao sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>
      <Box sx={{ mt: '56px', mr: `${CATALOG_WIDTH}px` }}>
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
              {curNode.editor_account &&
                (curNode.creator_account || curNode.publisher_account ? (
                  <Tooltip
                    arrow
                    title={
                      <Stack>
                        {curNode.creator_account && (
                          <Box>创建：{curNode.creator_account}</Box>
                        )}
                        {curNode.publisher_account && (
                          <Box>上次发布：{curNode.publisher_account}</Box>
                        )}
                      </Stack>
                    }
                  >
                    <Stack
                      direction={'row'}
                      alignItems={'center'}
                      gap={0.5}
                      sx={{ cursor: 'pointer' }}
                    >
                      <IconTianjiawendang sx={{ fontSize: 9 }} />
                      {curNode.editor_account} 编辑
                    </Stack>
                  </Tooltip>
                ) : (
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={0.5}
                    sx={{ cursor: 'default' }}
                  >
                    <IconTianjiawendang sx={{ fontSize: 9 }} />
                    {curNode.editor_account} 编辑
                  </Stack>
                ))}
              <Stack direction={'row'} alignItems={'center'} gap={0.5}>
                <IconAShijian2 sx={{ fontSize: 12 }} />
                {curVersion?.status !== DomainNodeStatus.NodeStatusReleased
                  ? dayjs(curVersion?.updated_at).format(
                      'YYYY 年 MM 月 DD 日 HH 时 mm 分 ss 秒',
                    ) + ' 编辑'
                  : curVersion?.release_message}
              </Stack>
              <Stack direction={'row'} alignItems={'center'} gap={0.5}>
                <IconZiti sx={{ fontSize: 12 }} />
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
              {diffLoading ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 'calc(100vh - 56px)',
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : prevVersionContent &&
                curNode?.content &&
                prevVersionNode?.meta?.content_type ===
                  curNode.meta?.content_type ? (
                isMarkdown ? (
                  <Box
                    sx={{ overflowY: 'auto', maxHeight: 'calc(100vh - 56px)' }}
                  >
                    <ReactDiffViewer
                      oldValue={prevVersionContent}
                      newValue={curNode.content || ''}
                    />
                  </Box>
                ) : (
                  <EditorDiff
                    oldHtml={prevVersionContent}
                    newHtml={curNode.content || ''}
                    baseUrl={window.__BASENAME__ || ''}
                  />
                )
              ) : isMarkdown ? (
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
          width: CATALOG_WIDTH,
          p: 0.5,
          bgcolor: 'background.paper3',
          height: 'calc(100vh - 56px)',
          overflow: 'auto',
          borderLeft: '1px solid',
          borderColor: 'divider',
        }}
      >
        {list.map((item, idx) => (
          <Fragment key={item.id}>
            <Box
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
                {item.status !== DomainNodeStatus.NodeStatusReleased
                  ? '未发布的草稿'
                  : item.release_name}
              </Ellipsis>
              <Box sx={{ fontSize: 13, color: 'text.tertiary' }}>
                {item.status !== DomainNodeStatus.NodeStatusReleased
                  ? dayjs(item.updated_at).format(
                      'YYYY 年 MM 月 DD 日 HH 时 mm 分 ss 秒',
                    ) + ' 编辑'
                  : item.release_message}
              </Box>
              <Stack
                direction={'row'}
                alignItems={'center'}
                justifyContent={'space-between'}
                sx={{ mt: 1, height: 21 }}
              >
                {item.status === DomainNodeStatus.NodeStatusReleased ? (
                  item.publisher_account && (
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
                      <IconFabu sx={{ fontSize: 16 }} />
                      {item.publisher_account}
                    </Stack>
                  )
                ) : (
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={0.5}
                    sx={{
                      bgcolor: 'text.disabled',
                      display: 'inline-flex',
                      color: 'white',
                      borderRadius: '4px',
                      p: 0.5,
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                  >
                    <IconCorrection sx={{ fontSize: 14 }} />
                    {item.editor_account}
                  </Stack>
                )}

                {curVersion?.id === item.id &&
                  item.status === DomainNodeStatus.NodeStatusReleased && (
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
          </Fragment>
        ))}
      </Stack>
      <VersionRollback
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onOk={async () => {
          await putApiV1NodeDetail({
            id: id,
            kb_id: kb_id,
            nav_id: nav_id || '',
            content: curNode?.content,
          });
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
