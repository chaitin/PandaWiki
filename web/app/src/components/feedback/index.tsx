import { ConversationItem } from "@/assets/type"
import { useStore } from "@/provider"
import { Box, Stack, TextField } from "@mui/material"
import { Modal } from "ct-mui"
import { useState } from "react"

interface FeedbackProps {
  open: boolean
  onClose: () => void
  onSubmit: (message_id: string, score: number, type: number, content?: string) => void
  data: ConversationItem | null
}

const tags = [
  { label: '内容不准确', value: 1 },
  { label: '没有帮助', value: 2 },
  { label: '其他', value: 3 },
]

const Feedback = ({ open, onClose, onSubmit, data }: FeedbackProps) => {
  const { themeMode } = useStore()
  const [type, setType] = useState<number>(0)
  const [content, setContent] = useState('')

  const handleCancel = () => {
    setContent('')
    setType(0)
    onClose()
  }

  const handleSubmit = () => {
    if (!data) return
    onSubmit(data.message_id, -1, type, content)
    handleCancel()
  }

  return <Modal
    open={open}
    onCancel={handleCancel}
    title="反馈意见"
    cancelText="取消"
    okText="提交"
    onOk={handleSubmit}
    cancelButtonProps={{
      sx: {
        color: 'text.primary',
      }
    }}
  >
    <Stack direction="row" spacing={2} sx={{
      flexWrap: 'wrap',
      mb: 2
    }}>
      {tags.map(tag => (
        <Box key={tag.value} sx={{
          py: 0.75,
          px: 2,
          fontSize: 12,
          borderRadius: '10px',
          border: '1px solid',
          borderColor: type === tag.value ? 'primary.main' : 'divider',
          cursor: 'pointer',
          color: type === tag.value ? 'primary.main' : 'text.primary',
          bgcolor: themeMode === 'dark' ? 'background.paper' : 'background.default',
        }} onClick={() => {
          setType(tag.value)
        }}>
          {tag.label}
        </Box>
      ))}
    </Stack>
    <Box sx={{
      borderRadius: '10px',
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: themeMode === 'dark' ? 'background.paper' : 'background.default',
      p: 2,
    }}>
      <TextField
        fullWidth
        multiline
        rows={4}
        size="small"
        placeholder="请输入反馈内容"
        value={content}
        sx={{
          '.MuiInputBase-root': {
            p: 0,
            overflow: 'hidden',
            transition: 'all 0.5s ease-in-out',
            bgcolor: themeMode === 'dark' ? 'background.paper' : 'background.default',
          },
          textarea: {
            lineHeight: '26px',
            borderRadius: 0,
            transition: 'all 0.5s ease-in-out',
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            '&::placeholder': {
              fontSize: 14,
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          },
          fieldset: {
            border: 'none',
          }
        }}
        onChange={e => setContent(e.target.value)}
      />
    </Box>
  </Modal>
}

export default Feedback