import Cascader from '@/components/Cascader';
import { VersionCanUse } from '@/components/VersionMask';
import { BUSINESS_VERSION_PERMISSION } from '@/constant/version';
import VersionPublish from '@/pages/release/components/VersionPublish';
import { postApiV1Node } from '@/request';
import { postApiV1NodeForceUnlock } from '@/request/Node';
import {
  ConstsUserKBPermission,
  ConstsUserRole,
  V1NodeDetailResp,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { addOpacityToColor, getShortcutKeyText } from '@/utils';
import { Ellipsis, message } from '@ctzhian/ui';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Skeleton,
  Stack,
  styled,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  IconBaocun,
  IconDaochu,
  IconGengduo,
  IconMuluzhankai,
} from '@panda-wiki/icons';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { WrapContext } from '..';
import DocAddByCustomText from '../../component/DocAddByCustomText';
import DocDelete from '../../component/DocDelete';
import NodeDiffModal from './NodeDiffModal';

interface HeaderProps {
  edit: boolean;
  /** 他人占用编辑锁：仅浏览 */
  readOnly?: boolean;
  detail: V1NodeDetailResp;
  updateDetail: (detail: V1NodeDetailResp) => void;
  onRefreshEditingLock?: () => void;
  handleSave: () => void;
  handleExport: (type: string) => void;
}

const Header = ({
  edit,
  readOnly = false,
  detail,
  updateDetail,
  onRefreshEditingLock,
  handleSave,
  handleExport,
}: HeaderProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const firstLoad = useRef(true);
  const [wikiUrl, setWikiUrl] = useState<string>('');

  const { kb_id, license, kbList, user, kbDetail } = useAppSelector(
    state => state.config,
  );

  const currentKb = useMemo(() => {
    return kbList?.find(item => item.id === kb_id);
  }, [kbList, kb_id]);

  const canPublish = useMemo(() => {
    const isAdmin = user.role === ConstsUserRole.UserRoleAdmin;
    const userPerms = kbDetail.perms || [];
    return (
      isAdmin ||
      userPerms.includes(ConstsUserKBPermission.UserKBPermissionFullControl) ||
      userPerms.includes(ConstsUserKBPermission.UserKBPermissionAuditManage)
    );
  }, [user.role, kbDetail.perms]);

  const canForceUnlockEdit = useMemo(() => {
    const isAdmin = user.role === ConstsUserRole.UserRoleAdmin;
    const userPerms = kbDetail.perms || [];
    return (
      isAdmin ||
      userPerms.includes(ConstsUserKBPermission.UserKBPermissionFullControl) ||
      userPerms.includes(ConstsUserKBPermission.UserKBPermissionDocManage) ||
      userPerms.includes(ConstsUserKBPermission.UserKBPermissionAuditManage)
    );
  }, [user.role, kbDetail.perms]);

  const { catalogOpen, nodeDetail, setCatalogOpen } =
    useOutletContext<WrapContext>();

  const [renameOpen, setRenameOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);

  const [showSaveTip, setShowSaveTip] = useState(false);

  const isBusiness = useMemo(() => {
    return BUSINESS_VERSION_PERMISSION.includes(license.edition!);
  }, [license]);

  useEffect(() => {
    if (currentKb?.access_settings?.base_url) {
      setWikiUrl(currentKb.access_settings.base_url);
      return;
    }
    const host = currentKb?.access_settings?.hosts?.[0] || '';
    if (host === '') return;
    const { ssl_ports = [], ports = [] } = currentKb?.access_settings || {};

    if (ssl_ports) {
      if (ssl_ports.includes(443)) setWikiUrl(`https://${host}`);
      else if (ssl_ports.length > 0)
        setWikiUrl(`https://${host}:${ssl_ports[0]}`);
    } else if (ports) {
      if (ports.includes(80)) setWikiUrl(`http://${host}`);
      else if (ports.length > 0) setWikiUrl(`http://${host}:${ports[0]}`);
    }
  }, [currentKb]);

  const handlePublish = useCallback(() => {
    if (readOnly) return;
    if (nodeDetail?.status === 2 && !edit) {
      message.info('当前已是最新版本！');
    } else {
      handleSave();
      setTimeout(() => {
        setPublishOpen(true);
      }, 200);
    }
  }, [nodeDetail, edit, readOnly, handleSave]);

  const handleForceUnlock = useCallback(() => {
    if (!detail.id || !kb_id) return;
    postApiV1NodeForceUnlock({ id: detail.id, kb_id }).then(() => {
      message.success('已解除编辑锁');
      onRefreshEditingLock?.();
    });
  }, [detail.id, kb_id, onRefreshEditingLock]);

  useEffect(() => {
    if (nodeDetail?.updated_at && !firstLoad.current) {
      setShowSaveTip(true);
      setTimeout(() => {
        setShowSaveTip(false);
      }, 1500);
    }
    firstLoad.current = false;
  }, [nodeDetail?.updated_at]);

  return (
    <Box sx={{ p: 1 }}>
      {readOnly && (
        <Alert
          severity='info'
          sx={{ mb: 1, py: 0.25 }}
          action={
            canPublish || (canForceUnlockEdit && detail.editor_id) ? (
              <Stack direction='row' alignItems='center' spacing={0.5}>
                {canPublish && (
                  <Button
                    color='inherit'
                    size='small'
                    onClick={() => setDiffOpen(true)}
                  >
                    文档比对
                  </Button>
                )}
                {canForceUnlockEdit && detail.editor_id ? (
                  <Button
                    color='inherit'
                    size='small'
                    onClick={handleForceUnlock}
                  >
                    解除编辑锁
                  </Button>
                ) : null}
              </Stack>
            ) : undefined
          }
        >
          {detail.editor_id ? (
            <>
              文档由 {detail.editor_account || '其他用户'}
              占用编辑中，当前为只读浏览，无法修改或保存。
            </>
          ) : canPublish ? (
            <>
              当前为只读浏览，无法修改或保存。您可使用文档比对查看当前内容与已发布版本的差异。
            </>
          ) : (
            <>当前为只读浏览，无法修改或保存。</>
          )}
        </Alert>
      )}
      <Stack
        direction={'row'}
        alignItems={'center'}
        gap={1}
        justifyContent={'space-between'}
        sx={{ height: '40px' }}
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
        {detail.meta?.content_type === 'md' && (
          <Box
            component={'span'}
            sx={{
              fontSize: 10,
              color: 'white',
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
              px: 1,
              flexShrink: 0,
              fontWeight: '500',
              borderRadius: '4px',
              height: '20px',
              lineHeight: '20px',
              display: 'inline-block',
            }}
          >
            MD
          </Box>
        )}
        <Stack sx={{ width: 0, flex: 1 }}>
          {detail?.name ? (
            <Ellipsis sx={{ fontSize: 14, fontWeight: 'bold' }}>
              <Box
                component='span'
                sx={{ cursor: 'pointer' }}
                // onClick={() => setRenameOpen(true)}
              >
                {detail.name}
              </Box>
            </Ellipsis>
          ) : (
            <Skeleton variant='text' width={300} height={24} />
          )}
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={0.5}
            sx={{ fontSize: 12, color: 'text.tertiary' }}
          >
            <IconBaocun sx={{ fontSize: 12 }} />
            {showSaveTip ? (
              '已保存'
            ) : nodeDetail?.updated_at ? (
              dayjs(nodeDetail.updated_at).format('YYYY-MM-DD HH:mm:ss')
            ) : (
              <Skeleton variant='text' width={100} height={24} />
            )}
          </Stack>
        </Stack>
        <Stack direction={'row'} gap={1}>
          <Cascader
            list={[
              {
                key: 'copy',
                textSx: { flex: 1 },
                label: <StyledMenuSelect>复制</StyledMenuSelect>,
                onClick: () => {
                  if (kb_id) {
                    postApiV1Node({
                      name: detail.name + ' [副本]',
                      content: detail.content,
                      kb_id,
                      parent_id: detail.parent_id || undefined,
                      type: 2,
                      emoji: detail.meta?.emoji,
                    }).then(res => {
                      message.success('复制成功');
                      window.open(`/doc/editor/${res.id}`, '_blank');
                    });
                  }
                },
              },
              {
                key: 'front_doc',
                textSx: { flex: 1 },
                label: <StyledMenuSelect>前台查看</StyledMenuSelect>,
                onClick: () => {
                  if (detail.status !== 2 && !detail.publisher_id) {
                    message.warning('当前文档未发布，无法查看前台文档');
                    return;
                  }
                  window.open(`${wikiUrl}/node/${detail.id}`, '_blank');
                },
              },
              {
                key: 'version',
                textSx: { flex: 1 },
                label: (
                  <StyledMenuSelect disabled={!isBusiness}>
                    历史版本
                    <VersionCanUse permission={BUSINESS_VERSION_PERMISSION} />
                  </StyledMenuSelect>
                ),
                onClick: () => {
                  if (isBusiness) {
                    navigate(`/doc/editor/history/${detail.id}`);
                  }
                },
              },
              {
                key: 'diff',
                textSx: { flex: 1 },
                label: <StyledMenuSelect>文档比对</StyledMenuSelect>,
                onClick: () => {
                  setDiffOpen(true);
                },
              },
              {
                key: 'rename',
                show: !readOnly,
                textSx: { flex: 1 },
                label: <StyledMenuSelect>重命名</StyledMenuSelect>,
                onClick: () => {
                  setRenameOpen(true);
                },
              },
              {
                key: 'delete',
                show: !readOnly,
                textSx: { flex: 1 },
                label: <StyledMenuSelect>删除</StyledMenuSelect>,
                onClick: () => {
                  setDelOpen(true);
                },
              },
            ]}
            context={
              <IconButton
                size='small'
                disabled={!detail.name}
                sx={{ flexShrink: 0 }}
              >
                <IconGengduo sx={{ fontSize: 14 }} />
              </IconButton>
            }
          />
          <Cascader
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
                disabled={!detail.name}
                startIcon={<IconDaochu sx={{ fontSize: 14 }} />}
              >
                导出
              </Button>
            }
          />
          <Cascader
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
                onClick: handleSave,
              },
              ...(canPublish
                ? [
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
                      onClick: handlePublish,
                    },
                  ]
                : []),
            ]}
            context={
              <Button
                size='small'
                variant='contained'
                disabled={!detail.name || readOnly}
                startIcon={<IconBaocun sx={{ fontSize: 14 }} />}
              >
                保存
              </Button>
            }
          />
        </Stack>
      </Stack>
      <DocAddByCustomText
        type={detail.type}
        open={renameOpen}
        onClose={() => {
          setRenameOpen(false);
        }}
        data={detail}
        setDetail={updateDetail}
      />
      <VersionPublish
        open={publishOpen}
        defaultSelected={[detail.id!]}
        onClose={() => setPublishOpen(false)}
        refresh={() =>
          updateDetail({
            status: 2,
          })
        }
      />
      <DocDelete
        type='doc'
        open={delOpen}
        onClose={() => setDelOpen(false)}
        data={[
          {
            ...detail,
            emoji: detail.meta?.emoji || '',
            parent_id: '',
            summary: detail.meta?.summary || '',
            position: 0,
            status: 1,
          },
        ]}
      />
      <NodeDiffModal
        open={diffOpen}
        nodeId={detail.id || ''}
        kbId={kb_id}
        onClose={() => setDiffOpen(false)}
      />
    </Box>
  );
};

const StyledMenuSelect = styled('div')<{ disabled?: boolean }>(
  ({ theme, disabled = false }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between ',
    fontSize: 14,
    padding: theme.spacing(0, 2),
    lineHeight: '40px',
    height: 40,
    minWidth: 106,
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

export default Header;
