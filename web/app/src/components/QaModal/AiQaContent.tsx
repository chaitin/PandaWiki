'use client';
import { useStore } from '@/provider';
import SSEClient from '@/utils/fetch';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { postShareV1CommonFileUpload } from '@/request/ShareFile';
import dayjs from 'dayjs';
import { ChunkResultItem } from '@/assets/type';
import Logo from '@/assets/images/logo.png';
import aiLoading from '@/assets/images/ai-loading.gif';
import { getShareV1ConversationDetail } from '@/request/ShareConversation';
import { message, Image as ImagePreview } from '@ctzhian/ui';
import Feedback from '@/components/feedback';
import { handleThinkingContent } from './utils';
import { useSmartScroll } from '@/hooks';
import { useTheme } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { useBasePath } from '@/hooks';
import { IconCopy } from '@/components/icons';
import {
  IconADiancaiWeixuanzhong2,
  IconDiancaiWeixuanzhong,
  IconDianzanXuanzhong1,
  IconDianzanWeixuanzhong,
} from '@panda-wiki/icons';
import MarkDown2 from '@/components/markdown2';
import { postShareV1ChatFeedback } from '@/request/ShareChat';
import { copyText } from '@/utils';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
  Tooltip,
  alpha,
} from '@mui/material';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import ChatLoading from '../../views/chat/ChatLoading';
import {
  IconTupian,
  IconFasong,
  IconXingxing,
  IconXinduihua,
  IconWenjian,
} from '@panda-wiki/icons';
import {
  DEFAULT_CHAT_TOP_N,
  getInitialChatTopN,
  getInitialQaAppMode,
  persistChatTopN,
} from '@panda-wiki/ui';
import CloseIcon from '@mui/icons-material/Close';
import Image from 'next/image';
import {
  StyledMainContainer,
  StyledConversationContainer,
  StyledConversationItem,
  StyledUserBubble,
  StyledAiBubble,
  StyledAiBubbleContent,
  StyledChunkAccordion,
  StyledChunkAccordionSummary,
  StyledChunkAccordionDetails,
  StyledChunkItem,
  StyledThinkingAccordion,
  StyledThinkingAccordionSummary,
  StyledThinkingAccordionDetails,
  StyledActionStack,
  StyledInputContainer,
  StyledInputWrapper,
  StyledImagePreviewStack,
  StyledImagePreviewItem,
  StyledImageRemoveButton,
  StyledTextField,
  StyledActionButtonStack,
  StyledFuzzySuggestionsStack,
  StyledFuzzySuggestionItem,
  StyledHotSearchContainer,
  StyledHotSearchColumn,
  StyledHotSearchColumnItem,
} from './StyledComponents';

import { getImagePath } from '@/utils/getImagePath';

export type ChatChainStep = { step: number; title: string; detail: string };

export interface ConversationItem {
  image_paths: string[];
  q: string;
  a: string;
  score: number;
  update_time: string;
  message_id: string;
  source: 'history' | 'chat';
  chunk_result: ChunkResultItem[];
  /** 附图多步理解（与向量检索准备），由 SSE chain_step 推送 */
  chain_steps?: ChatChainStep[];
  result_expend: boolean;
  thinking_expend: boolean;
  thinking_content: string;
  id: string;
}

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const CHAT_TOP_N_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

interface WorkModeClarifyMeta {
  category: string;
  candidates: number;
  missing: string[];
}

const WORK_MODE_CLARIFY_REGEX =
  /<!--\s*WORK_MODE_CLARIFY\s+(\{[\s\S]*?\})\s*-->\s*\n?/;

function extractWorkModeClarify(content: string): {
  meta: WorkModeClarifyMeta | null;
  text: string;
} {
  if (!content) return { meta: null, text: '' };
  const match = content.match(WORK_MODE_CLARIFY_REGEX);
  if (!match) return { meta: null, text: content };
  try {
    const parsed = JSON.parse(match[1]);
    const meta: WorkModeClarifyMeta = {
      category: typeof parsed.category === 'string' ? parsed.category : '',
      candidates: typeof parsed.candidates === 'number' ? parsed.candidates : 0,
      missing: Array.isArray(parsed.missing)
        ? parsed.missing.filter((s: unknown) => typeof s === 'string')
        : [],
    };
    return { meta, text: content.replace(match[0], '') };
  } catch {
    return { meta: null, text: content.replace(match[0], '') };
  }
}

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
      <Image
        src={aiLoading}
        alt='ai-loading'
        unoptimized
        width={20}
        height={20}
      />
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
  /** 工作模式：问答区采用偏商务的冷灰 / 藏青配色 */
  qaWorkMode?: boolean;
}> = ({ hotSearch, placeholder, inputRef, qaWorkMode = false }) => {
  const sseClientRef = useRef<SSEClient<{
    type: string;
    content: string;
    chunk_result: ChunkResultItem;
  }> | null>(null);
  const theme = useTheme();
  const { palette } = theme;

  const workChrome = useMemo(() => {
    if (!qaWorkMode) return null;
    const L = theme.palette.mode === 'light';
    return {
      inputWrapper: L
        ? {
            bgcolor: '#ffffff',
            borderColor: '#cbd5e1',
            boxShadow: '0 2px 14px rgba(15, 23, 42, 0.07)',
            '&:hover': { borderColor: 'rgba(30, 41, 59, 0.38)' },
            '&:focus-within': {
              borderColor: '#1e40af',
              boxShadow: '0 0 0 1px rgba(30, 64, 175, 0.22)',
            },
          }
        : {
            bgcolor: 'rgba(15, 23, 42, 0.55)',
            borderColor: 'rgba(148, 163, 184, 0.28)',
            boxShadow: 'none',
            '&:hover': { borderColor: 'rgba(148, 163, 184, 0.42)' },
            '&:focus-within': {
              borderColor: '#94a3b8',
              boxShadow: '0 0 0 1px rgba(148, 163, 184, 0.22)',
            },
          },
      textFieldBg: L ? '#fafafa' : 'rgba(15, 23, 42, 0.35)',
      userBubble: L
        ? { bgcolor: '#0f172a', color: '#f8fafc' }
        : { bgcolor: '#334155', color: '#f1f5f9' },
      accent: L ? '#1e3a8a' : '#94a3b8',
      hotTitle: L ? '#334155' : '#cbd5e1',
      title: L ? '#0f172a' : '#f1f5f9',
      hotColBorder: L
        ? 'rgba(148, 163, 184, 0.4)'
        : 'rgba(148, 163, 184, 0.16)',
      hotItemHover: L ? '#1e3a8a' : '#94a3b8',
      fuzzySuggestHoverBg: L
        ? 'rgba(15, 23, 42, 0.06)'
        : 'rgba(248, 250, 252, 0.08)',
      newConvHover: L
        ? { borderColor: '#475569', color: '#0f172a' }
        : { borderColor: '#94a3b8', color: '#e2e8f0' },
    };
  }, [qaWorkMode, theme]);
  const messageIdRef = useRef('');
  const lastResultExpendRef = useRef(false);
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
  const basePath = useBasePath();

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
    if (input.length > 0 || uploadedImages.length > 0) {
      onSearch(input, reset);
    }
  };

  const onSuggestionClick = (text: string) => {
    setInput('');
    onSearch(text);
  };

  // 处理图片选择（支持多张）
  const handleImageSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxImages = 3;
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
              color: workChrome ? workChrome.accent : 'primary.main',
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

  const uploadAllImages = async (
    images?: typeof uploadedImages,
  ): Promise<string[]> => {
    const imagesToUpload = images || uploadedImages;
    if (imagesToUpload.length === 0) return [];

    const uploadedUrls: string[] = [];

    try {
      for (const image of imagesToUpload) {
        let token = '';
        // 上传新图片
        const result = await postShareV1CommonFileUpload({
          file: image.file,
          captcha_token: token,
        });
        const serverUrl = '/static-file/' + result.key;
        uploadedUrls.push(serverUrl);
      }

      return uploadedUrls;
    } catch (error: any) {
      setLoading(false);
      message.error(error.message || '图片上传失败');
      throw error;
    }
  };

  const chatAnswer = async (
    q: string,
    images?: typeof uploadedImages,
    topNOverride?: number,
  ) => {
    setLoading(true);

    const imagePaths = await uploadAllImages(images);
    setThinking(imagePaths.length > 0 ? 5 : 1);

    let token = '';

    // const Cap = (await import(`@cap.js/widget`)).default;
    // const cap = new Cap({
    //   apiEndpoint: `${basePath}/share/v1/captcha/`,
    // });
    // try {
    //   const solution = await cap.solve();
    //   token = solution.token;
    // } catch (error) {
    //   setLoading(false);
    //   setThinking(4);
    //   message.error('验证失败');
    //   console.log(error, 'error---------');
    //   return;
    // }

    const topNForReq =
      topNOverride != null &&
      topNOverride >= 1 &&
      topNOverride <= 10 &&
      Number.isFinite(topNOverride)
        ? topNOverride
        : topN;
    const reqData = {
      message: q,
      image_paths: imagePaths,
      nonce: '',
      conversation_id: '',
      app_type: 1,
      captcha_token: token,
      top_n: topNForReq,
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
                  lastConversation.result_expend = lastResultExpendRef.current;
                  lastConversation.thinking_expend = false;
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
              /* ignore malformed chain_step */
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
    // @ts-ignore
    window.CAP_CUSTOM_WASM_URL =
      window.location.origin + `${basePath}/cap@0.0.6/cap_wasm.min.js`;
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

  const onSearch = (
    q: string,
    reset: boolean = false,
    preloadImages?: typeof uploadedImages,
    topNOverride?: number,
  ) => {
    const effectiveImages = preloadImages || uploadedImages;
    if (loading || (!q.trim() && effectiveImages.length === 0)) return;
    setShouldAutoScroll(true);
    const newConversation = reset
      ? []
      : conversation.some(item => item.source === 'history')
        ? []
        : [...conversation];
    lastResultExpendRef.current = false;
    newConversation.push({
      image_paths: effectiveImages.map(img => img.url),
      q,
      a: '',
      score: 0,
      message_id: '',
      update_time: '',
      source: 'chat',
      chunk_result: [],
      chain_steps: [],
      thinking_content: '',
      result_expend: true,
      thinking_expend: true,
      id: uuidv4(),
    });
    messageIdRef.current = '';
    setConversation(newConversation);
    setFullAnswer('');
    setTimeout(() => {
      chatAnswer(q, effectiveImages, topNOverride);
      setInput('');
      setUploadedImages([]);
    }, 0);
  };

  const handleSearchAbort = () => {
    sseClientRef.current?.unsubscribe();
    setLoading(false);
    setThinking(4);
  };

  const {
    mobile = false,
    kbDetail,
    qaModalOpen,
    chatSearchImages,
    setChatSearchImages,
  } = useStore();

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
      url: `${basePath}/share/v1/chat/message`,
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
    let preloadImages: typeof uploadedImages = [];
    if (chatSearchImages && chatSearchImages.length > 0) {
      preloadImages = chatSearchImages.map(file => ({
        id: Date.now().toString() + Math.random(),
        url: URL.createObjectURL(file),
        file,
      }));
      setUploadedImages(preloadImages);
      setChatSearchImages?.([]);
    }
    const searchQuery =
      sessionStorage.getItem('chat_search_query') || searchParams.get('ask');
    const storedTopNSS = sessionStorage.getItem('chat_search_top_n');
    let bootstrapTopN: number | undefined;
    if (storedTopNSS) {
      sessionStorage.removeItem('chat_search_top_n');
      const parsed = parseInt(storedTopNSS, 10);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 10) {
        bootstrapTopN = parsed;
        setTopN(parsed);
      }
    }
    if (searchQuery) {
      sessionStorage.removeItem('chat_search_query');
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('cid');
      window.history.replaceState(null, '', newSearchParams.toString());
      onSearch(
        searchQuery,
        true,
        preloadImages.length > 0 ? preloadImages : undefined,
        bootstrapTopN,
      );
    } else if (preloadImages.length > 0) {
      // 只有图片没有文本时，不自动搜索，只预加载图片到输入区
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
            chain_steps: [],
          };
          res.messages.forEach(message => {
            if (message.role === 'user') {
              current = {
                image_paths: message.image_paths || [],
                q: message.content,
                chunk_result: [],
                chain_steps: [],
              };
            } else if (message.role === 'assistant') {
              if (
                current.q ||
                (current.image_paths && current.image_paths.length > 0)
              ) {
                const { thinkingContent, answerContent } =
                  handleThinkingContent(message.content || '');
                current.a = answerContent;
                current.update_time = message.created_at;
                current.score = 0;
                current.message_id = '';
                current.thinking_content = thinkingContent;
                current.chain_steps = current.chain_steps || [];
                current.source = 'history';
                current.id = uuidv4();
                conversation.push(current as ConversationItem);
                current = {};
              }
            }
          });
          if (
            current.q ||
            (current.image_paths && current.image_paths.length > 0)
          ) {
            conversation.push({
              image_paths: current.image_paths || [],
              q: current.q || '',
              a: '',
              score: 0,
              update_time: '',
              message_id: '',
              source: 'history',
              chunk_result: [],
              chain_steps: [],
              thinking_content: '',
              id: uuidv4(),
              result_expend: true,
              thinking_expend: true,
            });
          }
        }
        setConversation(conversation);
        setShouldAutoScroll(false);
      });
    }
  }, []);

  useEffect(() => {
    if (!qaModalOpen) {
      conversation.forEach(item => {
        item.image_paths.forEach(image => {
          if (image.startsWith('blob:')) {
            URL.revokeObjectURL(image);
          }
        });
      });
    }
  }, [qaModalOpen, conversation]);

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
              sx={{
                fontSize: 32,
                color: workChrome ? workChrome.title : 'text.primary',
                fontWeight: 700,
              }}
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
                    color: workChrome ? workChrome.hotTitle : 'primary.main',
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
                <StyledHotSearchColumn
                  sx={
                    workChrome
                      ? { borderLeftColor: workChrome.hotColBorder }
                      : undefined
                  }
                >
                  {hotSearch
                    .filter((_, index) => index % 2 === 0)
                    .map((suggestion, index) => (
                      <StyledHotSearchColumnItem
                        key={index * 2}
                        onClick={() => onSuggestionClick(suggestion)}
                        sx={
                          workChrome
                            ? {
                                '&:hover': { color: workChrome.hotItemHover },
                              }
                            : undefined
                        }
                      >
                        • {suggestion}
                      </StyledHotSearchColumnItem>
                    ))}
                </StyledHotSearchColumn>

                {/* 右列 */}
                <StyledHotSearchColumn
                  sx={
                    workChrome
                      ? { borderLeftColor: workChrome.hotColBorder }
                      : undefined
                  }
                >
                  {hotSearch
                    .filter((_, index) => index % 2 === 1)
                    .map((suggestion, index) => (
                      <StyledHotSearchColumnItem
                        key={index * 2 + 1}
                        onClick={() => onSuggestionClick(suggestion)}
                        sx={
                          workChrome
                            ? {
                                '&:hover': { color: workChrome.hotItemHover },
                              }
                            : undefined
                        }
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
              {item.image_paths.length > 0 && (
                <ImagePreview.PreviewGroup>
                  <Stack direction='row' gap={1} sx={{ alignSelf: 'flex-end' }}>
                    {item.image_paths.map((url: string) => (
                      <ImagePreview
                        alt={url}
                        key={url}
                        src={getImagePath(url, basePath)}
                        width={100}
                        height={100}
                        style={{
                          borderRadius: '10px',
                          objectFit: 'cover',
                          cursor: 'pointer',
                        }}
                        referrerPolicy='no-referrer'
                      />
                    ))}
                  </Stack>
                </ImagePreview.PreviewGroup>
              )}

              {/* 用户问题气泡 - 右对齐 */}
              {item.q && (
                <StyledUserBubble sx={workChrome?.userBubble}>
                  {item.q}
                </StyledUserBubble>
              )}
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
                      <Stack gap={1.5} alignItems='stretch'>
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
                  <StyledChunkAccordion
                    expanded={item.result_expend}
                    onChange={(event, expanded) => {
                      setConversation(prev => {
                        const newConversation = [...prev];
                        if (index === conversation.length - 1) {
                          lastResultExpendRef.current = expanded;
                        }
                        newConversation[index].result_expend = expanded;
                        return newConversation;
                      });
                    }}
                  >
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
                      <Stack gap={1} alignItems='flex-start'>
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
                  <StyledThinkingAccordion
                    expanded={item.thinking_expend}
                    onChange={(event, expanded) => {
                      setConversation(prev => {
                        const newConversation = [...prev];
                        newConversation[index].thinking_expend = expanded;
                        return newConversation;
                      });
                    }}
                  >
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
                            <Typography
                              variant='body2'
                              sx={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'primary.main',
                                mb: 0.5,
                              }}
                            >
                              {meta.candidates >= 2
                                ? '工作模式 · 候选差异核对'
                                : '工作模式 · 信息完备性核对'}
                            </Typography>
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
                            <Stack direction='row' gap={0.75} flexWrap='wrap'>
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
                      {kbDetail?.settings?.disclaimer_settings?.content}
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
            '&:hover': workChrome
              ? {
                  boxShadow: `0px 1px 2px 0px ${alpha(theme.palette.text.primary, 0.06)}`,
                  ...workChrome.newConvHover,
                }
              : {
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
        <StyledInputWrapper sx={workChrome?.inputWrapper}>
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
            sx={
              workChrome
                ? {
                    backgroundColor: workChrome.textFieldBg,
                    '.MuiInputBase-root': {
                      backgroundColor: workChrome.textFieldBg,
                    },
                  }
                : undefined
            }
            onKeyDown={e => {
              const isComposing =
                e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229;
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                (input.length > 0 || uploadedImages.length > 0) &&
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
              <IconButton
                size='small'
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                sx={{
                  flexShrink: 0,
                }}
              >
                <IconTupian sx={{ fontSize: 20, color: 'text.secondary' }} />
              </IconButton>

              <Tooltip
                title='知识库检索返回的数量上限（1～10）'
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
                  disabled={input.length === 0 && uploadedImages.length === 0}
                  onClick={() => {
                    if (input.length > 0 || uploadedImages.length > 0) {
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
                        input.length > 0 || uploadedImages.length > 0
                          ? workChrome
                            ? workChrome.accent
                            : 'primary.main'
                          : 'text.disabled',
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
                sx={
                  workChrome
                    ? {
                        '&:hover': {
                          backgroundColor: workChrome.fuzzySuggestHoverBg,
                          color: workChrome.hotItemHover,
                        },
                      }
                    : undefined
                }
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
