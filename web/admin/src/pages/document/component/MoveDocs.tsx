import { batchMoveNode, ITreeItem, NodeListItem } from '@/api';
import Card from '@/components/Card';
import DragTree from '@/components/Drag/DragTree';
import { useAppSelector } from '@/store';
import { convertToTree } from '@/utils/drag';
import { Box, Checkbox, Stack } from '@mui/material';
import { Icon, Message, Modal } from 'ct-mui';
import { useEffect, useState } from 'react';

interface DocDeleteProps {
  open: boolean;
  onClose: () => void;
  data: NodeListItem[];
  selected: NodeListItem[];
  refresh?: () => void;
}

const MoveDocs = ({
  open,
  onClose,
  data,
  selected,
  refresh,
}: DocDeleteProps) => {
  const { kb_id } = useAppSelector(state => state.config);
  const [tree, setTree] = useState<ITreeItem[]>([]);
  const [folderIds, setFolderIds] = useState<string[]>([]);

  const handleOk = () => {
    if (folderIds.length === 0) {
      Message.error('请选择移动路径');
      return;
    }
    let ids = selected.filter(it => it.type === 1).map(it => it.id);
    selected
      .filter(it => it.type === 2)
      .forEach(it => {
        if (!ids.includes(it.parent_id)) {
          ids.push(it.id);
        }
      });
    const parent_id = folderIds.includes('root') ? '' : folderIds[0];
    batchMoveNode({ ids, parent_id, kb_id }).then(() => {
      Message.success('移动成功');
      onClose();
      refresh?.();
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

  return (
    <Modal title='移动文档' open={open} onCancel={onClose} onOk={handleOk}>
      <Box sx={{ fontSize: 14, mb: 1, color: 'text.secondary' }}>
        已选中
        <Box
          component={'span'}
          sx={{ fontFamily: 'Gbold', color: 'primary.main' }}
        >
          {' '}
          {selected.length}{' '}
        </Box>
        个文档/文件夹，移动到
      </Box>
      <Card sx={{ bgcolor: 'background.paper2', p: 1 }}>
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
          <Icon type={'icon-wenjianjia-kai'} />
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
    </Modal>
  );
};

export default MoveDocs;
