import { updateNode } from '@/api';
import { NodeListItem, UpdateNodeData } from '@/api/type';
import Card from '@/components/Card';
import DragTree from '@/components/Drag/DragTree';
import { convertToTree } from '@/constant/drag';
import ErrorIcon from '@mui/icons-material/Error';
import { Stack, Typography } from "@mui/material";
import { Message, Modal } from "ct-mui";

interface DocStatusProps {
  open: boolean
  status: 'public' | 'private'
  kb_id: string
  onClose: () => void
  data: NodeListItem[]
  refresh?: () => void
}

const textMap = {
  public: {
    title: '确认将以下文档设为公开？',
    text: '公开后，文档将在前台可以访问。',
    btn: '公开'
  },
  private: {
    title: '确认将以下文档设为私有？',
    text: '私有后，文档将在前台无法访问。',
    btn: '私有'
  },
}

const DocStatus = ({ open, status, kb_id, onClose, data, refresh }: DocStatusProps) => {
  const submit = () => {
    const temp: UpdateNodeData = { id: data[0].id, kb_id }
    if (status === 'public') {
      temp.visibility = 2
    } else if (status === 'private') {
      temp.visibility = 1
    } else if (status === 'publish') {
      temp.status = 2
    }
    updateNode(temp).then(() => {
      Message.success('更新成功')
      onClose()
      refresh?.();
    })
  }
  if (!open) return <></>

  const tree = convertToTree(data)
  return <Modal
    title={<Stack direction='row' alignItems='center' gap={1}>
      <ErrorIcon sx={{ color: 'warning.main' }} />
      {textMap[status as keyof typeof textMap].title}
    </Stack>}
    open={open}
    width={600}
    okText={textMap[status as keyof typeof textMap].btn}
    onCancel={onClose}
    onOk={submit}
  >
    <Typography variant='body1' color='text.secondary'>
      {textMap[status as keyof typeof textMap].text}
    </Typography>
    <Card sx={{
      mt: 2,
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

export default DocStatus