import { uploadFile } from '@/api';
import Emoji from '@/components/Emoji';
import { BUSINESS_VERSION_PERMISSION } from '@/constant/version';
import { postApiV1CreationTabComplete, putApiV1NodeDetail } from '@/request';
import { V1NodeDetailResp } from '@/request/types';
import { useAppSelector } from '@/store';
import { completeIncompleteLinks } from '@/utils';
import {
  EditorMarkdown,
  MarkdownEditorRef,
  TocList,
  useTiptap,
  UseTiptapReturn,
} from '@ctzhian/tiptap';
import { message } from '@ctzhian/ui';
import { Box, Stack, TextField, Tooltip } from '@mui/material';
import {
  IconAShijian2,
  IconDJzhinengzhaiyao,
  IconTianjiawendang,
  IconZiti,
} from '@panda-wiki/icons';
import IconPageview1 from '@panda-wiki/icons/IconPageview1';
import dayjs from 'dayjs';
import { debounce } from 'lodash-es';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom';
import { WrapContext } from '..';
import AIGenerate from './AIGenerate';
import FullTextEditor from './FullTextEditor';
import Header from './Header';
import Summary from './Summary';
import Toc from './Toc';
import Toolbar from './Toolbar';

interface WrapProps {
  detail: V1NodeDetailResp;
  /** 他人占用编辑锁等场景：可浏览，不可改内容 */
  readOnly?: boolean;
}

const Wrap = ({ detail: defaultDetail, readOnly = false }: WrapProps) => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { license } = useAppSelector(state => state.config);

  const state = useLocation().state as { node?: V1NodeDetailResp };
  const { catalogOpen, setCatalogOpen, nodeDetail, setNodeDetail, onSave } =
    useOutletContext<WrapContext>();

  const storageTocOpen = localStorage.getItem('toc-open');

  const postApiV1CreationTabCompleteController = useRef<AbortController | null>(
    null,
  );

  const markdownEditorRef = useRef<MarkdownEditorRef>(null);

  const isMarkdown = useMemo(() => {
    return defaultDetail.meta?.content_type === 'md';
  }, [defaultDetail.meta?.content_type]);

  const [title, setTitle] = useState(nodeDetail?.name || defaultDetail.name);
  const [summary, setSummary] = useState(
    nodeDetail?.meta?.summary || defaultDetail.meta?.summary || '',
  );
  const [characterCount, setCharacterCount] = useState(0);
  const [headings, setHeadings] = useState<TocList>([]);
  const [fixedToc, setFixedToc] = useState(!!storageTocOpen);
  const [selectionText, setSelectionText] = useState('');
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const initialStateRef = useRef({
    content: defaultDetail.content || '',
    summary: defaultDetail.meta?.summary || '',
    emoji: defaultDetail.meta?.emoji || '',
  });

  const isBusiness = useMemo(() => {
    return BUSINESS_VERSION_PERMISSION.includes(license.edition!);
  }, [license]);

  const debouncedUpdateSummary = useCallback(
    debounce((newSummary: string) => {
      if (readOnly) return;
      putApiV1NodeDetail({
        id: defaultDetail.id!,
        kb_id: defaultDetail.kb_id!,
        summary: newSummary,
      }).then(() => {
        updateDetail({
          meta: {
            ...nodeDetail?.meta,
            summary: newSummary,
          },
        });
      });
    }, 500),
    [defaultDetail.id, defaultDetail.kb_id, readOnly],
  );

  const debouncedUpdateTitle = useCallback(
    debounce((newTitle: string) => {
      if (readOnly) return;
      putApiV1NodeDetail({
        id: defaultDetail.id!,
        kb_id: defaultDetail.kb_id!,
        name: newTitle,
      }).then(() => {
        updateDetail({
          name: newTitle,
        });
      });
    }, 500),
    [defaultDetail.id, defaultDetail.kb_id, readOnly],
  );

  const updateDetail = (value: V1NodeDetailResp) => {
    setNodeDetail({
      ...nodeDetail,
      updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      status: 1,
      ...value,
    });
  };

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

  const handleError = (error: Error) => {
    if (error.message) {
      message.error(error.message);
    }
  };

  const handleUpdate = ({ editor }: { editor: UseTiptapReturn['editor'] }) => {
    setCharacterCount((editor.storage as any).characterCount.characters());
    checkIfEdited();
  };

  const handleAiWritingGetSuggestion = async ({
    prefix,
    suffix,
  }: {
    prefix: string;
    suffix: string;
  }): Promise<string> => {
    if (postApiV1CreationTabCompleteController.current) {
      postApiV1CreationTabCompleteController.current.abort();
    }
    postApiV1CreationTabCompleteController.current = new AbortController();
    const signal = postApiV1CreationTabCompleteController.current.signal;

    const suggestion = await postApiV1CreationTabComplete(
      {
        prefix: prefix.length > 300 ? prefix.slice(-300) : prefix,
        suffix: suffix.slice(0, 300),
      },
      {
        signal,
      },
    );
    return new Promise(resolve => {
      resolve(suggestion || '');
    });
  };

  const editorRef = useTiptap({
    editable: !readOnly && !isMarkdown,
    contentType: isMarkdown ? 'markdown' : 'html',
    immediatelyRender: true,
    content: defaultDetail.content,
    baseUrl: window.__BASENAME__ || '',
    exclude: ['invisibleCharacters', 'youtube', 'mention'],
    onCreate: ({ editor: tiptapEditor }) => {
      const characterCount = (
        tiptapEditor.storage as any
      ).characterCount.characters();
      setCharacterCount(characterCount);
    },
    onError: handleError,
    onUpload: handleUpload,
    onUpdate: handleUpdate,
    onTocUpdate: handleTocUpdate,
    onAiWritingGetSuggestion: handleAiWritingGetSuggestion,
  });

  useEffect(() => {
    if (editorRef.editor) {
      editorRef.editor.setEditable(!readOnly && !isMarkdown);
    }
  }, [readOnly, isMarkdown, editorRef.editor]);

  useEffect(() => {
    if (readOnly) {
      setShowSummary(false);
      setAiGenerateOpen(false);
    }
  }, [readOnly]);

  const exportFile = (value: string, type: string) => {
    if (!value) return;
    const content = completeIncompleteLinks(value);
    const blob = new Blob([content], { type: `text/${type}` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nodeDetail?.name}.${type}`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  const handleExport = useCallback(
    async (type: string) => {
      if (type === 'html') {
        const value = editorRef.getHTML() || '';
        exportFile(value, type);
      } else if (type === 'md') {
        if (isMarkdown) {
          const value = nodeDetail?.content || '';
          exportFile(value, type);
        } else if (editorRef) {
          const value = editorRef.getMarkdown() || '';
          exportFile(value, type);
        }
      }
    },
    [editorRef, nodeDetail?.content, nodeDetail?.name, isMarkdown],
  );

  const checkIfEdited = useCallback(() => {
    if (editorRef) {
      let value = nodeDetail?.content || '';
      if (!isMarkdown) {
        value = editorRef.getContent() || '';
      }
      const currentSummary = summary;
      const currentEmoji = nodeDetail?.meta?.emoji || '';
      const hasChanges =
        value !== initialStateRef.current.content ||
        currentSummary !== initialStateRef.current.summary ||
        currentEmoji !== initialStateRef.current.emoji;

      setIsEditing(hasChanges);
    }
  }, [
    editorRef,
    summary,
    nodeDetail?.meta?.emoji,
    nodeDetail?.content,
    isMarkdown,
  ]);

  const handleAiGenerate = useCallback(() => {
    if (editorRef.editor) {
      const { from, to } = editorRef.editor.state.selection;
      const text = editorRef.editor.state.doc.textBetween(from, to, '\n');
      if (!text) {
        message.error('请先选择文本');
        return;
      }
      setSelectionText(text);
      setAiGenerateOpen(true);
    }
  }, [editorRef.editor]);

  const changeCatalogItem = useCallback(() => {
    if (readOnly) return;
    if (editorRef && editorRef.editor) {
      let content = nodeDetail?.content || '';
      if (!isMarkdown) {
        content = editorRef.getContent();
        updateDetail({
          content: content,
        });
      }
      onSave(content);
      initialStateRef.current = {
        content: content,
        summary: summary,
        emoji: nodeDetail?.meta?.emoji || '',
      };
      setIsEditing(false);
    }
  }, [
    id,
    editorRef,
    onSave,
    summary,
    nodeDetail?.meta?.emoji,
    nodeDetail?.content,
    isMarkdown,
    readOnly,
  ]);

  const handleGlobalKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (readOnly) return;
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        changeCatalogItem();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        setCatalogOpen(!catalogOpen);
      }
    },
    [changeCatalogItem, catalogOpen, setCatalogOpen, readOnly],
  );

  const renderEditorTitleEmojiSummary = () => {
    return (
      <>
        <Stack
          direction={'row'}
          alignItems={'center'}
          gap={1}
          sx={{ mb: 2, position: 'relative' }}
        >
          <Emoji
            type={2}
            readOnly={readOnly}
            sx={{ flexShrink: 0, width: 36, height: 36 }}
            iconSx={{ fontSize: 28 }}
            value={nodeDetail?.meta?.emoji}
            onChange={value => {
              putApiV1NodeDetail({
                id: defaultDetail.id!,
                kb_id: defaultDetail.kb_id!,
                emoji: value,
              }).then(() => {
                updateDetail({
                  meta: {
                    ...nodeDetail?.meta,
                    emoji: value,
                  },
                });
                // 延迟检查以确保状态已更新
                setTimeout(() => checkIfEdited(), 0);
              });
            }}
          />
          <TextField
            sx={{ flex: 1 }}
            value={title}
            slotProps={{
              input: {
                readOnly,
                sx: {
                  fontSize: 28,
                  fontWeight: 'bold',
                  bgcolor: 'background.default',
                  '& input': {
                    p: 0,
                    lineHeight: '36px',
                    height: '36px',
                  },
                  '& fieldset': {
                    border: 'none !important',
                  },
                },
              },
            }}
            onChange={e => {
              if (readOnly) return;
              setTitle(e.target.value);
              debouncedUpdateTitle(e.target.value);
            }}
          />
        </Stack>
        <Stack direction={'row'} alignItems={'center'} gap={2} sx={{ mb: 4 }}>
          {nodeDetail?.editor_account && (
            <Tooltip
              arrow
              title={
                nodeDetail?.creator_account || nodeDetail?.publisher_account ? (
                  <Stack>
                    {nodeDetail?.creator_account && (
                      <Box>创建：{nodeDetail?.creator_account}</Box>
                    )}
                    {nodeDetail?.publisher_account && (
                      <Box>上次发布：{nodeDetail?.publisher_account}</Box>
                    )}
                  </Stack>
                ) : null
              }
            >
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={0.5}
                sx={{
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'text.tertiary',
                }}
              >
                <IconTianjiawendang sx={{ fontSize: 9 }} />
                {nodeDetail?.editor_account} 编辑
              </Stack>
            </Tooltip>
          )}
          <Tooltip arrow title={isBusiness ? '查看历史版本' : ''}>
            <Stack
              direction={'row'}
              alignItems={'center'}
              gap={0.5}
              sx={{
                fontSize: 12,
                color: 'text.tertiary',
                cursor: isBusiness ? 'pointer' : 'text',
                ':hover': {
                  color: isBusiness ? 'primary.main' : 'text.tertiary',
                },
              }}
              onClick={() => {
                if (isBusiness) {
                  navigate(`/doc/editor/history/${defaultDetail.id}`);
                }
              }}
            >
              <IconAShijian2 sx={{ fontSize: 12 }} />
              {dayjs(defaultDetail.created_at).format(
                'YYYY-MM-DD HH:mm:ss',
              )}{' '}
              创建
            </Stack>
          </Tooltip>
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={0.5}
            sx={{ fontSize: 12, color: 'text.tertiary' }}
          >
            <IconZiti sx={{ fontSize: 12 }} />
            {characterCount} 字
          </Stack>
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={0.5}
            sx={{ fontSize: 12, color: 'text.tertiary' }}
          >
            <IconPageview1 sx={{ fontSize: 12 }} />
            浏览量 {nodeDetail?.pv}
          </Stack>
        </Stack>
        <Box
          sx={{
            mb: 6,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            bgcolor: 'background.paper2',
            p: 2,
            position: 'relative',
            '.ai-generate-summary-left-icon': {
              opacity: '0',
              transition: 'opacity 0.3s ease-in-out',
            },
            ':hover': {
              '.ai-generate-summary-left-icon': {
                opacity: '1',
              },
            },
            '.MuiInputBase-root': {
              p: 0,
            },
          }}
        >
          <Stack
            className='ai-generate-summary-left-icon'
            direction={'row'}
            alignItems={'center'}
            gap={0.5}
            onClick={() => {
              if (!readOnly) setShowSummary(true);
            }}
            sx={{
              position: 'absolute',
              top: -18,
              left: 0,
              zIndex: 1,
              lineHeight: '18px',
              cursor: readOnly ? 'default' : 'pointer',
              fontSize: 12,
              color: 'text.tertiary',
              ...(!readOnly && {
                ':hover': {
                  color: 'text.primary',
                },
              }),
            }}
          >
            <IconDJzhinengzhaiyao sx={{ fontSize: 12 }} />
            文档摘要
          </Stack>
          {nodeDetail?.meta?.summary ? (
            <TextField
              value={summary}
              multiline
              fullWidth
              placeholder='暂无摘要，可在此处输入摘要'
              slotProps={{
                input: {
                  readOnly,
                  sx: {
                    bgcolor: 'background.paper2',
                    fontSize: 14,
                    lineHeight: '28px',
                    letterSpacing: '1px',
                    fontWeight: 'normal',
                    color: 'text.secondary',
                    '& fieldset': {
                      border: 'none !important',
                    },
                  },
                },
              }}
              onChange={e => {
                if (readOnly) return;
                setSummary(e.target.value);
                debouncedUpdateSummary(e.target.value);
              }}
            />
          ) : (
            <Box sx={{ fontSize: 12, color: 'text.tertiary' }}>
              暂无摘要
              {!readOnly && (
                <>
                  ，点击
                  <Box
                    component='span'
                    sx={{ color: 'primary.main', cursor: 'pointer' }}
                    onClick={() => setShowSummary(true)}
                  >
                    生成摘要
                  </Box>
                </>
              )}
            </Box>
          )}
        </Box>
      </>
    );
  };

  useEffect(() => {
    setSummary(nodeDetail?.meta?.summary || '');
  }, [nodeDetail]);

  // 当summary变化时检查是否有编辑
  useEffect(() => {
    checkIfEdited();
  }, [summary]);

  useEffect(() => {
    setTitle(defaultDetail?.name || '');
    setSummary(defaultDetail?.meta?.summary || '');
    initialStateRef.current = {
      content: defaultDetail.content || '',
      summary: defaultDetail.meta?.summary || '',
      emoji: defaultDetail.meta?.emoji || '',
    };
    setIsEditing(false);
  }, [defaultDetail]);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [handleGlobalKeydown]);

  useEffect(() => {
    if (readOnly) return;
    if (state && state.node && editorRef.editor) {
      const newContent = state.node.content || nodeDetail?.content || '';
      const newSummary =
        state.node.meta?.summary || nodeDetail?.meta?.summary || '';
      const newEmoji = state.node.meta?.emoji || nodeDetail?.meta?.emoji || '';
      updateDetail({
        name: state.node.name || nodeDetail?.name || '',
        meta: {
          summary: newSummary,
          emoji: newEmoji,
        },
        content: newContent,
      });
      editorRef.setContent(newContent);
      initialStateRef.current = {
        content: newContent,
        summary: newSummary,
        emoji: newEmoji,
      };
      setIsEditing(false);
      navigate(`/doc/editor/${defaultDetail.id}`);
    }
  }, [state, editorRef.editor, readOnly]);

  useEffect(() => {
    const handleTabClose = () => {
      if (readOnly) return;
      if (isEditing) {
        let content = nodeDetail?.content || '';
        if (!isMarkdown) {
          content = editorRef.getContent();
          updateDetail({
            content: content,
          });
        }
        onSave(content);
        // 更新初始状态引用
        initialStateRef.current = {
          content: content,
          summary: summary,
          emoji: nodeDetail?.meta?.emoji || '',
        };
      }
    };
    const handleVisibilityChange = () => {
      if (readOnly) return;
      if (document.hidden && isEditing) {
        let content = nodeDetail?.content || '';
        if (!isMarkdown) {
          content = editorRef.getContent();
          updateDetail({
            content: content,
          });
        }
        onSave(content);
        // 更新初始状态引用
        initialStateRef.current = {
          content: content,
          summary: summary,
          emoji: nodeDetail?.meta?.emoji || '',
        };
      }
    };
    window.addEventListener('beforeunload', handleTabClose);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    editorRef,
    isEditing,
    summary,
    nodeDetail?.meta?.emoji,
    nodeDetail?.content,
    isMarkdown,
    readOnly,
  ]);

  useEffect(() => {
    return () => {
      if (editorRef) editorRef.editor.destroy();
    };
  }, []);

  useEffect(() => {
    if (readOnly) return;
    if (id !== defaultDetail.id) changeCatalogItem();
  }, [id, readOnly, defaultDetail.id, changeCatalogItem]);

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: catalogOpen ? 292 : 0,
          right: 0,
          zIndex: 10,
          bgcolor: 'background.default',
          transition: 'left 0.3s ease-in-out',
        }}
      >
        <Header
          edit={isEditing}
          readOnly={readOnly}
          detail={nodeDetail!}
          updateDetail={updateDetail}
          handleSave={async () => {
            if (readOnly) return;
            if (editorRef) {
              let content = nodeDetail?.content || '';
              if (!isMarkdown) {
                content = editorRef.getContent();
                updateDetail({
                  content: content,
                });
              }
              await onSave(content);
              initialStateRef.current = {
                content: content,
                summary: summary,
                emoji: nodeDetail?.meta?.emoji || '',
              };
              setIsEditing(false);
            }
          }}
          handleExport={handleExport}
        />
        {!isMarkdown && !readOnly && (
          <Toolbar editorRef={editorRef} handleAiGenerate={handleAiGenerate} />
        )}
      </Box>
      <Box
        sx={{ ...(fixedToc && { display: 'flex' }) }}
        onKeyDown={event => {
          if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            return;
          }
          if (
            isMarkdown &&
            (event.ctrlKey || event.metaKey) &&
            event.key === 'b'
          ) {
            return;
          }
          event.stopPropagation();
        }}
      >
        {isMarkdown ? (
          <Box
            sx={{
              mt: '56px',
              px: 10,
              pt: 4,
              pb: 3,
              flex: 1,
            }}
          >
            <Box>{renderEditorTitleEmojiSummary()}</Box>
            <EditorMarkdown
              ref={markdownEditorRef}
              editor={editorRef.editor}
              value={nodeDetail?.content || ''}
              readOnly={readOnly ? 'true' : ''}
              onUpload={handleUpload}
              placeholder='请输入文档内容'
              onAceChange={value => {
                if (readOnly) return;
                updateDetail({
                  content: value,
                });
              }}
              height='calc(100vh - 127px)'
            />
          </Box>
        ) : (
          <FullTextEditor
            editor={editorRef.editor}
            fixed={fixedToc}
            header={renderEditorTitleEmojiSummary()}
            contentMarginTop={readOnly ? '56px' : '102px'}
          />
        )}
      </Box>
      <Toc
        headings={headings}
        fixed={fixedToc}
        isMarkdown={isMarkdown}
        setFixed={setFixedToc}
        setShowSummary={setShowSummary}
        scrollToHeading={
          isMarkdown
            ? headingText =>
                markdownEditorRef.current?.scrollToHeading(headingText)
            : undefined
        }
      />
      <AIGenerate
        open={aiGenerateOpen}
        selectText={selectionText}
        onClose={() => setAiGenerateOpen(false)}
        editorRef={editorRef}
      />
      <Summary
        open={showSummary}
        updateDetail={updateDetail}
        onClose={() => setShowSummary(false)}
      />
    </>
  );
};

export default Wrap;
