import Card from "@/components/Card";
import { useAppSelector } from "@/store";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ErrorIcon from '@mui/icons-material/Error';
import { Box, Stack, useTheme } from "@mui/material";
import { Modal } from "ct-mui";

interface VersionResetProps {
  open: boolean
  onClose: () => void
  data: { id: string, version: string, created_at: string, remark: string }
  refresh?: () => void
}

const VersionReset = ({ open, onClose, data, refresh }: VersionResetProps) => {
  const theme = useTheme();
  const { kb_id } = useAppSelector(state => state.config)
  if (!data) return null

  const submit = () => {
    // updateNodeAction({ ids: data.map(item => item.id), kb_id, action: 'delete' }).then(() => {
    //   Message.success('删除成功')
    //   onClose()
    //   refresh?.();
    // })
  }

  return <Modal
    title={<Stack direction='row' alignItems='center' gap={1}>
      <ErrorIcon sx={{ color: 'warning.main' }} />
      确认回滚以下版本？
    </Stack>}
    open={open}
    width={600}
    okText='回滚'
    onCancel={onClose}
    onOk={submit}
  >
    <Card sx={{
      fontSize: 14, p: 1, px: 2, maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', overflowX: 'hidden',
      bgcolor: 'background.paper2',
    }}>
      <Stack direction='row' alignItems={'center'} gap={2} sx={{
        borderBottom: '1px solid',
        borderColor: theme.palette.divider,
        py: 1,
      }}>
        <ArrowForwardIosIcon sx={{ fontSize: 12, mt: '4px' }} />
        <Box sx={{ width: '100%' }}>
          <Box sx={{ fontSize: 16, fontWeight: 500 }}>{data.version || '-'}</Box>
          <Box sx={{ fontSize: 12, color: 'text.auxiliary' }}>{data.remark || '-'}</Box>
        </Box>
      </Stack>
    </Card>
  </Modal>
}

export default VersionReset;