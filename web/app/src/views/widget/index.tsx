'use client';

import { ChunkResultItem, ConversationItem } from '@/assets/type';
import { IconFile, IconFolder, IconLogo } from '@/components/icons';
import { useStore } from '@/provider';
import SSEClient from '@/utils/fetch';
import { Box, Stack, useMediaQuery } from '@mui/material';
import { Ellipsis, message } from 'ct-mui';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnswerStatus } from '../chat/constant';
import ChatInput from './ChatInput';
import ChatWindow from './ChatWindow';

const Widget = () => {
  const isMobile = useMediaQuery(theme => theme.breakpoints.down('sm'));
  const { widget, themeMode } = useStore();

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const sseClientRef = useRef<SSEClient<{
    type: string;
    content: string;
    chunk_result: ChunkResultItem[];
  }> | null>(null);

  const messageIdRef = useRef<string>('');
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState<keyof typeof AnswerStatus>(4);
  const [nonce, setNonce] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [answer, setAnswer] = useState('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const chatAnswer = async (q: string) => {
    setLoading(true);
    setThinking(1);
    setIsUserScrolling(false);

    const reqData = {
      message: q,
      nonce: '',
      conversation_id: '',
      app_type: 2,
    };
    if (conversationId) reqData.conversation_id = conversationId;
    if (nonce) reqData.nonce = nonce;

    if (sseClientRef.current) {
      sseClientRef.current.subscribe(
        JSON.stringify(reqData),
        ({ type, content }) => {
          if (type === 'conversation_id') {
            setConversationId(prev => prev + content);
          } else if (type === 'message_id') {
            messageIdRef.current += content;
          } else if (type === 'nonce') {
            setNonce(prev => prev + content);
          } else if (type === 'error') {
            setLoading(false);
            setThinking(4);
            setAnswer(prev => {
              if (content) {
                return prev + `\n\n回答出现错误：<error>${content}</error>`;
              }
              return prev + '\n\n回答出现错误，请重试';
            });
            if (content) message.error(content);
          } else if (type === 'done') {
            setAnswer(prevAnswer => {
              setConversation(prev => {
                const newConversation = [...prev];
                newConversation[newConversation.length - 1].a = prevAnswer;
                newConversation[newConversation.length - 1].update_time =
                  dayjs().format('YYYY-MM-DD HH:mm:ss');
                newConversation[newConversation.length - 1].message_id =
                  messageIdRef.current;
                return newConversation;
              });
              return '';
            });
            setLoading(false);
            setThinking(4);
          } else if (type === 'data') {
            setAnswer(prev => {
              const newAnswer = prev + content;
              if (newAnswer.includes('</think>')) {
                setThinking(3);
                return newAnswer;
              }
              if (newAnswer.includes('<think>')) {
                setThinking(2);
                return newAnswer;
              }
              setThinking(3);
              return newAnswer;
            });
          }
        },
      );
    }
  };

  const onSearch = (q: string, reset: boolean = false) => {
    if (loading || !q.trim()) return;
    const newConversation = reset ? [] : [...conversation];
    newConversation.push({
      q,
      a: '',
      score: 0,
      update_time: '',
      message_id: '',
      source: 'chat',
    });
    messageIdRef.current = '';
    setConversation(newConversation);
    setAnswer('');
    setTimeout(() => {
      chatAnswer(q);
    }, 0);
  };

  const handleSearchAbort = () => {
    if (loading) {
      sseClientRef.current?.unsubscribe();
    }
    setLoading(false);
    setThinking(4);
  };

  const handleScroll = useCallback(() => {
    if (chatContainerRef?.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      setIsUserScrolling(scrollTop + clientHeight < scrollHeight);
    }
  }, [chatContainerRef]);

  useEffect(() => {
    if (!isUserScrolling && chatContainerRef?.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [answer, isUserScrolling]);

  useEffect(() => {
    const chatContainer = chatContainerRef?.current;
    chatContainer?.addEventListener('scroll', handleScroll);
    return () => {
      chatContainer?.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    sseClientRef.current = new SSEClient({
      url: `/share/v1/chat/widget`,
      headers: {
        'Content-Type': 'application/json',
      },
      onCancel: () => {
        setLoading(false);
        setThinking(4);
        setAnswer(prev => {
          let value = '';
          if (prev) {
            value = prev + '\n\n<error>Request canceled</error>';
          }
          setConversation(prev => {
            const newConversation = [...prev];
            if (newConversation.length > 0) {
              newConversation[newConversation.length - 1].a = value;
              newConversation[newConversation.length - 1].update_time =
                dayjs().format('YYYY-MM-DD HH:mm:ss');
              newConversation[newConversation.length - 1].message_id =
                messageIdRef.current;
            }
            return newConversation;
          });
          return '';
        });
      },
    });
  }, []);

  return (
    <>
      <Stack
        direction={'row'}
        alignItems={'flex-start'}
        justifyContent={'space-between'}
        gap={2}
        sx={{
          p: 3,
          bgcolor: 'primary.main',
          pb: '36px',
        }}
      >
        <Box sx={{ flex: 1, width: 0, color: 'light.main' }}>
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={1}
            sx={{ lineHeight: '28px', fontSize: 20 }}
          >
            {widget?.settings?.widget_bot_settings?.btn_logo ||
              widget?.settings?.icon ? (
              <img
                src={
                  widget?.settings?.widget_bot_settings?.btn_logo ||
                  widget?.settings?.icon
                }
                height={24}
                style={{ flexShrink: 0 }}
              />
            ) : (
              <IconLogo sx={{ fontSize: 24 }} />
            )}
            <Ellipsis sx={{ pr: 2 }}>
              <Box
                component={'span'}
                sx={{ cursor: 'pointer' }}
                onClick={() => {
                  handleSearchAbort();
                  setConversation([]);
                }}
              >
                {widget?.settings?.title || '在线客服'}
              </Box>
            </Ellipsis>
          </Stack>
          <Ellipsis sx={{ fontSize: 14, opacity: 0.7, mt: 0.5 }}>
            {widget?.settings?.welcome_str || '在线客服'}
          </Ellipsis>
        </Box>
      </Stack>
      <Box
        sx={{
          bgcolor: themeMode === 'light' ? 'light.main' : 'dark.light',
          p: 3,
          mt: -2,
          borderRadius: '12px 12px 0 0',
          height: 'calc(100vh - 96px - 24px)',
          overflow: 'auto',
        }}
      >
        {conversation.length === 0 ? (
          <>
            <Box>
              <ChatInput
                loading={loading}
                thinking={thinking}
                setThinking={setThinking}
                onSearch={onSearch}
                handleSearchAbort={handleSearchAbort}
                placeholder={
                  widget?.settings?.search_placeholder || '请输入问题'
                }
              />
            </Box>
            <Stack
              direction='row'
              alignItems={'center'}
              flexWrap='wrap'
              gap={1.5}
              sx={{
                mt: 2,
              }}
            >
              {widget?.settings?.recommend_questions?.map(item => (
                <Box
                  key={item}
                  onClick={() => onSearch(item, true)}
                  sx={{
                    border: '1px solid',
                    borderRadius: '16px',
                    fontSize: 14,
                    color: 'text.secondary',
                    lineHeight: '32px',
                    height: '32px',
                    borderColor: 'divider',
                    px: 2,
                    cursor: 'pointer',
                    bgcolor:
                      themeMode === 'dark'
                        ? 'background.paper2'
                        : 'background.default',
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                    },
                  }}
                >
                  {item}
                </Box>
              ))}
            </Stack>
            {widget?.recommend_nodes && widget.recommend_nodes.length > 0 && (
              <Box sx={{ mt: 4.5 }}>
                <Box
                  sx={{
                    color: 'text.tertiary',
                    lineHeight: '22px',
                    fontSize: 14,
                    fontWeight: 'bold',
                  }}
                >
                  推荐内容
                </Box>
                <Stack direction={'row'} flexWrap={'wrap'}>
                  {widget.recommend_nodes.map(it => {
                    return (
                      <Link
                        href={`/node/${it.id}`}
                        target='_blank'
                        prefetch={false}
                        key={it.id}
                        style={{ width: isMobile ? '100%' : '50%' }}
                      >
                        <Stack
                          direction={'row'}
                          alignItems={'center'}
                          gap={1}
                          key={it.id}
                          sx={{
                            py: 2,
                            pr: isMobile ? 0 : 2,
                            fontSize: 12,
                            height: 53,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            cursor: 'pointer',
                            '&:hover': {
                              color: 'primary.main',
                            },
                          }}
                        >
                          {it.emoji ? (
                            <Box>{it.emoji}</Box>
                          ) : it.type === 1 ? (
                            <IconFolder />
                          ) : (
                            <IconFile />
                          )}
                          <Box>{it.name}</Box>
                        </Stack>
                      </Link>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </>
        ) : (
          <ChatWindow
            conversation_id={conversationId}
            conversation={conversation}
            setConversation={setConversation}
            answer={answer}
            loading={loading}
            thinking={thinking}
            setThinking={setThinking}
            onSearch={onSearch}
            handleSearchAbort={handleSearchAbort}
            placeholder={widget?.settings?.search_placeholder || '请输入问题'}
          />
        )}
      </Box>
      <Stack
        direction={'row'}
        alignItems={'center'}
        gap={1}
        justifyContent={'center'}
        sx={{
          height: 24,
          fontSize: 12,
          bgcolor: themeMode === 'light' ? 'light.main' : 'dark.light',
          a: {
            color: 'primary.main',
          },
        }}
      >
        本插件由
        <Link
          href={'https://pandawiki.docs.baizhi.cloud/'}
          target='_blank'
          prefetch={false}
        >
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={0.5}
            sx={{
              cursor: 'pointer',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <IconLogo sx={{ fontSize: 16 }} />
            <Box sx={{ fontWeight: 'bold' }}>PandaWiki</Box>
          </Stack>
        </Link>
        提供技术支持
      </Stack>
    </>
  );
};

export default Widget;
