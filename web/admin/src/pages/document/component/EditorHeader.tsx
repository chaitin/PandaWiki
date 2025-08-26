import { NodeListItem } from '@/api';
import Emoji from '@/components/Emoji';
import DocAddByCustomText from '@/pages/document/component/DocAddByCustomText';
import DocDelete from '@/pages/document/component/DocDelete';
import { V1NodeDetailResp } from '@/request';
import { postApiV1Node, putApiV1NodeDetail } from '@/request/Node';
import {
  DomainGetNodeReleaseDetailResp,
  DomainNodeReleaseListItem,
} from '@/request/pro/types';
import { useAppSelector } from '@/store';
import { addOpacityToColor, getShortcutKeyText } from '@/utils';
import InfoIcon from '@mui/icons-material/Info';
import {
  Box,
  Button,
  IconButton,
  Stack,
  styled,
  Tooltip,
  useTheme,
} from '@mui/material';
import { UseTiptapReturn } from '@yu-cq/tiptap';
import { Ellipsis, Icon, MenuSelect, Message } from 'ct-mui';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import VersionRollback from './VersionRollback';

const StyledMenuSelect = styled('div')<{ disabled?: boolean }>(
  ({ theme, disabled = false }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between ',
    fontSize: 14,
    padding: theme.spacing(0, 2),
    lineHeight: '40px',
    height: 40,
    width: 106,
    borderRadius: '5px',
    color: disabled ? theme.palette.text.secondary : theme.palette.text.primary,
    cursor: disabled ? 'not-allowed' : 'pointer',
    ':hover': {
      backgroundColor: disabled
        ? 'transparent'
        : addOpacityToColor(theme.palette.primary.main, 0.1),
    },
  }),
);

interface EditorHeaderProps {
  editorRef: UseTiptapReturn;
  detail: V1NodeDetailResp | null;
  setDetail?: (data: V1NodeDetailResp) => void;
  onSave: (auto?: boolean, publish?: boolean) => void;
  resetTimer?: () => void;
  cancelTimer?: () => void;
  setShowVersion: (show: boolean) => void;
  showVersion: boolean;
  setDocContent: (content: string) => void;
  curVersion:
  | (DomainGetNodeReleaseDetailResp & { release: DomainNodeReleaseListItem })
  | null;
}

const EditorHeader = ({
  editorRef,
  detail,
  onSave,
  resetTimer,
  cancelTimer,
  setDetail,
  setShowVersion,
  showVersion,
  curVersion,
  setDocContent,
}: EditorHeaderProps) => {
  const editor = editorRef?.editor || null;
  const theme = useTheme();
  const { kb_id, license } = useAppSelector(state => state.config);
  const [renameOpen, setRenameOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);

  const isEnterprise = useMemo(() => {
    return license.edition === 2;
  }, [license]);

  const handleRollback = () => {
    if (!curVersion || !detail) return;
    setDetail?.({
      ...detail,
      name: curVersion?.name || '',
      content: curVersion?.content || '',
      meta: curVersion?.meta || {},
      status: 1,
    });
    setDocContent(curVersion?.content || '');
    setRollbackOpen(false);
    setShowVersion(false);
    Message.success(
      `已使用版本 ${curVersion.release.release_name} 内容，需要保存并发布才能生效`,
      5,
    );
  };

  const handleSave = (publish?: boolean) => {
    if (publish && detail?.status === 2) {
      Message.info('当前已是最新版本！');
    } else {
      onSave(undefined, publish);
    }
  };

  const handleExport = async (type: string) => {
    if (!editorRef || !editor) return;
    cancelTimer?.();
    if (type === 'html') {
      const html = editorRef.getHTML();
      if (!html) return;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${detail?.name}.html`;
      a.click();
      URL.revokeObjectURL(url);
      Message.success('导出成功');
    }
    if (type === 'md') {
      const markdown = editorRef.getMarkdownByJSON();
      if (!markdown) return;
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${detail?.name}.md`;
      a.click();
      URL.revokeObjectURL(url);
      Message.success('导出成功');
    }

    resetTimer?.();
  };

  if (!detail) return null;

  return (
    <>
      <Stack
        direction={'row'}
        alignItems={'center'}
        gap={3}
        justifyContent={'space-between'}
        sx={{
          width: 920,
          margin: 'auto',
        }}
      >
        {showVersion ? (
          <>
            <Stack direction={'row'} gap={1} flex={1}>
              <Button
                sx={{ color: 'text.primary', flexShrink: 0 }}
                startIcon={
                  <Icon
                    type='icon-dengchu'
                    sx={{ transform: 'rotate(180deg)', fontSize: 18 }}
                  />
                }
                onClick={() => setShowVersion(false)}
              >
                返回编辑
              </Button>
              <Stack direction={'row'} alignItems={'center'} gap={1} flex={1}>
                <Emoji
                  sx={{ flexShrink: 0 }}
                  readOnly
                  type={2}
                  value={curVersion?.meta?.emoji}
                />
                <Ellipsis
                  sx={{ fontSize: 18, fontWeight: 'bold', width: 0, flex: 1 }}
                >
                  {curVersion?.name}
                </Ellipsis>
              </Stack>
            </Stack>
            <Stack
              direction={'row'}
              alignItems={'center'}
              gap={2}
              sx={{ flexShrink: 0 }}
            >
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={0.5}
                sx={{
                  fontSize: 12,
                  color: 'text.auxiliary',
                  fontFamily: 'Mono',
                }}
              >
                <Icon type='icon-banben1' />
                {curVersion?.release.release_name}
              </Stack>
              <Button variant='contained' onClick={() => setRollbackOpen(true)}>
                使用当前版本
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <Stack direction={'row'} alignItems={'center'} gap={1} flex={1}>
              <Emoji
                sx={{ flexShrink: 0 }}
                readOnly={showVersion}
                type={detail?.type || 2}
                value={detail?.meta?.emoji || ''}
                onChange={value => {
                  cancelTimer?.();
                  putApiV1NodeDetail({
                    id: detail.id!,
                    kb_id: kb_id,
                    emoji: value,
                  })
                    .then(() => {
                      Message.success('修改成功');
                      setDetail?.({
                        ...detail,
                        updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                        meta: { ...detail.meta, emoji: value },
                        status: 1,
                      });
                    })
                    .finally(() => {
                      resetTimer?.();
                    });
                }}
              />
              <Ellipsis
                sx={{ fontSize: 18, fontWeight: 'bold', width: 0, flex: 1 }}
              >
                {detail?.name}
              </Ellipsis>
            </Stack>
            <Stack
              direction={'row'}
              alignItems={'center'}
              gap={2}
              flexShrink={0}
            >
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={0.5}
                sx={{ fontSize: 12, color: 'text.auxiliary' }}
              >
                <Icon type='icon-baocun' />
                {dayjs(detail.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Stack>
              <MenuSelect
                list={[
                  {
                    key: 'copy',
                    label: <StyledMenuSelect>复制</StyledMenuSelect>,
                    onClick: () => {
                      if (kb_id) {
                        postApiV1Node({
                          name: detail.name + ' [副本]',
                          content: detail.content,
                          kb_id: kb_id,
                          parent_id: detail.parent_id || undefined,
                          type: detail.type || 2,
                          emoji: detail.meta?.emoji || '',
                        }).then(res => {
                          Message.success('复制成功');
                          window.open(`/doc/editor/${res.id}`, '_blank');
                        });
                      }
                    },
                  },
                  {
                    key: 'version',
                    label: (
                      <StyledMenuSelect disabled={!isEnterprise}>
                        历史版本{' '}
                        {!isEnterprise && (
                          <Tooltip title='企业版可用' placement='top' arrow>
                            <InfoIcon
                              sx={{ color: 'text.secondary', fontSize: 14 }}
                            />
                          </Tooltip>
                        )}
                      </StyledMenuSelect>
                    ),
                    onClick: () => {
                      if (isEnterprise) {
                        setShowVersion(true);
                      }
                    },
                  },
                  {
                    key: 'rename',
                    label: <StyledMenuSelect>重命名</StyledMenuSelect>,
                    onClick: () => {
                      cancelTimer?.();
                      setRenameOpen(true);
                    },
                  },
                  {
                    key: 'delete',
                    label: <StyledMenuSelect>删除</StyledMenuSelect>,
                    onClick: () => {
                      setDelOpen(true);
                    },
                  },
                ]}
                context={
                  <IconButton size='small'>
                    <Icon type='icon-gengduo' />
                  </IconButton>
                }
              />
              <MenuSelect
                list={[
                  {
                    key: 'html',
                    label: (
                      <Stack
                        direction={'row'}
                        alignItems={'center'}
                        gap={1}
                        sx={{
                          fontSize: 14,
                          px: 2,
                          lineHeight: '40px',
                          height: 40,
                          width: 140,
                          borderRadius: '5px',
                          cursor: 'pointer',
                          ':hover': {
                            bgcolor: addOpacityToColor(
                              theme.palette.primary.main,
                              0.1,
                            ),
                          },
                        }}
                      >
                        导出 HTML
                      </Stack>
                    ),
                    onClick: () => handleExport('html'),
                  },
                  {
                    key: 'md',
                    label: (
                      <Stack
                        direction={'row'}
                        alignItems={'center'}
                        gap={1}
                        sx={{
                          fontSize: 14,
                          px: 2,
                          lineHeight: '40px',
                          height: 40,
                          width: 140,
                          borderRadius: '5px',
                          cursor: 'pointer',
                          ':hover': {
                            bgcolor: addOpacityToColor(
                              theme.palette.primary.main,
                              0.1,
                            ),
                          },
                        }}
                      >
                        导出 Markdown
                      </Stack>
                    ),
                    onClick: () => handleExport('md'),
                  },
                ]}
                context={
                  <Button
                    size='small'
                    variant='outlined'
                    startIcon={<Icon type='icon-daochu' />}
                  >
                    导出
                  </Button>
                }
              />
              <MenuSelect
                list={[
                  {
                    key: 'save',
                    label: (
                      <Tooltip
                        title={<Box>{getShortcutKeyText(['ctrl', 's'])}</Box>}
                        placement='right'
                        arrow
                      >
                        <Stack
                          direction={'row'}
                          alignItems={'center'}
                          gap={1}
                          sx={{
                            fontSize: 14,
                            px: 2,
                            lineHeight: '40px',
                            height: 40,
                            width: 140,
                            borderRadius: '5px',
                            cursor: 'pointer',
                            ':hover': {
                              bgcolor: addOpacityToColor(
                                theme.palette.primary.main,
                                0.1,
                              ),
                            },
                          }}
                        >
                          保存
                        </Stack>
                      </Tooltip>
                    ),
                    onClick: () => handleSave(false),
                  },
                  {
                    key: 'save_publish',
                    label: (
                      <Stack
                        direction={'row'}
                        alignItems={'center'}
                        gap={1}
                        sx={{
                          fontSize: 14,
                          px: 2,
                          lineHeight: '40px',
                          height: 40,
                          width: 140,
                          borderRadius: '5px',
                          cursor: 'pointer',
                          ':hover': {
                            bgcolor: addOpacityToColor(
                              theme.palette.primary.main,
                              0.1,
                            ),
                          },
                        }}
                      >
                        保存并发布
                      </Stack>
                    ),
                    onClick: () => handleSave(true),
                  },
                ]}
                context={
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={<Icon type='icon-baocun' />}
                  >
                    保存
                  </Button>
                }
              />
            </Stack>
          </>
        )}
      </Stack>
      <DocAddByCustomText
        type={detail.type}
        open={renameOpen}
        onClose={() => {
          resetTimer?.();
          setRenameOpen(false);
        }}
        data={detail}
        setDetail={setDetail}
      />
      <DocDelete
        open={delOpen}
        onClose={() => {
          setDelOpen(false);
        }}
        data={[
          {
            ...detail,
            emoji: detail.meta?.emoji || '',
            parent_id: '',
            summary: detail.meta?.summary || '',
            position: 0,
            status: 1,
          } as NodeListItem,
        ]}
        refresh={() => {
          setTimeout(() => {
            window.close();
          }, 1500);
        }}
      />
      {curVersion && (
        <VersionRollback
          open={rollbackOpen}
          data={curVersion.release}
          onClose={() => {
            setRollbackOpen(false);
          }}
          onOk={handleRollback}
        />
      )}
    </>
  );
};

export default EditorHeader;
