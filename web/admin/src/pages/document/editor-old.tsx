import { NodeDetail, uploadFile } from '@/api';
import { getApiV1NodeDetail, putApiV1NodeDetail } from '@/request/Node';
import {
  DomainGetNodeReleaseDetailResp,
  DomainNodeReleaseListItem,
} from '@/request/pro';
import { V1NodeDetailResp } from '@/request/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { setKbId } from '@/store/slices/config';
import light from '@/themes/light';
import componentStyleOverrides from '@/themes/override';
import { Box, Stack, useMediaQuery } from '@mui/material';
import {
  Editor,
  EditorThemeProvider,
  EditorToolbar,
  TocList,
  useTiptap,
  UseTiptapReturn,
} from '@yu-cq/tiptap';
import { Message } from 'ct-mui';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import VersionPublish from '../release/components/VersionPublish';
import EditorDocNav from './component/EditorDocNav';
import EditorFolder from './component/EditorFolder';
import EditorHeader from './component/EditorHeader';
import EditorSummary from './component/EditorSummary';
import VersionList from './component/VersionList';

const DocEditor = () => {
  const { id = '' } = useParams();
  const dispatch = useAppDispatch();
  const isWideScreen = useMediaQuery('(min-width:1400px)');
  const { kb_id = '' } = useAppSelector(state => state.config);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const [detail, setDetail] = useState<V1NodeDetailResp | null>(null);
  const [edited, setEdited] = useState(false);
  const [headings, setHeadings] = useState<TocList>([]);
  const [docContent, setDocContent] = useState('');
  const [showVersion, setShowVersion] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [curVersion, setCurVersion] = useState<
    | (DomainGetNodeReleaseDetailResp & { release: DomainNodeReleaseListItem })
    | null
  >(null);

  const handleUpload = async (
    file: File,
    onProgress?: (progress: { progress: number }) => void,
    abortSignal?: AbortSignal,
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    const { key } = await uploadFile(formData, {
      onUploadProgress: ({ progress }) => {
        onProgress?.({ progress: progress / 100 });
      },
      abortSignal,
    });
    return Promise.resolve('/static-file/' + key);
  };

  const handleTocUpdate = (toc: TocList) => {
    setHeadings(toc);
  };

  const handleSave = async (
    auto?: boolean,
    publish?: boolean,
    html?: string,
    nodeDetail?: NodeDetail | null,
  ) => {
    if (!editorRef || !detail) return;
    const content = html || editorRef.getHTML();
    cancelTimer();
    try {
      const newDetail = nodeDetail ?? detail;
      await putApiV1NodeDetail({
        id,
        content,
        kb_id: newDetail.kb_id!,
        emoji: newDetail.meta?.emoji || '',
        summary: newDetail.meta?.summary || '',
        name: newDetail.name,
      });
      // @ts-expect-error 类型不兼容
      setDetail({
        ...newDetail,
        status: 1,
        updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        content,
        name: newDetail.name,
        meta: {
          emoji: newDetail.meta?.emoji || '',
          summary: newDetail.meta?.summary || '',
        },
      });
      if (publish) {
        setPublishOpen(true);
      }
      if (auto === true) {
        Message.success('自动保存成功');
      } else {
        setEdited(false);
        setDocContent(content);
      }
      if (auto === undefined) Message.success('保存成功');
      resetTimer();
    } catch (error) {
      Message.error('保存失败');
    }
  };

  const editorRef = useTiptap({
    editable: true,
    content: '',
    limit: 100,
    exclude: ['invisibleCharacters', 'youtube', 'mention'],
    immediatelyRender: true,
    onSave: (editor: UseTiptapReturn['editor']) => {
      handleSave(undefined, false, editor.getHTML());
    },
    onUpdate: () => {
      setEdited(true);
      if (detail) setDetail({ ...detail, status: 1 });
    },
    onError: (error: Error) => {
      if (error.message) {
        Message.error(error.message);
      }
    },
    onUpload: handleUpload,
    onTocUpdate: handleTocUpdate,
  });

  const getDetail = (unCover?: boolean) => {
    getApiV1NodeDetail({
      id,
      kb_id: kb_id || localStorage.getItem('kb_id') || '',
    }).then(res => {
      setDetail(res);
      if (!unCover) setDocContent(res.content || '');
      dispatch(setKbId(res.kb_id));
    });
  };

  const cancelTimer = () => {
    if (timer.current) clearInterval(timer.current);
  };

  const resetTimer = () => {
    cancelTimer();
    timer.current = setInterval(() => {
      // @ts-expect-error 类型不兼容
      handleSave(true, undefined, undefined, detail);
    }, 1000 * 60);
  };

  useEffect(() => {
    if (showVersion) {
      cancelTimer();
    } else {
      resetTimer();
    }
  }, [showVersion, detail]);

  useEffect(() => {
    cancelTimer();
    if (editorRef) {
      editorRef.editor.commands.setContent(docContent || '');
      resetTimer();
    }
    return () => cancelTimer();
  }, [docContent]);

  useEffect(() => {
    if (id && editorRef) {
      cancelTimer();
      getDetail();
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 60);
    }
  }, [id]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && edited) {
        handleSave(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <>
      <EditorThemeProvider
        colors={{ light }}
        mode='light'
        theme={{
          components: componentStyleOverrides,
        }}
      >
        <Box sx={{ color: 'text.primary' }}>
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              width: '100vw',
              zIndex: 1000,
              bgcolor: '#fff',
              boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Box
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                py: 1,
              }}
            >
              <EditorHeader
                editorRef={editorRef}
                detail={detail}
                setDetail={setDetail}
                setDocContent={setDocContent}
                curVersion={curVersion}
                showVersion={showVersion}
                setShowVersion={setShowVersion}
                onSave={(auto, publish) => handleSave(auto, publish)}
              />
            </Box>
            {!showVersion && (
              <Box
                sx={{
                  width: 960,
                  margin: 'auto',
                }}
              >
                <EditorToolbar editor={editorRef.editor} />
              </Box>
            )}
          </Box>
          {showVersion ? (
            <VersionList changeVersion={setCurVersion} />
          ) : (
            <Box
              sx={{
                pt: '105px',
                display: 'flex',
                justifyContent: 'center',
                gap: isWideScreen ? 1 : 0,
              }}
            >
              {isWideScreen && (
                <Box
                  sx={{
                    width: 292,
                    position: 'fixed',
                    left: 'calc(50vw - 700px - 4px)',
                    top: '105px',
                    height: 'calc(100vh - 105px)',
                    overflowY: 'auto',
                    zIndex: 1,
                  }}
                >
                  <EditorFolder edited={edited} save={handleSave} />
                </Box>
              )}
              <Box
                className='editor-content'
                sx={{
                  width: 800,
                  overflowY: 'auto',
                  position: 'relative',
                  zIndex: 1,
                  m: '0 auto',
                  p: 4,
                  borderRadius: '6px',
                  bgcolor: '#fff',
                  '.tiptap': {
                    minHeight: 'calc(100vh - 185px)',
                  },
                }}
              >
                <Editor editor={editorRef.editor} />
              </Box>
              {isWideScreen && (
                <Box
                  sx={{
                    width: 292,
                    position: 'fixed',
                    right: 'calc(50vw - 700px - 4px)',
                    top: '105px',
                    height: 'calc(100vh - 105px)',
                    overflowY: 'auto',
                    zIndex: 1,
                  }}
                >
                  <Stack gap={1}>
                    <EditorSummary
                      kb_id={detail?.kb_id || ''}
                      id={detail?.id || ''}
                      name={detail?.name || ''}
                      // @ts-expect-error 类型不兼容
                      summary={detail?.meta.summary || ''}
                      resetTimer={resetTimer}
                      cancelTimer={cancelTimer}
                      // @ts-expect-error 类型不兼容
                      detail={detail}
                      // @ts-expect-error 类型不兼容
                      setDetail={setDetail}
                    />
                    <EditorDocNav headers={headings} />
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </EditorThemeProvider>
      <VersionPublish
        open={publishOpen}
        defaultSelected={[id]}
        onClose={() => setPublishOpen(false)}
        refresh={() => getDetail()}
      />
    </>
  );
};

export default DocEditor;
