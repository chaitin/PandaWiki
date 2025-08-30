'use client';

import { ChunkResultItem, ConversationItem } from '@/assets/type';
import { useStore } from '@/provider';
import SSEClient from '@/utils/fetch';
import { Box, Stack } from '@mui/material';
import { message } from 'ct-mui';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import ChatResult from './ChatResult';
import ChatTab from './ChatTab';
import SearchResult from './SearchResult';
import { AnswerStatus } from './constant';
// @ts-ignore
import Cap from '@cap.js/widget';

const Chat = ({
  conversation: initialConversation,
}: {
  conversation: ConversationItem[];
}) => {
  const { mobile = false, kbDetail } = useStore();

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const sseClientRef = useRef<SSEClient<{
    type: string;
    content: string;
    chunk_result: ChunkResultItem[];
  }> | null>(null);

  const messageIdRef = useRef('');
  const [conversation, setConversation] =
    useState<ConversationItem[]>(initialConversation);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState<keyof typeof AnswerStatus>(4);
  const [nonce, setNonce] = useState('');
  const [chunkResult, setChunkResult] = useState<any[]>([]);
  const [chunkLoading, setChunkLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [answer, setAnswer] = useState('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showType, setShowType] = useState<'chat' | 'search'>('chat');

  const onReset = () => {
    setConversationId('');
    setConversation([]);
    setAnswer('');
    setChunkResult([]);
    setChunkLoading(false);
    setLoading(false);
    setNonce('');
  };

  const chatAnswer = async (q: string) => {
    setChunkLoading(true);
    setLoading(true);
    setThinking(1);
    setIsUserScrolling(false);

    let token = '';
    // @ts-ignore
    if (kbDetail?.settings?.captcha_settings?.comment_status === 'enable') {
      const cap = new Cap({
        apiEndpoint: '/share/v1/captcha/',
      });
      try {
        const solution = await cap.solve();
        token = solution.token;
      } catch (error) {
        message.error('验证失败');
        console.log(error, 'error---------');
        return;
      }
    }
    const reqData = {
      message: q,
      nonce: '',
      conversation_id: '',
      app_type: 1,
      captcha_token: token,
    };
    if (conversationId) reqData.conversation_id = conversationId;
    if (nonce) reqData.nonce = nonce;

    if (sseClientRef.current) {
      sseClientRef.current.subscribe(
        JSON.stringify(reqData),
        ({ type, content, chunk_result }) => {
          if (type === 'conversation_id') {
            setConversationId(prev => prev + content);
          } else if (type === 'message_id') {
            messageIdRef.current += content;
          } else if (type === 'nonce') {
            setNonce(prev => prev + content);
          } else if (type === 'error') {
            setChunkLoading(false);
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
                const lastConversation =
                  newConversation[newConversation.length - 1];
                if (lastConversation) {
                  lastConversation.a = prevAnswer;
                  lastConversation.update_time = dayjs().format(
                    'YYYY-MM-DD HH:mm:ss',
                  );
                  lastConversation.message_id = messageIdRef.current;
                  lastConversation.source = 'chat';
                }

                return newConversation;
              });
              return '';
            });
            setChunkLoading(false);
            setLoading(false);
            setThinking(4);
          } else if (type === 'data') {
            setChunkLoading(false);
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
          } else if (type === 'chunk_result') {
            setChunkResult(prev => {
              return [...prev, chunk_result];
            });
          }
        },
      );
    }
  };

  useEffect(() => {
    // @ts-ignore
    window.CAP_CUSTOM_WASM_URL =
      window.location.origin + '/cap@0.0.6/cap_wasm.min.js';
  }, []);

  const onSearch = (q: string, reset: boolean = false) => {
    if (loading || !q.trim()) return;
    const newConversation = reset
      ? []
      : conversation.some(item => item.source === 'history')
        ? []
        : [...conversation];
    newConversation.push({
      q,
      a: '',
      score: 0,
      message_id: '',
      update_time: '',
      source: 'chat',
    });
    messageIdRef.current = '';
    setConversation(newConversation);
    setAnswer('');
    setChunkResult([]);
    setTimeout(() => chatAnswer(q), 0);
  };

  const handleSearchAbort = () => {
    sseClientRef.current?.unsubscribe();
    setChunkLoading(false);
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
    const chatContainer = chatContainerRef?.current;
    chatContainer?.addEventListener('scroll', handleScroll);
    return () => {
      chatContainer?.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    if (!isUserScrolling && chatContainerRef?.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [answer, isUserScrolling]);

  useEffect(() => {
    const searchQuery = sessionStorage.getItem('chat_search_query');
    if (searchQuery) {
      sessionStorage.removeItem('chat_search_query');
      onSearch(searchQuery, true);
    }
  }, []);

  useEffect(() => {
    sseClientRef.current = new SSEClient({
      url: `/share/v1/chat/message`,
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
            newConversation[newConversation.length - 1].a = value;
            newConversation[newConversation.length - 1].update_time =
              dayjs().format('YYYY-MM-DD HH:mm:ss');
            newConversation[newConversation.length - 1].message_id =
              messageIdRef.current;
            return newConversation;
          });
          return '';
        });
      },
    });
  }, []);

  useEffect(() => {
    if (conversationId) {
      window.history.replaceState(null, '', `/chat/${conversationId}`);
    }
  }, [conversationId]);

  if (mobile) {
    return (
      <Box sx={{ pt: 4, minHeight: '100vh', position: 'relative' }}>
        <ChatTab showType={showType} setShowType={setShowType} />
        <Box sx={{ mx: 3 }}>
          {showType === 'chat' ? (
            <ChatResult
              conversation={conversation}
              conversation_id={conversationId}
              answer={answer}
              loading={loading}
              thinking={thinking}
              setThinking={setThinking}
              onSearch={onSearch}
              setConversation={setConversation}
              onReset={onReset}
              handleSearchAbort={handleSearchAbort}
            />
          ) : (
            <SearchResult list={chunkResult} loading={chunkLoading} />
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        pt: 4,
        px: 10,
        minHeight: '100vh',
      }}
    >
      <Stack
        alignItems='stretch'
        direction='row'
        gap={3}
        sx={{
          height: 'calc(100vh - 120px)',
          mb: 3,
          maxWidth: '1200px',
          mx: 'auto',
        }}
      >
        <Box sx={{ position: 'relative', flex: 1, width: 0 }}>
          <ChatResult
            conversation={conversation}
            conversation_id={conversationId}
            answer={answer}
            loading={loading}
            thinking={thinking}
            setThinking={setThinking}
            onReset={onReset}
            onSearch={onSearch}
            setConversation={setConversation}
            handleSearchAbort={handleSearchAbort}
          />
        </Box>
        {(chunkLoading || chunkResult.length > 0) && (
          <Box
            sx={{
              flexShrink: 0,
              width: 388,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
              p: 3,
              bgcolor: 'background.paper',
            }}
          >
            <Box
              sx={{
                fontSize: '20px',
                fontWeight: '700',
                lineHeight: '28px',
                mb: 2,
              }}
            >
              搜索结果
            </Box>
            <SearchResult list={chunkResult} loading={chunkLoading} />
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default Chat;
