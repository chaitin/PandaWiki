import { NodeListItem, updateNodeAction } from "@/api";
import Card from "@/components/Card";
import DragTree from "@/components/Drag/DragTree";
import { convertToTree } from "@/constant/drag";
import { useAppSelector } from "@/store";
import ErrorIcon from '@mui/icons-material/Error';
import { Stack } from "@mui/material";
import { Message, Modal } from "ct-mui";

interface DocDeleteProps {
  open: boolean
  onClose: () => void
  data: NodeListItem[]
  refresh?: () => void
}

const DocDelete = ({ open, onClose, data, refresh }: DocDeleteProps) => {
  const { kb_id } = useAppSelector(state => state.config)
  if (!data) return null


  const submit = () => {
    updateNodeAction({ ids: data.map(item => item.id), kb_id, action: 'delete' }).then(() => {
      Message.success('删除成功')
      onClose()
      refresh?.();
    })
  }

  const tree = convertToTree(data)
  return <Modal
    title={<Stack direction='row' alignItems='center' gap={1}>
      <ErrorIcon sx={{ color: 'warning.main' }} />
      确认删除以下文档/文件夹？
    </Stack>}
    open={open}
    width={600}
    okText='删除'
    okButtonProps={{ sx: { bgcolor: 'error.main' } }}
    onCancel={onClose}
    onOk={submit}
  >
    <Card sx={{
      py: 1,
      bgcolor: 'background.paper2',
      '& .dndkit-drag-handle': {
        top: '-2px !important'
      }
    }}>
      <DragTree
        data={tree}
        readOnly={true}
        supportSelect={false}
      />
    </Card>
  </Modal>
}

export default DocDelete;