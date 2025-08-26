import VersionPublish from '@/pages/release/components/VersionPublish';
import { postApiV1Node } from '@/request';
import { V1NodeDetailResp } from '@/request/types';
import { useAppSelector } from '@/store';
import { addOpacityToColor, getShortcutKeyText } from '@/utils';
import InfoIcon from '@mui/icons-material/Info';
import {
  Box,
  Button,
  IconButton,
  Skeleton,
  Stack,
  styled,
  Tooltip,
  useTheme,
} from '@mui/material';
import { Ellipsis, Icon, MenuSelect, Message } from 'ct-mui';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { WrapContext } from '..';
import DocAddByCustomText from '../../component/DocAddByCustomText';
import DocDelete from '../../component/DocDelete';

interface HeaderProps {
  collaborativeUsers: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  isSyncing: boolean;
  detail: V1NodeDetailResp;
  updateDetail: (detail: V1NodeDetailResp) => void;
  handleSave: () => void;
  handleExport: (type: string) => void;
}

const Header = ({
  collaborativeUsers,
  isSyncing,
  detail,
  updateDetail,
  handleSave,
  handleExport,
}: HeaderProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const firstLoad = useRef(true);

  const { kb_id, license } = useAppSelector(state => state.config);
  const { catalogOpen, nodeDetail, setCatalogOpen } =
    useOutletContext<WrapContext>();

  const [renameOpen, setRenameOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const [showSaveTip, setShowSaveTip] = useState(false);

  const isEnterprise = useMemo(() => {
    return license.edition === 2;
  }, [license]);

  const handlePublish = useCallback(() => {
    if (nodeDetail?.status === 2) {
      Message.info('当前已是最新版本！');
    } else {
      handleSave();
      setPublishOpen(true);
    }
  }, [nodeDetail]);

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
        <Stack sx={{ width: 0, flex: 1 }}>
          {detail?.name ? (
            <Ellipsis sx={{ fontSize: 14, fontWeight: 'bold' }}>
              <Box
                component='span'
                sx={{ cursor: 'pointer' }}
                onClick={() => setRenameOpen(true)}
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
            sx={{ fontSize: 12, color: 'text.auxiliary' }}
          >
            <Icon type='icon-baocun' />
            {showSaveTip ? (
              '已保存'
            ) : nodeDetail?.updated_at ? (
              dayjs(nodeDetail.updated_at).format('YYYY-MM-DD HH:mm:ss')
            ) : (
              <Skeleton variant='text' width={100} height={24} />
            )}
          </Stack>
        </Stack>
        <Box sx={{ mr: 1 }}>
          {isSyncing ? (
            collaborativeUsers.length > 0 && (
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{ color: 'text.disabled', fontSize: 14 }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                  }}
                />
                {collaborativeUsers.length} 人在线
              </Stack>
            )
          ) : (
            <Stack
              direction={'row'}
              alignItems={'center'}
              gap={1}
              sx={{ color: 'text.disabled', fontSize: 14 }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'divider',
                }}
              />
              离线编辑
            </Stack>
          )}
        </Box>
        <Stack direction={'row'} gap={1}>
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
                      kb_id,
                      parent_id: detail.parent_id || undefined,
                      type: 2,
                      emoji: detail.meta?.emoji,
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
                    navigate(`/doc/editor/history/${detail.id}`);
                  }
                },
              },
              {
                key: 'rename',
                label: <StyledMenuSelect>重命名</StyledMenuSelect>,
                onClick: () => {
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
              <IconButton
                size='small'
                disabled={!detail.name}
                sx={{ flexShrink: 0 }}
              >
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
                disabled={!detail.name}
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
                onClick: handleSave,
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
                onClick: handlePublish,
              },
            ]}
            context={
              <Button
                size='small'
                variant='contained'
                disabled={!detail.name}
                startIcon={<Icon type='icon-baocun' />}
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
        refresh={() => {
          setTimeout(() => {
            window.close();
          }, 1500);
        }}
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

export default Header;
