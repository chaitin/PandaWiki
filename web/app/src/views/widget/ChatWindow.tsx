'use client';

import { ConversationItem } from '@/assets/type';
import Feedback from '@/components/feedback';
import { IconCai, IconCaied, IconZan, IconZaned } from '@/components/icons';
import MarkDown from '@/components/markdown';
import { useStore } from '@/provider';
import { postShareV1ChatFeedback } from '@/request/ShareChat';
import { AnswerStatus } from '@/views/chat/constant';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Skeleton,
  Stack,
} from '@mui/material';
import { message } from 'ct-mui';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useState } from 'react';
import ChatInput from './ChatInput';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface ChatWindowProps {
  placeholder: string;
  conversation: ConversationItem[];
  conversation_id: string;
  setConversation: (conversation: ConversationItem[]) => void;
  answer: string;
  loading: boolean;
  thinking: keyof typeof AnswerStatus;
  onSearch: (input: string) => void;
  handleSearchAbort: () => void;
  setThinking: (thinking: keyof typeof AnswerStatus) => void;
}

const ChatWindow = ({
  conversation,
  conversation_id,
  setConversation,
  answer,
  loading,
  thinking,
  onSearch,
  handleSearchAbort,
  setThinking,
  placeholder,
}: ChatWindowProps) => {
  const [conversationItem, setConversationItem] =
    useState<ConversationItem | null>(null);
  const [open, setOpen] = useState(false);
  const { themeMode = 'light', widget, kbDetail } = useStore();

  const handleScore = async (
    message_id: string,
    score: number,
    type?: string,
    content?: string,
  ) => {
    const data: any = {
      conversation_id,
      message_id,
      score,
    };
    if (type) data.type = type;
    if (content) data.feedback_content = content;
    await postShareV1ChatFeedback(data);
    message.success('反馈成功');
    setConversation(
      conversation.map(item => {
        return item.message_id === message_id ? { ...item, score } : item;
      }),
    );
  };

  const isFeedbackEnabled =
    // @ts-ignore
    kbDetail?.settings?.ai_feedback_settings?.is_enabled ?? true;

  const scrollToBottom = () => {
    const container = document.querySelector('.conversation-container');
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [answer, conversation]);

  return (
    <Box
      sx={{
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        mb: 0,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <Stack
        direction='column'
        gap={2}
        className='conversation-container'
        sx={{
          overflow: 'auto',
          height: 'calc(100% - 100px)',
        }}
      >
        {conversation.map((item, index) => (
          <Box key={index}>
            <Accordion
              defaultExpanded={true}
              sx={{
                bgcolor:
                  themeMode === 'dark'
                    ? 'background.default'
                    : 'background.paper2',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ fontSize: 24 }} />}
                sx={{
                  userSelect: 'text',
                }}
              >
                <Box
                  sx={{
                    fontWeight: '700',
                    lineHeight: '24px',
                    wordBreak: 'break-all',
                  }}
                >
                  {item.q}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <MarkDown content={item.a} />
                {index === conversation.length - 1 && loading && !answer && (
                  <>
                    <Skeleton variant='text' width='100%' />
                    <Skeleton variant='text' width='70%' />
                  </>
                )}
                {index === conversation.length - 1 && answer && (
                  <MarkDown content={answer} />
                )}
              </AccordionDetails>
            </Accordion>
            {(index !== conversation.length - 1 || !loading) && (
              <Stack
                direction='row'
                alignItems='center'
                justifyContent='space-between'
                gap={3}
                sx={{
                  fontSize: 12,
                  color: 'text.tertiary',
                  mt: 2,
                }}
              >
                本回答由 PandaWiki 基于 AI 生成，仅供参考。
                <Stack direction='row' gap={3} alignItems='center'>
                  <span>生成于 {dayjs(item.update_time).fromNow()}</span>

                  {isFeedbackEnabled && (
                    <>
                      {item.score === 1 && (
                        <IconZaned sx={{ cursor: 'pointer' }} />
                      )}
                      {item.score !== 1 && (
                        <IconZan
                          sx={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (item.score === 0)
                              handleScore(item.message_id, 1);
                          }}
                        />
                      )}
                      {item.score !== -1 && (
                        <IconCai
                          sx={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (item.score === 0) {
                              setConversationItem(item);
                              setOpen(true);
                            }
                          }}
                        />
                      )}
                      {item.score === -1 && (
                        <IconCaied sx={{ cursor: 'pointer' }} />
                      )}
                    </>
                  )}
                </Stack>
              </Stack>
            )}
          </Box>
        ))}
      </Stack>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <ChatInput
          onSearch={onSearch}
          thinking={thinking}
          loading={loading}
          handleSearchAbort={handleSearchAbort}
          setThinking={setThinking}
          placeholder={placeholder}
        />
      </Box>
      <Feedback
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleScore}
        data={conversationItem}
      />
    </Box>
  );
};

export default ChatWindow;
