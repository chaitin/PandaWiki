import DragRecommend from '@/components/Drag/DragRecommend';
import {
  DomainRecommendNodeListResp,
  getApiV1NodeRecommendNodes,
} from '@/request';
import { useAppSelector } from '@/store';
import { Box, Button, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import AddRecommendContent from '../../AddRecommendContent';

const RecommendDocDragList = ({
  ids,
  onChange,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
}) => {
  const { kb_id } = useAppSelector(state => state.config);
  const [data, setData] = useState<DomainRecommendNodeListResp[]>([]);
  const [open, setOpen] = useState(false);

  const getDetail = (node_ids: string[]) => {
    if (kb_id && node_ids.length > 0) {
      getApiV1NodeRecommendNodes({
        kb_id,
        node_ids,
      }).then(res => {
        setData(res || []);
      });
    }
  };

  useEffect(() => {
    getDetail(ids);
  }, [ids, kb_id]);

  return (
    <Stack gap={1} flex={1}>
      <Box>
        <DragRecommend
          data={data}
          onChange={value => {
            setData(value);
            onChange(value.map(item => item.id!));
          }}
        />
      </Box>
      <Button
        color='primary'
        size='small'
        onClick={() => setOpen(true)}
        sx={{
          alignSelf: 'flex-start',
        }}
      >
        添加文档
      </Button>
      <AddRecommendContent
        open={open}
        selected={ids}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </Stack>
  );
};

export default RecommendDocDragList;
