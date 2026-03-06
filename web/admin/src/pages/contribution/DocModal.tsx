import { ITreeItem } from '@/api';
import Card from '@/components/Card';
import DragTree from '@/components/Drag/DragTree';
import { getApiV1NodeListGroupNav } from '@/request/Node';
import {
  DomainNodeType,
  GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { convertToTree } from '@/utils/drag';
import { Ellipsis, Modal } from '@ctzhian/ui';
import { Box, Checkbox, Stack } from '@mui/material';
import { IconWenjianjiaKai } from '@panda-wiki/icons';
import { useEffect, useMemo, useState } from 'react';

interface DocDeleteProps {
  open: boolean;
  onClose: () => void;
  onOk: (params: { nav_id: string; parent_id: string }) => void;
}

const DocModal = ({ open, onClose, onOk }: DocDeleteProps) => {
  const { kb_id } = useAppSelector(state => state.config);
  const [groups, setGroups] = useState<
    GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp[]
  >([]);
  const [selectedNavId, setSelectedNavId] = useState<string | null>(null);
  const [tree, setTree] = useState<ITreeItem[]>([]);
  const [folderIds, setFolderIds] = useState<string[]>([]);

  const handleOk = () => {
    if (!selectedNavId) return;
    const parentId = folderIds.includes('root') ? '' : folderIds[0] || '';
    onOk({
      nav_id: selectedNavId,
      parent_id: parentId,
    });
  };

  useEffect(() => {
    if (open) {
      if (!kb_id) return;
      getApiV1NodeListGroupNav({ kb_id }).then(res => {
        const list = res || [];
        setGroups(list);
        const firstNavId = list[0]?.nav_id || null;
        setSelectedNavId(firstNavId);
      });
    }
  }, [open]);

  const currentNavFolders = useMemo(() => {
    if (!selectedNavId) return [];
    const group = groups.find(g => g.nav_id === selectedNavId);
    if (!group?.list) return [];
    return group.list.filter(
      item => item.type === DomainNodeType.NodeTypeFolder,
    );
  }, [groups, selectedNavId]);

  useEffect(() => {
    if (currentNavFolders.length) {
      setTree(convertToTree(currentNavFolders));
    } else {
      setTree([]);
    }
    setFolderIds(['root']);
  }, [currentNavFolders]);

  return (
    <Modal
      title='选择目录'
      width={800}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
    >
      <Stack direction='row' gap={2} sx={{ minHeight: 320 }}>
        <Card sx={{ width: 220, minWidth: 220 }}>
          <Stack>
            {groups.map((nav, index) => {
              const selected = selectedNavId === nav.nav_id;
              const isLast = index === groups.length - 1;
              return (
                <Box
                  key={nav.nav_id}
                  onClick={() => setSelectedNavId(nav.nav_id || '')}
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 2,
                    cursor: 'pointer',
                    ...(!isLast && {
                      borderBottom: '1px dashed',
                      borderColor: 'divider',
                    }),
                    '&:hover .nav-name': {
                      color: 'primary.main',
                    },
                  }}
                >
                  {selected && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: -2,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 4,
                        height: 24,
                        borderRadius: 1,
                        bgcolor: 'primary.main',
                      }}
                    />
                  )}
                  <Ellipsis
                    className='nav-name'
                    sx={{
                      flex: 1,
                      width: 0,
                      fontSize: 14,
                      fontWeight: selected ? 600 : 400,
                      color: selected ? 'primary.main' : 'text.primary',
                    }}
                  >
                    {nav.nav_name || '未命名'}
                  </Ellipsis>
                </Box>
              );
            })}
            {!groups.length && (
              <Box sx={{ fontSize: 13, color: 'text.secondary', py: 2, px: 2 }}>
                暂无目录
              </Box>
            )}
          </Stack>
        </Card>
        <Card sx={{ bgcolor: 'background.paper3', p: 1, flex: 1, minWidth: 0 }}>
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={1}
            sx={{ fontSize: 14, cursor: 'pointer' }}
          >
            <Checkbox
              sx={{ color: 'text.disabled', width: '35px', height: '35px' }}
              checked={folderIds.includes('root')}
              onChange={() => {
                setFolderIds(folderIds.includes('root') ? [] : ['root']);
              }}
            />
            <IconWenjianjiaKai sx={{ fontSize: 16 }} />
            <Box>根路径</Box>
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
        </Card>
      </Stack>
    </Modal>
  );
};

export default DocModal;
