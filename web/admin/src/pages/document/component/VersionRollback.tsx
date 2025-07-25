import { NodeReleaseItem } from "@/api";
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Stack } from "@mui/material";
import { Modal } from "ct-mui";

interface VersionRollbackProps {
  open: boolean;
  onClose: () => void;
  onOk: () => void
  data: NodeReleaseItem
}

const VersionRollback = ({ open, onClose, data, onOk }: VersionRollbackProps) => {
  return <Modal
    title={<Stack direction='row' alignItems='center' gap={1}>
      <ErrorOutlineIcon sx={{ color: 'warning.main', fontSize: 24 }} />
      确认使用当前版本？
    </Stack>}
    open={open}
    onOk={onOk}
    onCancel={onClose}
  >
    <Stack direction="row" spacing={2} sx={{ mb: 1, lineHeight: '24px' }}>
      <Box sx={{ fontSize: 14, width: 100 }}>版本号</Box>
      <Box sx={{ fontFamily: 'Gbold' }}>{data.release_name}</Box>
    </Stack>
    <Stack direction="row" spacing={2} sx={{ lineHeight: '24px' }}>
      <Box sx={{ fontSize: 14, width: 100, flexShrink: 0 }}>版本描述</Box>
      <Box sx={{ fontSize: 14, mt: 1 }}>{data.release_message}</Box>
    </Stack>
  </Modal>
};

export default VersionRollback;