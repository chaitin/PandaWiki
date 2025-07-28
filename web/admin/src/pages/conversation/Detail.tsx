import { ChatConversationPair, ConversationDetail, getConversationDetail } from "@/api"
import Avatar from "@/components/Avatar"
import Card from "@/components/Card"
import MarkDown from "@/components/MarkDown"
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Accordion, AccordionDetails, AccordionSummary, Box, Stack, useTheme } from "@mui/material"
import { Ellipsis, Icon, Modal } from "ct-mui"
import { useEffect, useState } from "react"



const Detail = ({ id, open, onClose }: { id: string, open: boolean, onClose: () => void }) => {
  const theme = useTheme()
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [conversations, setConversations] = useState<ChatConversationPair[] | null>(null)

  const getDetail = () => {
    getConversationDetail({ id }).then((res) => {
      setDetail(res)
      const pairs: ChatConversationPair[] = [];
      let currentPair: Partial<ChatConversationPair> = {};

      res.messages.forEach((message) => {
        if (message.role === 'user') {
          if (currentPair.user) {
            pairs.push({
              user: currentPair.user,
              assistant: '',
              created_at: '',
              info: { score: 0 }
            } as ChatConversationPair);
          }
          currentPair = {
            user: message.content,
          };
        } else if (message.role === 'assistant') {
          if (currentPair.user) {
            currentPair.assistant = message.content;
            currentPair.created_at = message.created_at;
            currentPair.info = message.info;
            pairs.push(currentPair as ChatConversationPair);
            currentPair = {};
          }
        }
      });

      if (currentPair.user) {
        pairs.push({
          user: currentPair.user,
          assistant: '',
          created_at: '',
          info: { score: 0 }
        } as ChatConversationPair);
      }

      setConversations(pairs)
    })
  }

  useEffect(() => {
    if (open && id) getDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, open])

  return <Modal
    title={<Ellipsis sx={{ fontWeight: 'bold', fontSize: 20, lineHeight: '22px', width: 700 }}>问答记录</Ellipsis>}
    width={800}
    open={open}
    onCancel={onClose}
    footer={null}

  >
    {detail ? <Box sx={{ fontSize: 14 }}>
      {detail.references?.length > 0 && <>
        <Stack direction={'row'} alignItems={'center'} gap={1} sx={{
          fontWeight: 'bold', mt: 2, mb: 1,
          '&::before': {
            content: '""',
            display: 'inline-block',
            width: '4px',
            height: '12px',
            borderRadius: '2px',
            backgroundColor: theme.palette.primary.main,
          }
        }}>内容来源</Stack>
        <Card sx={{ p: 2, bgcolor: 'background.paper2' }}>
          {detail.references.map((item, index) => (
            <Stack direction={'row'} alignItems={'center'} gap={1} key={index}>
              <Avatar
                src={item.favicon}
                sx={{ width: 18, height: 18 }}
                errorIcon={<Icon type='icon-ditu_diqiu' sx={{ fontSize: 18, color: 'text.auxiliary' }} />}
              />
              <Ellipsis>
                <Box
                  component={'a'}
                  href={item.url}
                  target='_blank'
                  sx={{ color: 'text.primary', '&:hover': { color: 'primary.main' } }}
                >{item.title}</Box>
              </Ellipsis>
            </Stack>
          ))}
        </Card>
      </>}
      <Stack gap={2}>
        {conversations && conversations.map((item, index) => (
          <Box key={index}>
            <Accordion defaultExpanded={true}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 24 }} />} sx={{
                userSelect: 'text',
                backgroundColor: 'background.paper2',
                fontSize: '18px',
                fontWeight: 'bold',
              }}>
                {item.user}
              </AccordionSummary>
              <AccordionDetails>
                <MarkDown content={item.assistant || '未查询到回答内容'} />
              </AccordionDetails>
            </Accordion>
          </Box>
        ))}
      </Stack>
    </Box> : <Box></Box>}
  </Modal>
}

export default Detail