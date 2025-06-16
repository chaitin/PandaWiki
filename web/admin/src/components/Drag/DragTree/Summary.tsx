import { createNodeSummary, type NodeListItem } from "@/api"
import Card from "@/components/Card"
import { CheckCircle } from "@mui/icons-material"
import { Button, Stack } from "@mui/material"
import { Ellipsis, Icon, Modal } from "ct-mui"
import { useEffect, useState } from "react"

interface SummaryProps {
  kb_id: string
  data: NodeListItem
  open: boolean
  refresh?: () => void
  onClose: () => void
}

const Summary = ({ open, data, kb_id, refresh, onClose }: SummaryProps) => {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [summary, setSummary] = useState('')

  const createSummary = () => {
    setSuccess(false)
    setLoading(true)
    createNodeSummary({ kb_id, id: data.id }).then((res) => {
      setSummary(res.summary)
      setSuccess(true)
      refresh?.()
    }).finally(() => {
      setLoading(false)
    })
  }

  const handleOk = () => {
    if (data.summary) {
      onClose()
      return
    }
    createSummary()
  }

  useEffect(() => {
    if (open) {
      setSummary(data.summary || '')
      setSuccess(false)
    }
  }, [open])

  return <Modal
    open={open}
    onCancel={onClose}
    disableEscapeKeyDown
    closable={false}
    title={success ? <Stack direction='row' alignItems='center' gap={1}>
      <CheckCircle sx={{ color: 'success.main' }} />
      摘要生成成功
    </Stack> : data?.summary ? '文档摘要' : '确认为以下文档生成摘要？'}
    onOk={handleOk}
    okText={data?.summary ? '关闭' : '生成'}
    showCancel={!data?.summary}
    okButtonProps={{ loading }}
  >
    {!data?.summary && !summary && <Stack sx={{ fontSize: 14 }} direction='row' alignItems='center' gap={1}>
      <Icon type='icon-wenjian' />
      <Ellipsis >{data?.name}</Ellipsis>
    </Stack>}
    {summary && <Card sx={{ p: 2, bgcolor: 'background.paper2', fontSize: 14 }}>
      {summary}
    </Card>}
    {!loading && summary && <Button sx={{ minWidth: 'auto' }} onClick={createSummary} startIcon={
      <Icon type='icon-shuaxin' />
    }>重新生成</Button>}
  </Modal>
}

export default Summary