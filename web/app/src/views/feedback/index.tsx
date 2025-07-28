'use client'
import { apiClient } from "@/api"
import feedback from '@/assets/images/feedback.png'
import Footer from "@/components/footer"
import { useStore } from "@/provider"
import { Box, Button, Stack, TextField } from "@mui/material"
import { message } from "ct-mui"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

const tags = [
  { label: '内容不准确', value: 1 },
  { label: '没有帮助', value: 2 },
  { label: '其他', value: 3 },
]

const Feedback = () => {
  const searchParams = useSearchParams()

  const message_id = searchParams.get('message_id') || ''
  const conversation_id = searchParams.get('conversation_id') || ''
  const score = parseInt(searchParams.get('score') || '-1') as -1 | 1

  const { kb_id, token } = useStore()
  const [type, setType] = useState<number>(0)
  const [content, setContent] = useState('')
  const [success, setSuccess] = useState(score === 1)

  const handleSubmit = async () => {
    const data: any = {
      kb_id: kb_id || '',
      authToken: token || '',
      conversation_id,
      message_id,
      score,
    }
    if (type > 0) data.type = type
    if (content) data.feedback_content = content
    const res = await apiClient.clientFeedback(data)
    if (res.success) {
      setSuccess(true)
      message.success('反馈成功')
    } else {
      message.error(res.message || '反馈失败')
    }
  }

  useEffect(() => {
    if (score === 1) {
      handleSubmit()
    }
  }, [score])

  return <>
    <Box sx={{
      width: '100vw',
      height: 'calc(100vh - 40px)',
      p: 3,
    }}>
      {success ? <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
      }}>
        <Image src={feedback.src} alt="success" width={300} height={300} />
        <Box sx={{
          fontSize: 16,
          mt: 2,
        }}>感谢您的反馈！</Box>
      </Box> : <Box>
        <Box sx={{
          fontSize: 16,
          fontWeight: 'bold',
          mb: 2,
        }}>问题类型</Box>
        <Stack direction="row" spacing={2} sx={{
          flexWrap: 'wrap',
          mb: 4
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
              bgcolor: 'background.paper',
            }} onClick={() => {
              setType(tag.value)
            }}>
              {tag.label}
            </Box>
          ))}
        </Stack>
        <Box sx={{
          fontSize: 16,
          fontWeight: 'bold',
          my: 2,
        }}>反馈内容</Box>
        <Box sx={{
          borderRadius: '10px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          p: 2,
        }}>
          <TextField
            fullWidth
            multiline
            rows={8}
            size="small"
            placeholder="请输入反馈内容"
            value={content}
            sx={{
              '.MuiInputBase-root': {
                p: 0,
                overflow: 'hidden',
                transition: 'all 0.5s ease-in-out',
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
        <Button variant="contained" fullWidth color="primary" sx={{
          mt: 4,
          height: 50,
        }} onClick={handleSubmit}>提交</Button>
      </Box>}
    </Box>
    <Box sx={{
      height: 40,
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
    }}>
      <Footer showBrand={false} fullWidth={true} />
    </Box>
  </>
}

export default Feedback