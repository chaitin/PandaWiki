import { ITreeItem, NodeListFilterData } from '@/api';
import Nodata from '@/assets/images/nodata.png';
import DragTree from '@/components/Drag/DragTree';
import { getApiV1NodeList } from '@/request/Node';
import { useAppSelector } from '@/store';
import { convertToTree } from '@/utils/drag';
import { filterEmptyFolders } from '@/utils/tree';
import { Modal } from '@ctzhian/ui';
import { Box, Skeleton, Stack } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

interface AddRecommendContentProps {
  open: boolean;
  selected: string[];
  onChange: (value: string[]) => void;
  onClose: () => void;
  disabled?: (value: ITreeItem) => boolean;
}

const AddRecommendContent = ({
  open,
  selected,
  onChange,
  onClose,
  disabled,
}: AddRecommendContentProps) => {
  const [list, setList] = useState<ITreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { kb_id } = useAppSelector(state => state.config);
  const [selectedIds, setSelectedIds] = useState<string[]>(selected);

  const getData = useCallback(() => {
    setLoading(true);
    const params: NodeListFilterData = { kb_id };
    getApiV1NodeList(params)
      .then(res => {
        const filterData =
          res?.filter(item => item.type === 1 || item.status === 2) || [];
        const filterTreeData = convertToTree(filterData);
        const showTreeData = filterEmptyFolders(filterTreeData);
        setList(showTreeData);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [kb_id]);

  useEffect(() => {
    setSelectedIds(selected);
  }, [selected]);

  useEffect(() => {
    if (open && kb_id) getData();
  }, [open, kb_id, getData]);

  return (
    <Modal
      title='添加卡片'
      open={open}
      onOk={() => {
        onChange(selectedIds);
        onClose();
      }}
      onCancel={onClose}
    >
      {loading ? (
        <Stack gap={2}>
          {new Array(10).fill(0).map((_, index) => (
            <Skeleton variant='text' height={20} key={index} />
          ))}
        </Stack>
      ) : list.length > 0 ? (
        <DragTree
          ui='select'
          selected={selectedIds}
          data={list}
          refresh={getData}
          onSelectChange={value => {
            setSelectedIds(value);
          }}
          disabled={disabled}
          relativeSelect={false}
        />
      ) : (
        <Stack alignItems={'center'} justifyContent={'center'}>
          <img src={Nodata} alt='empty' style={{ width: 100, height: 100 }} />
          <Box
            sx={{
              fontSize: 12,
              lineHeight: '20px',
              color: 'text.tertiary',
              mt: 1,
            }}
          >
            暂无数据，前往文档页面创建并发布文档
          </Box>
        </Stack>
      )}
    </Modal>
  );
};

export default AddRecommendContent;
