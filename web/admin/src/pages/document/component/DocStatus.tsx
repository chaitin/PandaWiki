import { NodeListItem } from '@/api/type';
import ErrorIcon from '@mui/icons-material/Error';
import { Box, Stack, Typography } from "@mui/material";
import { Card, Ellipsis, Icon, Modal } from "ct-mui";

interface DocStatusProps {
  open: boolean
  status: number
  kb_id: string
  onClose: () => void
  data: NodeListItem[]
  refresh?: () => void
}

const textMap = {
  1: {
    title: '确认将以下文档设为公开？',
    text: '已发布后，文档将在前台可以访问。',
    btn: '公开'
  },
  2: {
    title: '确认将以下文档设为私有？',
    text: '私有后，文档将在前台无法访问。',
    btn: '私有'
  },
  3: {
    title: '确认将以下文档更新发布？',
    text: '更新发布后，文档将在前台可以访问。',
    btn: '更新发布'
  }
}

const DocStatus = ({ open, status, kb_id, onClose, data, refresh }: DocStatusProps) => {
  const submit = () => {
    // updateNode({ id, kb_id, status: status as 1 | 2 | 3 }).then(() => {
    //   Message.success('更新成功')
    //   onClose()
    //   refresh?.();
    // })
  }
  if (!open) return <></>
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
      fontSize: 14, p: 1, px: 2, maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', overflowX: 'hidden',
      bgcolor: 'background.paper2', mt: 2,
    }}>
      {data.map(item => <Stack key={item.id} direction='row' alignItems={'center'} gap={2} sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1,
      }}>
        {item.type === 1 ? <Icon sx={{ flexShrink: 0 }} type={'icon-wenjianjia'} />
          : <Icon sx={{ flexShrink: 0 }} type='icon-wenjian' />}
        <Box sx={{ width: '100%' }}>
          <Ellipsis sx={{ width: 'calc(100% - 40px)' }}>{item.name || '-'}</Ellipsis>
        </Box>
      </Stack>)}
    </Card>
  </Modal>
}

export default DocStatus