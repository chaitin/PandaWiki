import { ITreeItem } from '@/api';
import Card from '@/components/Card';
import DragTree from '@/components/Drag/DragTree';
import { getApiV1NavList } from '@/request/Nav';
import { postApiV1NodeBatchMove, postApiV1NodeMoveNav } from '@/request/Node';
import { DomainNodeListItemResp, V1NavListResp } from '@/request/types';
import { useAppSelector } from '@/store';
import { convertToTree } from '@/utils/drag';
import { message, Modal } from '@ctzhian/ui';
import { Box, Checkbox, Stack } from '@mui/material';
import { IconWenjianjiaKai } from '@panda-wiki/icons';
import { useEffect, useState } from 'react';

interface DocDeleteProps {
  open: boolean;
  onClose: () => void;
  data: DomainNodeListItemResp[];
  selected: DomainNodeListItemResp[];
  onMoved?: (payload: { ids: string[]; parentId: string }) => void;
  refresh: () => void;
}

const MoveDocs = ({
  open,
  onClose,
  data,
  selected,
  onMoved,
  refresh,
}: DocDeleteProps) => {
  const { kb_id, nav_id } = useAppSelector(state => state.config);
  const [tree, setTree] = useState<ITreeItem[]>([]);
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [navList, setNavList] = useState<V1NavListResp[]>([]);
  const [navLoading, setNavLoading] = useState(false);
  const [hasLoadedNavs, setHasLoadedNavs] = useState(false);
  const [targetNavId, setTargetNavId] = useState<string | null>(null);

  const loadNavList = () => {
    if (!kb_id || navLoading || hasLoadedNavs) return;
    setNavLoading(true);
    getApiV1NavList({ kb_id })
      .then(res => {
        const list = (res || []) as V1NavListResp[];
        setNavList(list);
        if (!targetNavId && list.length > 0) {
          const current =
            (nav_id &&
              list.find(item => item.id && item.id === String(nav_id))) ||
            null;
          setTargetNavId(current?.id || list[0]?.id || null);
        }
        setHasLoadedNavs(true);
      })
      .finally(() => {
        setNavLoading(false);
      });
  };

  useEffect(() => {
    if (open) {
      loadNavList();
    }
  }, [open]);

  const handleOk = () => {
    const ids = selected.filter(it => it.type === 1).map(it => it.id!);
    selected
      .filter(it => it.type === 2)
      .forEach(it => {
        if (!ids.includes(it.parent_id!)) {
          ids.push(it.id!);
        }
      });

    const isSameNav =
      nav_id && targetNavId && String(nav_id) === String(targetNavId);

    // 当前目录内移动：未选择其他目录，或选择的仍是当前目录
    if (!targetNavId || isSameNav) {
      if (folderIds.length === 0) {
        message.error('请选择移动路径');
        return;
      }
      const parent_id = folderIds.includes('root') ? '' : folderIds[0];
      postApiV1NodeBatchMove({ ids, parent_id, kb_id }).then(() => {
        message.success('移动成功');
        onClose();
        onMoved?.({ ids, parentId: parent_id });
        refresh();
      });
      return;
    }

    // 跨目录移动：选择了不同的目录
    if (!targetNavId) {
      message.error('请选择目标目录');
      return;
    }

    const payload = {
      ids,
      kb_id,
      nav_id: targetNavId,
    };

    postApiV1NodeMoveNav(payload).then(() => {
      message.success('移动成功');
      onClose();
      refresh();
    });
  };

  useEffect(() => {
    if (open && selected.length > 0) {
      const folder = selected.filter(it => it.type === 1).map(it => it.id);
      const filterData = data.filter(
        it => it.type === 1 && !folder.includes(it.id),
      );
      setTree(convertToTree(filterData));
    }
  }, [open, data, selected]);

  useEffect(() => {
    if (!open) {
      setFolderIds([]);
      setTargetNavId(null);
    }
  }, [open]);

  return (
    <Modal title='移动文档' open={open} onCancel={onClose} onOk={handleOk}>
      <Box sx={{ fontSize: 14, color: 'text.secondary', mb: 1 }}>
        已选中
        <Box component={'span'} sx={{ fontWeight: 700, color: 'primary.main' }}>
          {' '}
          {selected.length}{' '}
        </Box>
        个文档/文件夹，移动到
      </Box>
      <Card
        sx={{
          bgcolor: 'background.paper3',
          p: 1.5,
          maxHeight: 260,
          overflowY: 'auto',
        }}
      >
        {navLoading ? (
          <Box sx={{ fontSize: 14, color: 'text.secondary', p: 1 }}>
            目录加载中...
          </Box>
        ) : (
          <Stack gap={1}>
            {navList.map(item => {
              const isActive = !!targetNavId && targetNavId === item.id;
              const isCurrentNav =
                nav_id && item.id && String(nav_id) === String(item.id);
              const disabled = !!isCurrentNav;

              const handleSelectNav = () => {
                if (disabled) return;
                if (isActive) {
                  setTargetNavId(null);
                } else {
                  setTargetNavId(item.id || null);
                }
              };

              return (
                <Box key={item.id}>
                  <Stack
                    direction='row'
                    alignItems='center'
                    gap={1}
                    sx={{
                      fontSize: 14,
                      cursor: disabled ? 'default' : 'pointer',
                    }}
                    onClick={handleSelectNav}
                  >
                    <Checkbox
                      sx={{
                        color: 'text.disabled',
                        width: '24px',
                        height: '24px',
                      }}
                      checked={isActive}
                      disabled={disabled}
                      onClick={e => e.stopPropagation()}
                      onChange={handleSelectNav}
                    />
                    <Box
                      component='span'
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Box
                        component='span'
                        sx={{
                          fontWeight: 600,
                        }}
                      >
                        {item.name}
                      </Box>

                      <Box
                        component='span'
                        sx={{
                          ml: 0.5,
                          fontSize: 12,
                          color: 'text.secondary',
                        }}
                      >
                        {isCurrentNav ? '（当前目录）' : '（其他目录）'}
                      </Box>
                    </Box>
                  </Stack>
                  {isCurrentNav && (
                    <Box sx={{ mt: 0.5, pl: 2.5 }}>
                      <Stack
                        direction={'row'}
                        alignItems={'center'}
                        gap={1}
                        sx={{ fontSize: 14, cursor: 'pointer' }}
                        onClick={e => {
                          e.stopPropagation();
                          setFolderIds(
                            folderIds.includes('root') ? [] : ['root'],
                          );
                        }}
                      >
                        <Checkbox
                          sx={{
                            color: 'text.disabled',
                            width: '35px',
                            height: '35px',
                          }}
                          checked={folderIds.includes('root')}
                        />
                        <IconWenjianjiaKai sx={{ fontSize: 14 }} />
                        <Box sx={{ fontSize: 13, color: 'text.secondary' }}>
                          根路径
                        </Box>
                      </Stack>
                      <DragTree
                        ui='select'
                        selected={folderIds}
                        data={tree}
                        readOnly={true}
                        relativeSelect={false}
                        onSelectChange={(ids, id = '') => {
                          if (folderIds.includes(id)) {
                            setFolderIds([]);
                          } else {
                            setFolderIds([id]);
                          }
                        }}
                      />
                    </Box>
                  )}
                </Box>
              );
            })}
            {navList.length === 0 && !navLoading && (
              <Box sx={{ fontSize: 14, color: 'text.secondary', p: 1 }}>
                暂无可用目录
              </Box>
            )}
          </Stack>
        )}
      </Card>
    </Modal>
  );
};

export default MoveDocs;
