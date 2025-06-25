import { updateNodeAction } from '@/api';
import { NodeListItem } from '@/api/type';
import Card from '@/components/Card';
import DragTree from '@/components/Drag/DragTree';
import { convertToTree } from '@/constant/drag';
import { filterEmptyFolders } from '@/utils/tree';
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
    title: '确认设置文档为公开状态？',
    text: '设为公开后，所有用户都可以在前台访问这些文档。',
    btn: '设为公开'
  },
  private: {
    title: '确认设置文档为私有状态？',
    text: '设为私有后，这些文档将不会在前台展示。',
    btn: '设为私有'
  },
}

const DocStatus = ({ open, status, kb_id, onClose, data, refresh }: DocStatusProps) => {

  const submit = () => {
    updateNodeAction({ ids: data.map(it => it.id), kb_id, action: status }).then(() => {
      Message.success('更新成功')
      onClose()
      refresh?.();
    })
  }

  if (!open) return <></>

  const tree = filterEmptyFolders(convertToTree(data.filter(it => (it.visibility === (status === 'public' ? 1 : 2) || it.type === 1))))

  return <Modal
    title={tree.length > 0 ? <Stack direction='row' alignItems='center' gap={1}>
      <ErrorIcon sx={{ color: 'warning.main' }} />
      {textMap[status as keyof typeof textMap].title}
    </Stack> : textMap[status as keyof typeof textMap].btn}
    open={open}
    width={600}
    okText={textMap[status as keyof typeof textMap].btn}
    onCancel={onClose}
    onOk={submit}
    okButtonProps={{
      disabled: tree.length === 0
    }}
  >
    <Typography variant='body1' color='text.secondary'>
      {textMap[status as keyof typeof textMap].text}
    </Typography>
    {tree.length > 0 ? <Card sx={{
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
    </Card> : <Stack direction='row' alignItems='center' gap={0.25} sx={{ color: 'success.main', mt: 1, fontSize: 12 }}>
      <ErrorIcon sx={{ fontSize: 16 }} />
      选中文档都已{textMap[status as keyof typeof textMap].btn}
    </Stack>}
  </Modal>
}

export default DocStatus