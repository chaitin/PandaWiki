import { uploadFile } from '@/api';
import Emoji from '@/components/Emoji';
import { BUSINESS_VERSION_PERMISSION } from '@/constant/version';
import {
  postApiV1CreationTabComplete,
  postApiV1FileUploadUrl,
  putApiV1NodeDetail,
} from '@/request';
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
}

const Wrap = ({ detail: defaultDetail }: WrapProps) => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { license } = useAppSelector(state => state.config);

  const state = useLocation().state as { node?: V1NodeDetailResp };
  const {
    catalogOpen,
    setCatalogOpen,
    nodeDetail,
    setNodeDetail,
    onSave,
    catalogData,
  } = useOutletContext<WrapContext>();

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
    [defaultDetail.id, defaultDetail.kb_id],
  );

  const debouncedUpdateTitle = useCallback(
    debounce((newTitle: string) => {
      putApiV1NodeDetail({
        id: defaultDetail.id!,
        kb_id: defaultDetail.kb_id!,
        name: newTitle,
      });
    }, 500),
    [defaultDetail.id, defaultDetail.kb_id],
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

  const handleUploadByImgUrl = async (
    url: string,
    abortSignal?: AbortSignal,
  ) => {
    const { key } = await postApiV1FileUploadUrl(
      {
        kb_id: defaultDetail.kb_id!,
        url,
      },
      {
        signal: abortSignal,
      },
    );
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
    editable: !isMarkdown,
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
    onUploadImgUrl: handleUploadByImgUrl,
    onUpdate: handleUpdate,
    onTocUpdate: handleTocUpdate,
    onAiWritingGetSuggestion: handleAiWritingGetSuggestion,
  });

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
  ]);

  const handleGlobalKeydown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        changeCatalogItem();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        setCatalogOpen(!catalogOpen);
      }
    },
    [changeCatalogItem, catalogOpen, setCatalogOpen],
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
              setTitle(e.target.value);
              updateDetail({
                name: e.target.value,
              });
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
            onClick={() => setShowSummary(true)}
            sx={{
              position: 'absolute',
              top: -18,
              left: 0,
              zIndex: 1,
              lineHeight: '18px',
              cursor: 'pointer',
              fontSize: 12,
              color: 'text.tertiary',
              ':hover': {
                color: 'text.primary',
              },
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
                setSummary(e.target.value);
                debouncedUpdateSummary(e.target.value);
              }}
            />
          ) : (
            <Box sx={{ fontSize: 12, color: 'text.tertiary' }}>
              暂无摘要，点击
              <Box
                component='span'
                sx={{ color: 'primary.main', cursor: 'pointer' }}
                onClick={() => setShowSummary(true)}
              >
                生成摘要
              </Box>
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
  }, [state, editorRef.editor]);

  useEffect(() => {
    const handleTabClose = () => {
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
  ]);

  useEffect(() => {
    return () => {
      if (editorRef) editorRef.editor.destroy();
    };
  }, []);

  useEffect(() => {
    if (id !== defaultDetail.id) {
      // 检查当前文档是否存在于目录数据中（避免保存已删除的文档）
      const checkDocExists = (items: typeof catalogData): boolean => {
        for (const item of items) {
          if (item.id === defaultDetail.id) return true;
          if (item.children && checkDocExists(item.children)) return true;
        }
        return false;
      };

      // 只有文档存在时才执行保存
      if (checkDocExists(catalogData)) {
        changeCatalogItem();
      }
    }
  }, [id, catalogData, defaultDetail.id, changeCatalogItem]);

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
          detail={nodeDetail!}
          updateDetail={updateDetail}
          handleSave={async () => {
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
        {!isMarkdown && (
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
              onUpload={handleUpload}
              placeholder='请输入文档内容'
              onAceChange={value => {
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
