'use client';

import { ConversationItem } from '@/assets/type';
import Feedback from '@/components/feedback';
import { useRouter } from 'next/navigation';
import {
  IconArrowUp,
  IconCai,
  IconCaied,
  IconZan,
  IconZaned,
} from '@/components/icons';
import MarkDown from '@/components/markdown';
import MarkDown2 from '@/components/markdown2';
import { useStore } from '@/provider';
import { postShareV1ChatFeedback } from '@/request/ShareChat';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { IconCopy, IconNewChat } from '@/components/icons';
import { copyText } from '@/utils';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  IconButton,
  Skeleton,
  Stack,
  TextField,
} from '@mui/material';
import { message } from 'ct-mui';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useState } from 'react';
import ChatLoading from './ChatLoading';
import { AnswerStatus } from './constant';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface ChatResultProps {
  conversation: ConversationItem[];
  conversation_id: string;
  answer: string;
  loading: boolean;
  thinking: keyof typeof AnswerStatus;
  onSearch: (input: string) => void;
  handleSearchAbort: () => void;
  setConversation: (conversation: ConversationItem[]) => void;
  setThinking: (thinking: keyof typeof AnswerStatus) => void;
  onReset: () => void;
}

const ChatResult = ({
  conversation,
  conversation_id,
  answer,
  loading,
  thinking,
  onSearch,
  handleSearchAbort,
  setThinking,
  setConversation,
  onReset,
}: ChatResultProps) => {
  const router = useRouter();
  const [input, setInput] = useState('');
  const { mobile = false, themeMode = 'light', kbDetail } = useStore();
  const [open, setOpen] = useState(false);
  const [conversationItem, setConversationItem] =
    useState<ConversationItem | null>(null);

  const handleSearch = () => {
    if (input.length > 0) {
      onSearch(input);
      setInput('');
    }
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

  useEffect(() => {
    // scrollToBottom();
  }, [answer, conversation]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        scrollToBottom();
      });
    }
  }, [loading]);

  return (
    <Box
      className={!mobile ? 'conversation-container' : ''}
      sx={{
        height: 'calc(100vh - 266px)',
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        mb: 0,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        ...(mobile && {
          overflow: 'hidden',
          height: 'calc(100vh - 180px)',
        }),
      }}
    >
      <Stack
        direction='column'
        gap={2}
        className={mobile ? 'conversation-container' : ''}
        sx={{
          ...(mobile && {
            overflow: 'auto',
            height: 'calc(100vh - 280px)',
          }),
        }}
      >
        {conversation.map((item, index) => (
          <Box key={index}>
            <Accordion
              key={index}
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
                {item.source === 'history' ? (
                  <MarkDown content={item.a} />
                ) : index === conversation.length - 1 ? (
                  // 最后一个对话项：显示合并后的内容，避免闪烁
                  <MarkDown2 content={item.a || answer || ''} />
                ) : (
                  // 非最后一个对话项：正常显示
                  <MarkDown2 content={item.a} />
                )}

                {index === conversation.length - 1 &&
                  loading &&
                  !answer &&
                  !item.a && (
                    <>
                      <Skeleton variant='text' width='100%' />
                      <Skeleton variant='text' width='70%' />
                    </>
                  )}
              </AccordionDetails>
            </Accordion>
            {(index !== conversation.length - 1 || !loading) && (
              <Stack
                direction={mobile ? 'column' : 'row'}
                alignItems={mobile ? 'flex-start' : 'center'}
                justifyContent='space-between'
                gap={mobile ? 1 : 3}
                sx={{
                  fontSize: 12,
                  color: 'text.tertiary',
                  mt: 2,
                }}
              >
                本回答由 PandaWiki 基于 AI 生成，仅供参考。
                <Stack direction='row' gap={3} alignItems='center'>
                  <span>生成于 {dayjs(item.update_time).fromNow()}</span>

                  <IconCopy
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      copyText(item.a);
                    }}
                  />

                  {isFeedbackEnabled && item.source === 'chat' && (
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
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,

          ...(mobile && {
            p: 0,
            left: 24,
            right: 24,
          }),
        }}
      >
        {conversation.length > 0 && (
          <Button
            variant='outlined'
            sx={{ alignSelf: 'center' }}
            onClick={() => {
              router.push(`/chat`);
              onReset();
            }}
          >
            <IconNewChat sx={{ fontSize: 18, mr: 1 }} />
            开启新会话
          </Button>
        )}
        <Box
          sx={{
            bgcolor:
              themeMode === 'dark' ? 'background.paper2' : 'background.default',
            px: 3,
            py: 2,
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <TextField
            fullWidth
            multiline
            rows={2}
            disabled={loading}
            sx={{
              '.MuiInputBase-root': {
                p: 0,
                overflow: 'hidden',
                height: '52px !important',
                transition: 'all 0.5s ease-in-out',
                bgcolor:
                  themeMode === 'dark'
                    ? 'background.paper2'
                    : 'background.default',
              },
              textarea: {
                lineHeight: '26px',
                height: '52px !important',
                borderRadius: 0,
                transition: 'all 0.5s ease-in-out',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              },
              fieldset: {
                border: 'none',
              },
            }}
            size='small'
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              const isComposing =
                e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229;
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                input.length > 0 &&
                !isComposing
              ) {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder={'输入问题'}
            autoComplete='off'
            slotProps={{
              input: {
                sx: {
                  gap: 2,
                  alignItems: loading ? 'flex-start' : 'flex-end',
                  mr: loading ? 10 : 4,
                },
                endAdornment: (
                  <Box
                    sx={{
                      fontSize: 12,
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}
                  >
                    {loading ? (
                      <ChatLoading
                        thinking={thinking}
                        onClick={() => {
                          setThinking(4);
                          handleSearchAbort();
                        }}
                      />
                    ) : (
                      <IconButton
                        size='small'
                        onClick={() => {
                          if (input.length > 0) {
                            handleSearchAbort();
                            setThinking(1);
                            handleSearch();
                          }
                        }}
                      >
                        <IconArrowUp sx={{ fontSize: 12 }} />
                      </IconButton>
                    )}
                  </Box>
                ),
              },
            }}
          />
        </Box>
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

export default ChatResult;
