import { DomainNodeReleaseListItem } from '@/request/pro';
import { Modal } from '@ctzhian/ui';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Stack } from '@mui/material';

interface VersionRollbackProps {
  open: boolean;
  onClose: () => void;
  onOk: () => void;
  data: DomainNodeReleaseListItem | null;
}

const VersionRollback = ({
  open,
  onClose,
  data,
  onOk,
}: VersionRollbackProps) => {
  if (!data) return null;
  return (
    <Modal
      title={
        <Stack direction='row' alignItems='center' gap={1}>
          <ErrorOutlineIcon sx={{ color: 'warning.main', fontSize: 24 }} />
          确认使用当前版本？
        </Stack>
      }
      open={open}
      onOk={onOk}
      onCancel={onClose}
    >
      <Stack direction='row' spacing={2}>
        <Box sx={{ fontSize: 14, width: 100, flexShrink: 0 }}>版本号</Box>
        <Box sx={{ fontWeight: 700 }}>{data.release_name}</Box>
      </Stack>
      <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
        <Box sx={{ fontSize: 14, width: 100, flexShrink: 0 }}>版本描述</Box>
        <Box sx={{ fontSize: 14 }}>{data.release_message}</Box>
      </Stack>
      {data.creator_account && (
        <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
          <Box sx={{ fontSize: 14, width: 100, flexShrink: 0 }}>创建人员</Box>
          <Box sx={{ fontSize: 14 }}>{data.creator_account}</Box>
        </Stack>
      )}
      {data.editor_account && (
        <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
          <Box sx={{ fontSize: 14, width: 100, flexShrink: 0 }}>编辑人员</Box>
          <Box sx={{ fontSize: 14 }}>{data.editor_account}</Box>
        </Stack>
      )}
      {data.publisher_account && (
        <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
          <Box sx={{ fontSize: 14, width: 100, flexShrink: 0 }}>发布人员</Box>
          <Box sx={{ fontSize: 14 }}>{data.publisher_account}</Box>
        </Stack>
      )}
    </Modal>
  );
};

export default VersionRollback;
