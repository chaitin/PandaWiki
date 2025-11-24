import { ITreeItem } from '@/api';
import Card from '@/components/Card';
import DragTree from '@/components/Drag/DragTree';
import { postApiV1NodeRestudy } from '@/request';
import { getApiV1NodeList } from '@/request/Node';
import {
  ConstsNodeRagInfoStatus,
  DomainNodeListItemResp,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { convertToTree } from '@/utils/drag';
import { message, Modal } from '@ctzhian/ui';
import { Box, Checkbox, Stack } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

interface RagErrorReStartProps {
  open: boolean;
  defaultSelected?: string[];
  onClose: () => void;
  refresh: () => void;
}

const RagErrorReStart = ({
  open,
  defaultSelected = [],
  onClose,
  refresh,
}: RagErrorReStartProps) => {
  const { kb_id } = useAppSelector(state => state.config);

  const [selected, setSelected] = useState<string[]>([]);
  const [treeList, setTreeList] = useState<ITreeItem[]>([]);
  const [list, setList] = useState<DomainNodeListItemResp[]>([]);

  const getData = () => {
    getApiV1NodeList({ kb_id }).then(res => {
      const ragErrorData =
        res?.filter(
          item =>
            item.type === 2 &&
            item.rag_info?.status &&
            [
              ConstsNodeRagInfoStatus.NodeRagStatusFailed,
              ConstsNodeRagInfoStatus.NodeRagStatusPending,
            ].includes(item.rag_info.status),
        ) || [];
      setList(ragErrorData);
      setSelected(
        defaultSelected.length > 0
          ? defaultSelected
          : ragErrorData.map(it => it.id!),
      );
      const showTreeData = convertToTree(ragErrorData || []);
      setTreeList(showTreeData);
    });
  };

  const onSubmit = () => {
    if (selected.length > 0) {
      postApiV1NodeRestudy({
        kb_id,
        node_ids: [...selected],
      }).then(() => {
        message.success('正在学习');
        setSelected([]);
        onClose();
        refresh();
      });
    } else {
      message.error(
        list.length > 0 ? '请选择需要学习的文档' : '暂无需要学习的文档',
      );
    }
  };

  useEffect(() => {
    if (open) {
      getData();
    }
  }, [open, kb_id]);

  const selectedTotal = useMemo(() => {
    return list.filter(item => selected.includes(item.id!)).length;
  }, [selected, list]);

  return (
    <Modal title='学习文档' open={open} onCancel={onClose} onOk={onSubmit}>
      <Stack
        direction='row'
        component='label'
        alignItems={'center'}
        justifyContent={'space-between'}
        gap={1}
        sx={{
          cursor: 'pointer',
          borderRadius: '10px',
          fontSize: 14,
        }}
      >
        <Box>
          未学习/学习失败文档
          <Box
            component='span'
            sx={{ color: 'text.tertiary', fontSize: 12, pl: 1 }}
          >
            共 {list.length} 个，已选中 {selectedTotal} 个
          </Box>
        </Box>
        <Stack direction='row' alignItems={'center'}>
          <Box sx={{ color: 'text.tertiary', fontSize: 12 }}>全选</Box>
          <Checkbox
            size='small'
            sx={{
              p: 0,
              color: 'text.disabled',
              width: '35px',
              height: '35px',
            }}
            checked={selectedTotal === list.length}
            onChange={() => {
              setSelected(
                selectedTotal === list.length ? [] : list.map(item => item.id!),
              );
            }}
          />
        </Stack>
      </Stack>
      <Card sx={{ bgcolor: 'background.paper3', py: 1 }}>
        <Stack
          gap={0.25}
          sx={{
            fontSize: 14,
            maxHeight: 'calc(100vh - 520px)',
            overflowY: 'auto',
            px: 2,
          }}
        >
          <DragTree
            ui='select'
            readOnly
            selected={selected}
            data={treeList}
            refresh={getData}
            onSelectChange={ids => setSelected(ids)}
          />
        </Stack>
      </Card>
    </Modal>
  );
};

export default RagErrorReStart;
