import { createNodeSummary } from '@/api';
import { NodeListItem } from '@/api/type';
import Card from '@/components/Card';
import DragTree from '@/components/Drag/DragTree';
import { convertToTree } from '@/utils/drag';
import { filterEmptyFolders } from '@/utils/tree';
import ErrorIcon from '@mui/icons-material/Error';
import { Box, Stack } from '@mui/material';
import { Message, Modal } from 'ct-mui';

interface DocSummaryProps {
  open: boolean;
  kb_id: string;
  onClose: () => void;
  data: NodeListItem[];
  refresh?: () => void;
}

const DocSummary = ({ open, kb_id, onClose, data }: DocSummaryProps) => {
  const submit = () => {
    createNodeSummary({ kb_id, ids: data.map(it => it.id) }).then(() => {
      Message.success('正在后台生成文档摘要');
      onClose();
    });
  };

  if (!open) return <></>;

  const tree = filterEmptyFolders(convertToTree(data));

  return (
    <Modal
      title={
        <Stack direction='row' alignItems='center' gap={1}>
          <ErrorIcon sx={{ color: 'warning.main' }} />
          确认为以下文档 AI 生成摘要？
        </Stack>
      }
      open={open}
      width={600}
      okText={'生成摘要'}
      onCancel={onClose}
      onOk={submit}
      okButtonProps={{
        disabled: tree.length === 0,
      }}
    >
      <Card
        sx={{
          py: 1,
          bgcolor: 'background.paper2',
          '& .dndkit-drag-handle': {
            top: '-2px !important',
          },
        }}
      >
        <DragTree data={tree} readOnly={true} supportSelect={false} />
      </Card>
      <Box
        sx={{
          mt: 1,
          fontSize: 12,
          color: 'warning.main',
        }}
      >
        AI 生成需要一定的时间，可以稍后查看
      </Box>
    </Modal>
  );
};

export default DocSummary;
