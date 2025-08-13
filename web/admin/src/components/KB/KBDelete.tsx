import { deleteKnowledgeBase, KnowledgeBaseListItem } from '@/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { setKbC, setKbId, setKbList } from '@/store/slices/config';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Stack, useTheme } from '@mui/material';
import { Message, Modal } from 'ct-mui';

interface KBDeleteProps {
  open: boolean;
  onClose: () => void;
  data: KnowledgeBaseListItem | null;
}

const KBDelete = ({ open, onClose, data }: KBDeleteProps) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { kb_id, kbList } = useAppSelector(state => state.config);

  const handleOk = () => {
    if (!data) return;
    deleteKnowledgeBase({ id: data?.id || '' }).then(() => {
      Message.success('删除成功');
      if (kb_id === data.id) {
        dispatch(setKbId(kbList[0].id));
      }
      dispatch(setKbList(kbList.filter(item => item.id !== data.id)));
      if (kbList.length === 1) {
        dispatch(setKbC(true));
      }
      onClose();
    });
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        onClose();
      }}
      onOk={handleOk}
      okButtonProps={{ sx: { bgcolor: 'error.main' } }}
      title={
        <Stack direction='row' alignItems='center' gap={1}>
          <ErrorOutlineIcon sx={{ color: 'warning.main' }} />
          确定要删除该知识库吗？
        </Stack>
      }
    >
      <Stack
        direction='row'
        gap={2}
        sx={{
          borderBottom: '1px solid',
          borderColor: theme.palette.divider,
          py: 1,
        }}
      >
        <ArrowForwardIosIcon sx={{ fontSize: 12, mt: '4px', ml: 1 }} />
        <Box>{data?.name}</Box>
      </Stack>
    </Modal>
  );
};

export default KBDelete;
