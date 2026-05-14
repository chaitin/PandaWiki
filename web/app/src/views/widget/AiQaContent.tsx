'use client';
import aiLoading from '@/assets/images/ai-loading.gif';
import Logo from '@/assets/images/logo.png';
import { ChunkResultItem } from '@/assets/type';
import Feedback from '@/components/feedback';
import {
  IconADiancaiWeixuanzhong2,
  IconDiancaiWeixuanzhong,
  IconDianzanXuanzhong1,
  IconDianzanWeixuanzhong,
} from '@panda-wiki/icons';
import { IconCopy } from '@/components/icons';
import MarkDown2 from '@/components/markdown2';
import { useSmartScroll } from '@/hooks';
import { useStore } from '@/provider';
import { postShareV1ChatFeedback } from '@/request/ShareChat';
import { getShareV1ConversationDetail } from '@/request/ShareConversation';
import { copyText } from '@/utils';
import SSEClient from '@/utils/fetch';
import { message } from '@ctzhian/ui';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconFasong,
  IconTupian,
  IconWenjian,
  IconXinduihua,
  IconXingxing,
} from '@panda-wiki/icons';
import {
  DEFAULT_CHAT_TOP_N,
  getInitialChatTopN,
  getInitialQaAppMode,
  persistChatTopN,
} from '@panda-wiki/ui';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  extractWorkModeClarify,
  removeWorkModeClarifyFromAnswer,
} from '@/utils/workModeClarifyParse';
import { v4 as uuidv4 } from 'uuid';
import ChatLoading from '../../views/chat/ChatLoading';
import {
  StyledActionButtonStack,
  StyledActionStack,
  StyledAiBubble,
  StyledAiBubbleContent,
  StyledChunkAccordion,
  StyledChunkAccordionDetails,
  StyledChunkAccordionSummary,
  StyledChunkItem,
  StyledConversationContainer,
  StyledConversationItem,
  StyledFuzzySuggestionItem,
  StyledFuzzySuggestionsStack,
  StyledHotSearchColumn,
  StyledHotSearchColumnItem,
  StyledHotSearchContainer,
  StyledImagePreviewItem,
  StyledImagePreviewStack,
  StyledImageRemoveButton,
  StyledInputContainer,
  StyledInputWrapper,
  StyledMainContainer,
  StyledTextField,
  StyledThinkingAccordion,
  StyledThinkingAccordionDetails,
  StyledThinkingAccordionSummary,
  StyledUserBubble,
} from './StyledComponents';
import { handleThinkingContent } from './utils';
import { useBasePath } from '@/hooks';
import { getImagePath } from '@/utils/getImagePath';

export type ChatChainStep = { step: number; title: string; detail: string };

export interface ConversationItem {
  q: string;
  a: string;
  score: number;
  update_time: string;
  message_id: string;
  source: 'history' | 'chat';
  chunk_result: ChunkResultItem[];
  chain_steps?: ChatChainStep[];
  thinking_content: string;
  id: string;
}

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const CHAT_TOP_N_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const AnswerStatus = {
  1: '正在搜索结果...',
  2: '思考中...',
  3: '正在回答',
  4: '',
  5: '分析附图并检索资料…',
};

const LoadingContent = ({
  thinking,
}: {
  thinking: keyof typeof AnswerStatus;
}) => {
  if (thinking === 4 || thinking === 2) return null;
  return (
    <Stack direction='row' alignItems='center' gap={1} sx={{ pb: 1 }}>
      <Image src={aiLoading} alt='ai-loading' width={20} height={20} />
      <Typography
        variant='body2'
        sx={theme => ({
          fontSize: 12,
          color: alpha(theme.palette.text.primary, 0.5),
        })}
      >
        {AnswerStatus[thinking]}
      </Typography>
    </Stack>
  );
};

const AiQaContent: React.FC<{
  hotSearch: string[];
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}> = ({ hotSearch, placeholder, inputRef }) => {
  const { widget } = useStore();
  const sseClientRef = useRef<SSEClient<{
    type: string;
    content: string;
    chunk_result: ChunkResultItem;
  }> | null>(null);
  const { palette } = useTheme();
  const messageIdRef = useRef('');
  const [fullAnswer, setFullAnswer] = useState<string>('');
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState<keyof typeof AnswerStatus>(4);
  const [nonce, setNonce] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [conversationItem, setConversationItem] =
    useState<ConversationItem | null>(null);
  const [uploadedImages, setUploadedImages] = useState<
    Array<{
      id: string;
      url: string;
      file: File;
    }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fuzzySuggestions, setFuzzySuggestions] = useState<string[]>([]);
  const [showFuzzySuggestions, setShowFuzzySuggestions] = useState(false);
  const [topN, setTopN] = useState<number>(DEFAULT_CHAT_TOP_N);
  const topNPersistReady = useRef(false);

  const searchParams = useSearchParams();

  // 使用智能滚动 hook（内置 ResizeObserver 自动监听内容高度变化，自动滚动）
  const { setShouldAutoScroll } = useSmartScroll({
    container: '.conversation-container',
    behavior: 'smooth',
  });

  const onReset = () => {
    if (loading) {
      handleSearchAbort();
    }
    handleSearch(true);
    setConversationId('');
    setConversation([]);
    setFullAnswer('');
    setInput('');
    // 清理图片URL
    uploadedImages.forEach(img => {
      if (img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
      }
    });
    setUploadedImages([]);
    setLoading(false);
    setNonce('');
  };

  const handleSearch = (reset: boolean = false) => {
    if (input.length > 0) {
      onSearch(input, reset);
      setInput('');
      // 清理图片URL
      uploadedImages.forEach(img => {
        if (img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });
      setUploadedImages([]);
    }
  };

  const onSuggestionClick = (text: string) => {
    setInput('');
    onSearch(text);
  };

  // 处理图片选择（支持多张）
  const handleImageSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxImages = 9; // 最多9张图片
    const remainingSlots = maxImages - uploadedImages.length;
    if (remainingSlots <= 0) {
      message.warning(`最多只能上传 ${maxImages} 张图片`);
      return;
    }

    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    try {
      const newImages: Array<{
        id: string;
        url: string;
        file: File;
      }> = [];

      for (const file of filesToAdd) {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
          message.error('只支持上传图片文件');
          continue;
        }

        // 验证文件大小 (10MB)
        if (file.size > 10 * 1024 * 1024) {
          message.error('图片大小不能超过 10MB');
          continue;
        }

        // 创建本地预览 URL
        const localUrl = URL.createObjectURL(file);

        newImages.push({
          id: Date.now().toString() + Math.random(),
          url: localUrl,
          file,
        });
      }

      const updatedImages = [...uploadedImages, ...newImages];
      setUploadedImages(updatedImages);
    } catch (error: any) {
      message.error(error.message || '图片选择失败');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleImageSelect(event.target.files);
    // 重置 input value 以允许上传相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (id: string) => {
    const imageToRemove = uploadedImages.find(img => img.id === id);
    if (imageToRemove && imageToRemove.url.startsWith('blob:')) {
      // 释放本地 URL
      URL.revokeObjectURL(imageToRemove.url);
    }

    const updatedImages = uploadedImages.filter(img => img.id !== id);
    setUploadedImages(updatedImages);
  };

  // 处理粘贴上传
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      const dataTransfer = new DataTransfer();
      imageFiles.forEach(file => dataTransfer.items.add(file));
      await handleImageSelect(dataTransfer.files);
    }
  };

  // 处理输入变化，显示模糊搜索建议
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // if (value.trim().length > 0) {
    //   // 改进的模糊搜索逻辑
    //   const filtered = mockFuzzySuggestions
    //     .filter(suggestion => {
    //       const lowerSuggestion = suggestion.toLowerCase();
    //       const lowerValue = value.toLowerCase();
    //       // 支持前缀匹配和包含匹配
    //       return (
    //         lowerSuggestion.startsWith(lowerValue) ||
    //         lowerSuggestion.includes(lowerValue)
    //       );
    //     })
    //     .slice(0, 5); // 限制显示数量

    //   setFuzzySuggestions(filtered);
    //   setShowFuzzySuggestions(true);
    // } else {
    //   setShowFuzzySuggestions(false);
    //   setFuzzySuggestions([]);
    // }
  };

  // 选择模糊搜索建议
  const handleFuzzySuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowFuzzySuggestions(false);
    setFuzzySuggestions([]);
  };

  // 高亮显示匹配的文本
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    // 转义特殊字符，避免正则表达式错误
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      // 检查是否匹配（不区分大小写）
      if (part.toLowerCase() === query.toLowerCase()) {
        return (
          <Box
            component='span'
            key={index}
            sx={{
              color: 'primary.main',
            }}
          >
            {part}
          </Box>
        );
      }
      return part;
    });
  };

  // 处理输入框失去焦点
  const handleInputBlur = () => {
    // 延迟隐藏，让用户有时间点击建议
    setTimeout(() => {
      setShowFuzzySuggestions(false);
    }, 200);
  };

  // 处理输入框获得焦点
  const handleInputFocus = () => {
    if (input.trim().length > 0) {
      setShowFuzzySuggestions(true);
    }
  };

  const chatAnswer = async (q: string) => {
    setLoading(true);
    setThinking(1);

    let token = '';

    // const Cap = (await import(`@cap.js/widget`)).default;
    // const cap = new Cap({
    //   apiEndpoint: `${basePath}/share/v1/captcha/`,
    // });
    // try {
    //   const solution = await cap.solve();
    //   token = solution.token;
    // } catch (error) {
    //   message.error('验证失败');
    //   console.log(error, 'error---------');
    //   return;
    // }

    const reqData = {
      message: q,
      nonce: '',
      conversation_id: '',
      app_type: 2,
      captcha_token: token,
      top_n: topN,
      qa_mode: getInitialQaAppMode(),
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
            setLoading(false);
            setThinking(4);
            setConversation(prev => {
              const newConversation = [...prev];
              const lastConversation =
                newConversation[newConversation.length - 1];
              if (lastConversation) {
                lastConversation.a =
                  lastConversation.a +
                  (content
                    ? `\n\n回答出现错误：<error>${content}</error>`
                    : '\n\n回答出现错误，请重试');
              }
              return newConversation;
            });
            if (content) message.error(content);
          } else if (type === 'done') {
            setConversation(prev => {
              const newConversation = [...prev];
              const lastConversation =
                newConversation[newConversation.length - 1];
              if (lastConversation) {
                lastConversation.update_time = dayjs().format(
                  'YYYY-MM-DD HH:mm:ss',
                );
                lastConversation.message_id = messageIdRef.current;
                lastConversation.source = 'chat';
              }
              return newConversation;
            });

            setFullAnswer('');
            setLoading(false);

            setThinking(4);
          } else if (type === 'data') {
            setFullAnswer(prevFullAnswer => {
              const newFullAnswer = prevFullAnswer + content;

              const { thinkingContent, answerContent } =
                handleThinkingContent(newFullAnswer);

              // 更新状态
              if (newFullAnswer.includes('</think>')) {
                setThinking(3);
              } else if (newFullAnswer.includes('<think>')) {
                setThinking(2);
              } else {
                setThinking(3);
              }
              setConversation(preConversation => {
                const newConversation = [...preConversation];
                const lastConversation =
                  newConversation[newConversation.length - 1];
                if (lastConversation) {
                  lastConversation.a = answerContent;
                  lastConversation.thinking_content = thinkingContent;
                }
                return newConversation;
              });

              return newFullAnswer;
            });
          } else if (type === 'chain_step') {
            try {
              const step = JSON.parse(content) as {
                step: number;
                title: string;
                detail: string;
              };
              if (
                typeof step?.step === 'number' &&
                typeof step?.title === 'string'
              ) {
                setConversation(preConversation => {
                  const newConversation = [...preConversation];
                  const lastConversation =
                    newConversation[newConversation.length - 1];
                  if (lastConversation) {
                    const prev = lastConversation.chain_steps || [];
                    lastConversation.chain_steps = [
                      ...prev,
                      {
                        step: step.step,
                        title: step.title,
                        detail: String(step.detail ?? ''),
                      },
                    ];
                  }
                  return newConversation;
                });
              }
            } catch {
              /* ignore */
            }
          } else if (type === 'chunk_result') {
            setThinking(1);
            setConversation(preConversation => {
              const newConversation = [...preConversation];
              const lastConversation =
                newConversation[newConversation.length - 1];
              if (lastConversation) {
                lastConversation.chunk_result = [
                  ...lastConversation.chunk_result,
                  chunk_result,
                ];
              }
              return newConversation;
            });
          }
        },
      );
    }
  };

  useEffect(() => {
    // window.CAP_CUSTOM_WASM_URL =
    //   window.location.origin + `${basePath}/cap@0.0.6/cap_wasm.min.js`;
  }, []);

  useEffect(() => {
    setTopN(getInitialChatTopN());
  }, []);

  useEffect(() => {
    if (!topNPersistReady.current) {
      topNPersistReady.current = true;
      return;
    }
    persistChatTopN(topN);
  }, [topN]);

  const onSearch = (q: string, reset: boolean = false) => {
    if (loading || !q.trim()) return;
    setShouldAutoScroll(true); // 开始新搜索时，重置为自动滚动
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
      chunk_result: [],
      chain_steps: [],
      thinking_content: '',
      id: uuidv4(),
    });
    messageIdRef.current = '';
    setConversation(newConversation);
    setFullAnswer('');
    setTimeout(() => chatAnswer(q), 0);
  };

  const handleSearchAbort = () => {
    sseClientRef.current?.unsubscribe();
    setLoading(false);
    setThinking(4);
  };

  const { mobile = false, kbDetail } = useStore();
  const basePath = useBasePath();
  const isFeedbackEnabled =
    // @ts-ignore
    kbDetail?.settings?.ai_feedback_settings?.is_enabled ?? true;

  const handleScore = async (
    message_id: string,
    score: number,
    type?: string,
    content?: string,
  ) => {
    const data: any = {
      conversation_id: conversationId,
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
    sseClientRef.current = new SSEClient({
      url: `${basePath}/share/v1/chat/widget`,
      headers: {
        'Content-Type': 'application/json',
      },
      onCancel: () => {
        setLoading(false);
        setThinking(4);
        setConversation(prev => {
          const newConversation = [...prev];
          const lastConversation = newConversation[newConversation.length - 1];
          if (lastConversation) {
            lastConversation.a =
              lastConversation.a + '\n\n<error>Request canceled</error>';
            lastConversation.update_time = dayjs().format(
              'YYYY-MM-DD HH:mm:ss',
            );
            lastConversation.message_id = messageIdRef.current;
          }
          return newConversation;
        });
      },
    });
    const searchQuery =
      sessionStorage.getItem('chat_search_query') || searchParams.get('ask');
    if (searchQuery) {
      sessionStorage.removeItem('chat_search_query');
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('cid');
      window.history.replaceState(null, '', newSearchParams.toString());
      onSearch(searchQuery, true);
    }
    return () => {
      handleSearchAbort();
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('cid');
      window.history.replaceState(null, '', currentUrl.toString());
      setTimeout(() => {
        onReset();
      });
    };
  }, []);

  useEffect(() => {
    if (conversationId) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('sid');
      currentUrl.searchParams.set('cid', conversationId);
      window.history.replaceState(null, '', currentUrl.toString());
    }
  }, [conversationId]);

  useEffect(() => {
    const cid = searchParams.get('cid');
    if (cid) {
      const conversation: ConversationItem[] = [];
      getShareV1ConversationDetail({
        id: cid,
      }).then(res => {
        if (res.messages) {
          let current: Partial<ConversationItem> = {
            chunk_result: [],
          };
          res.messages.forEach(message => {
            if (message.role === 'user') {
              if (current.q) {
                conversation.push({
                  q: current.q,
                  a: '',
                  score: 0,
                  update_time: '',
                  message_id: '',
                  source: 'history',
                  chunk_result: [],
                  thinking_content: '',
                  id: uuidv4(),
                });
              }
              current = {
                q: message.content,
                chunk_result: [],
              };
            } else if (message.role === 'assistant') {
              if (current.q) {
                const { thinkingContent, answerContent } =
                  handleThinkingContent(message.content || '');

                current.a = answerContent;
                current.update_time = message.created_at;
                current.score = 0;
                current.message_id = '';
                current.thinking_content = thinkingContent;
                current.source = 'history';
                current.id = uuidv4();
                conversation.push(current as ConversationItem);
                current = {};
              }
            }
          });

          if (current.q) {
            conversation.push({
              q: current.q,
              a: '',
              score: 0,
              update_time: '',
              message_id: '',
              source: 'history',
              chunk_result: [],
              thinking_content: '',
              id: uuidv4(),
            });
          }
        }
        setConversation(conversation);
        setShouldAutoScroll(false);
      });
    }
  }, []);

  return (
    <StyledMainContainer className={palette.mode === 'dark' ? 'md-dark' : ''}>
      {/* 无对话时显示欢迎界面 */}
      {conversation.length === 0 && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            pb: 5,
          }}
        >
          {/* Logo区域 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 8 }}>
            <Image
              src={getImagePath(kbDetail?.settings?.icon || Logo.src, basePath)}
              alt='logo'
              width={46}
              height={46}
              unoptimized
              style={{
                objectFit: 'contain',
              }}
            />
            <Typography
              variant='h6'
              sx={{ fontSize: 32, color: 'text.primary', fontWeight: 700 }}
            >
              {kbDetail?.settings?.title}
            </Typography>
          </Box>

          {/* 热门搜索区域 */}
          {hotSearch.length > 0 && (
            <Box sx={{ width: '100%' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <IconXingxing sx={{ fontSize: 14 }} />
                  大家都在搜什么?
                </Typography>
              </Box>

              {/* 热门搜索列表 - 两列布局 */}
              <StyledHotSearchContainer>
                {/* 左列 */}
                <StyledHotSearchColumn>
                  {hotSearch
                    .filter((_, index) => index % 2 === 0)
                    .map((suggestion, index) => (
                      <StyledHotSearchColumnItem
                        key={index * 2}
                        onClick={() => onSuggestionClick(suggestion)}
                      >
                        • {suggestion}
                      </StyledHotSearchColumnItem>
                    ))}
                </StyledHotSearchColumn>

                {/* 右列 */}
                <StyledHotSearchColumn>
                  {hotSearch
                    .filter((_, index) => index % 2 === 1)
                    .map((suggestion, index) => (
                      <StyledHotSearchColumnItem
                        key={index * 2 + 1}
                        onClick={() => onSuggestionClick(suggestion)}
                      >
                        • {suggestion}
                      </StyledHotSearchColumnItem>
                    ))}
                </StyledHotSearchColumn>
              </StyledHotSearchContainer>
            </Box>
          )}
        </Box>
      )}

      {/* 有对话时显示对话历史 */}
      <StyledConversationContainer
        direction='column'
        className='conversation-container'
        sx={{
          mb: conversation?.length > 0 ? 2 : 0,
          display: conversation.length > 0 ? 'flex' : 'none',
        }}
      >
        <Stack gap={2}>
          {conversation.map((item, index) => (
            <StyledConversationItem key={item.id}>
              {/* 用户问题气泡 - 右对齐 */}
              <StyledUserBubble>{item.q}</StyledUserBubble>

              {/* AI回答气泡 - 左对齐 */}
              <StyledAiBubble>
                {(item.chain_steps?.length ?? 0) > 0 && (
                  <StyledThinkingAccordion defaultExpanded>
                    <StyledThinkingAccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
                    >
                      <Typography
                        variant='body2'
                        sx={theme => ({
                          fontSize: 12,
                          color: alpha(theme.palette.text.primary, 0.5),
                        })}
                      >
                        思维链（附图检索准备）
                      </Typography>
                    </StyledThinkingAccordionSummary>
                    <StyledThinkingAccordionDetails>
                      <Stack gap={1.5}>
                        {(item.chain_steps || []).map((s, si) => (
                          <Box key={`${s.step}-${si}`}>
                            <Typography
                              variant='body2'
                              sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}
                            >
                              {s.step}. {s.title}
                            </Typography>
                            <Typography
                              variant='body2'
                              sx={theme => ({
                                fontSize: 12,
                                color: alpha(theme.palette.text.primary, 0.65),
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              })}
                            >
                              {s.detail}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </StyledThinkingAccordionDetails>
                  </StyledThinkingAccordion>
                )}
                {/* 搜索结果 */}
                {item.chunk_result.length > 0 && (
                  <StyledChunkAccordion defaultExpanded>
                    <StyledChunkAccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
                    >
                      <Typography
                        variant='body2'
                        sx={theme => ({
                          fontSize: 12,
                          color: alpha(theme.palette.text.primary, 0.5),
                        })}
                      >
                        共找到 {item.chunk_result.length} 个结果
                      </Typography>
                    </StyledChunkAccordionSummary>

                    <StyledChunkAccordionDetails>
                      <Stack gap={1}>
                        {item.chunk_result.map((chunk, chunkIndex) => (
                          <StyledChunkItem key={chunkIndex}>
                            <Typography
                              variant='body2'
                              className='hover-primary'
                              sx={theme => ({
                                fontSize: 12,
                                color: alpha(theme.palette.text.primary, 0.5),
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                minWidth: 0,
                                cursor: 'pointer',
                              })}
                              onClick={() => {
                                window.open(
                                  `${basePath}/node/${chunk.node_id}`,
                                  '_blank',
                                );
                              }}
                            >
                              <Box
                                component='span'
                                sx={{
                                  flexShrink: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  lineHeight: 1,
                                }}
                              >
                                {chunk.emoji || (
                                  <IconWenjian
                                    sx={{ fontSize: 14, color: 'inherit' }}
                                  />
                                )}
                              </Box>
                              <Box
                                component='span'
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  minWidth: 0,
                                }}
                              >
                                {chunk.name}
                              </Box>
                            </Typography>
                          </StyledChunkItem>
                        ))}
                      </Stack>
                    </StyledChunkAccordionDetails>
                  </StyledChunkAccordion>
                )}

                {/* 加载状态 */}
                {index === conversation.length - 1 && loading && (
                  <LoadingContent thinking={thinking} />
                )}

                {/* 思考过程 */}
                {!!item.thinking_content && (
                  <StyledThinkingAccordion defaultExpanded>
                    <StyledThinkingAccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
                    >
                      <Stack direction='row' alignItems='center' gap={1}>
                        {thinking === 2 &&
                          index === conversation.length - 1 && (
                            <Image
                              src={aiLoading}
                              alt='ai-loading'
                              width={20}
                              height={20}
                            />
                          )}

                        <Typography
                          variant='body2'
                          sx={theme => ({
                            fontSize: 12,
                            color: alpha(theme.palette.text.primary, 0.5),
                          })}
                        >
                          {thinking === 2 && index === conversation.length - 1
                            ? '思考中...'
                            : '已思考'}
                        </Typography>
                      </Stack>
                    </StyledThinkingAccordionSummary>

                    <StyledThinkingAccordionDetails>
                      <MarkDown2
                        content={item.thinking_content || ''}
                        autoScroll={false}
                      />
                    </StyledThinkingAccordionDetails>
                  </StyledThinkingAccordion>
                )}

                {/* AI回答内容 */}
                <StyledAiBubbleContent>
                  {(() => {
                    const { meta, text } = extractWorkModeClarify(item.a);
                    const identified = !!meta && !!meta.identified_doc_id;
                    const isAsking =
                      !!meta && !identified && (meta.missing?.length ?? 0) > 0;
                    const isTerminal =
                      !!meta &&
                      !identified &&
                      (meta.missing?.length ?? 0) === 0;
                    const headerLabel = identified
                      ? '工作模式 · 已识别文档'
                      : isTerminal
                        ? '工作模式 · 终态'
                        : meta && meta.candidates >= 2
                          ? '工作模式 · 候选差异核对'
                          : '工作模式 · 信息完备性核对';
                    return (
                      <>
                        {meta && (
                          <Box
                            sx={theme => ({
                              mb: 1.5,
                              p: 1.25,
                              borderRadius: '10px',
                              border: '1px solid',
                              borderColor: alpha(
                                theme.palette.primary.main,
                                0.25,
                              ),
                              backgroundColor: alpha(
                                theme.palette.primary.main,
                                0.06,
                              ),
                            })}
                          >
                            <Stack
                              direction='row'
                              alignItems='flex-start'
                              justifyContent='space-between'
                              gap={0.5}
                              sx={{ mb: 0.5 }}
                            >
                              <Typography
                                variant='body2'
                                sx={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: 'primary.main',
                                  flex: 1,
                                  minWidth: 0,
                                }}
                              >
                                {headerLabel}
                                {meta.round && meta.max_rounds
                                  ? `（第 ${meta.round}/${meta.max_rounds} 轮）`
                                  : ''}
                              </Typography>
                              {isAsking && (
                                <Tooltip title='删除追问内容'>
                                  <IconButton
                                    size='small'
                                    aria-label='删除追问内容'
                                    sx={{ mt: -0.5, mr: -0.5, flexShrink: 0 }}
                                    onClick={() => {
                                      const next =
                                        removeWorkModeClarifyFromAnswer(item.a);
                                      if (next === null) return;
                                      setConversation(prev =>
                                        prev.map(c =>
                                          c.id === item.id
                                            ? { ...c, a: next }
                                            : c,
                                        ),
                                      );
                                    }}
                                  >
                                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                            {identified && (
                              <Typography
                                variant='body2'
                                sx={theme => ({
                                  fontSize: 12,
                                  color: alpha(theme.palette.text.primary, 0.7),
                                  mb: 0.75,
                                })}
                              >
                                品类「{meta.category}
                                」已收敛到唯一文档，回答仅基于该文档。
                              </Typography>
                            )}
                            {isAsking && (
                              <Typography
                                variant='body2'
                                sx={theme => ({
                                  fontSize: 12,
                                  color: alpha(theme.palette.text.primary, 0.7),
                                  mb: 0.75,
                                })}
                              >
                                {meta.candidates >= 2
                                  ? `品类「${meta.category}」匹配到 ${meta.candidates} 个候选，请补充以下区分项：`
                                  : `品类「${meta.category}」需要补充以下信息以定位文档：`}
                              </Typography>
                            )}
                            {isTerminal && (
                              <Typography
                                variant='body2'
                                sx={theme => ({
                                  fontSize: 12,
                                  color: alpha(theme.palette.text.primary, 0.7),
                                  mb: 0.75,
                                })}
                              >
                                品类「{meta.category}
                                」未能继续收敛，请参考下方说明换种描述或在剩余候选中选择。
                              </Typography>
                            )}
                            {meta.collected &&
                              Object.keys(meta.collected).length > 0 && (
                                <Stack gap={0.5} sx={{ mb: 0.75 }}>
                                  <Typography
                                    variant='caption'
                                    sx={theme => ({
                                      fontSize: 11,
                                      color: alpha(
                                        theme.palette.text.primary,
                                        0.6,
                                      ),
                                    })}
                                  >
                                    已收集
                                  </Typography>
                                  <Stack
                                    direction='row'
                                    gap={0.5}
                                    flexWrap='wrap'
                                  >
                                    {Object.entries(meta.collected).map(
                                      ([k, v]) => (
                                        <Box
                                          key={k}
                                          sx={theme => ({
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: '6px',
                                            fontSize: 12,
                                            color: theme.palette.success.main,
                                            backgroundColor: alpha(
                                              theme.palette.success.main,
                                              0.08,
                                            ),
                                            border: '1px solid',
                                            borderColor: alpha(
                                              theme.palette.success.main,
                                              0.4,
                                            ),
                                          })}
                                        >
                                          {k}: {v}
                                        </Box>
                                      ),
                                    )}
                                  </Stack>
                                </Stack>
                              )}
                            {isAsking && meta.missing.length > 0 && (
                              <Stack gap={0.5}>
                                <Typography
                                  variant='caption'
                                  sx={theme => ({
                                    fontSize: 11,
                                    color: alpha(
                                      theme.palette.text.primary,
                                      0.6,
                                    ),
                                  })}
                                >
                                  待补充
                                </Typography>
                                <Stack
                                  direction='row'
                                  gap={0.75}
                                  flexWrap='wrap'
                                >
                                  {meta.missing.map(name => (
                                    <Box
                                      key={name}
                                      sx={theme => ({
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: '6px',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        color: 'primary.main',
                                        backgroundColor:
                                          theme.palette.background.default,
                                        border: '1px solid',
                                        borderColor: alpha(
                                          theme.palette.primary.main,
                                          0.4,
                                        ),
                                      })}
                                    >
                                      {name}
                                    </Box>
                                  ))}
                                </Stack>
                              </Stack>
                            )}
                          </Box>
                        )}
                        <MarkDown2 content={text} autoScroll={false} />
                      </>
                    );
                  })()}
                </StyledAiBubbleContent>

                {/* 操作按钮 */}
                {(index !== conversation.length - 1 || !loading) && (
                  <StyledActionStack
                    direction={mobile ? 'column' : 'row'}
                    alignItems={mobile ? 'flex-start' : 'center'}
                    justifyContent='space-between'
                    gap={mobile ? 1 : 3}
                  >
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
                            <IconDianzanXuanzhong1 sx={{ cursor: 'pointer' }} />
                          )}
                          {item.score !== 1 && (
                            <IconDianzanWeixuanzhong
                              sx={{ cursor: 'pointer' }}
                              onClick={() => {
                                if (item.score === 0)
                                  handleScore(item.message_id, 1);
                              }}
                            />
                          )}
                          {item.score !== -1 && (
                            <IconDiancaiWeixuanzhong
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
                            <IconADiancaiWeixuanzhong2
                              sx={{ cursor: 'pointer' }}
                            />
                          )}
                        </>
                      )}
                    </Stack>
                    <Box>
                      {widget?.settings?.widget_bot_settings?.disclaimer ||
                        '本回答由 AI 自动生成，仅供参考。'}
                    </Box>
                  </StyledActionStack>
                )}
              </StyledAiBubble>
            </StyledConversationItem>
          ))}
        </Stack>
      </StyledConversationContainer>
      {conversation.length > 0 && (
        <Button
          variant='contained'
          sx={theme => ({
            textTransform: 'none',
            minWidth: 'auto',
            px: 3.5,
            py: '2px',
            gap: 0.5,
            fontSize: 12,
            backgroundColor: 'background.default',
            color: 'text.primary',
            boxShadow: `0px 1px 2px 0px ${alpha(theme.palette.text.primary, 0.06)}`,
            border: '1px solid',
            borderColor: alpha(theme.palette.text.primary, 0.1),
            cursor: 'pointer',
            '&:hover': {
              boxShadow: `0px 1px 2px 0px ${alpha(theme.palette.text.primary, 0.06)}`,
              borderColor: 'primary.main',
              color: 'primary.main',
            },
            mb: 2,
          })}
          onClick={onReset}
        >
          <IconXinduihua sx={{ fontSize: 14 }} />
          新会话
        </Button>
      )}

      <StyledInputContainer>
        <StyledInputWrapper>
          {/* 多张图片预览 */}
          {uploadedImages.length > 0 && (
            <StyledImagePreviewStack direction='row' flexWrap='wrap' gap={1}>
              {uploadedImages.map(image => (
                <StyledImagePreviewItem key={image.id}>
                  <Image
                    src={image.url}
                    alt='uploaded'
                    width={40}
                    height={40}
                    style={{
                      objectFit: 'cover',
                    }}
                  />
                  <StyledImageRemoveButton
                    size='small'
                    onClick={() => handleRemoveImage(image.id)}
                  >
                    <CloseIcon sx={{ fontSize: 10 }} />
                  </StyledImageRemoveButton>
                </StyledImagePreviewItem>
              ))}
            </StyledImagePreviewStack>
          )}
          <StyledTextField
            fullWidth
            multiline
            rows={2}
            disabled={loading}
            ref={inputRef}
            size='small'
            value={input}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onPaste={handlePaste}
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
            placeholder={placeholder}
            autoComplete='off'
          />
          <StyledActionButtonStack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
          >
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              multiple
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <Stack direction='row' alignItems='center' gap={0.5}>
              <Tooltip title='敬请期待'>
                <IconButton
                  size='small'
                  // onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  sx={{
                    flexShrink: 0,
                  }}
                >
                  <IconTupian sx={{ fontSize: 20, color: 'text.secondary' }} />
                </IconButton>
              </Tooltip>

              <Tooltip
                title='知识库检索返回的片段数量上限（1～10）'
                placement='top'
              >
                <FormControl size='small' sx={{ minWidth: 76, flexShrink: 0 }}>
                  <Select
                    value={topN}
                    onChange={e => setTopN(Number(e.target.value))}
                    disabled={loading}
                    sx={{ fontSize: 12, height: 32 }}
                  >
                    {CHAT_TOP_N_OPTIONS.map(n => (
                      <MenuItem key={n} value={n} sx={{ fontSize: 12 }}>
                        Top {n}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Tooltip>
            </Stack>

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
                  <IconFasong
                    sx={{
                      fontSize: 16,
                      color:
                        input.length > 0 ? 'primary.main' : 'text.disabled',
                    }}
                  />
                </IconButton>
              )}
            </Box>
          </StyledActionButtonStack>
        </StyledInputWrapper>
      </StyledInputContainer>
      {/* 模糊搜索建议列表 */}
      {showFuzzySuggestions &&
        fuzzySuggestions.length > 0 &&
        conversation.length === 0 && (
          <StyledFuzzySuggestionsStack gap={0.5}>
            {fuzzySuggestions.map((suggestion, index) => (
              <StyledFuzzySuggestionItem
                key={index}
                onClick={() => handleFuzzySuggestionClick(suggestion)}
              >
                {highlightMatch(suggestion, input)}
              </StyledFuzzySuggestionItem>
            ))}
          </StyledFuzzySuggestionsStack>
        )}

      <Feedback
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleScore}
        data={conversationItem}
      />
    </StyledMainContainer>
  );
};

export default AiQaContent;
