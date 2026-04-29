'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTextAnimation } from '../hooks/useGsapAnimation';
import {
  ButtonProps,
  styled,
  TextField,
  Button,
  Stack,
  Box,
  alpha,
  lighten,
  IconButton,
  SvgIcon,
  FormControl,
  MenuItem,
  Select,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { StyledTopicBox } from '../component/styledCommon';

const StyledBanner = styled('div')(({ theme }) => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.03),
  backgroundImage: `radial-gradient(${alpha(theme.palette.primary.main, 0.08)} 2px, transparent 1px)`,
  backgroundSize: '36px 36px', // dot spacing
  backgroundPosition: '0 0',
  backgroundRepeat: 'repeat',
  marginTop: theme.spacing(-10),
}));

const StyledTitle = styled('h1')(({ theme }) => ({
  fontSize: 60,
  fontWeight: 700,
  wordBreak: 'break-all',
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(3),
  [theme.breakpoints.down('md')]: {
    fontSize: 50,
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: 40,
  },
}));

const StyledSubTitle = styled('h2')(({ theme }) => ({
  fontWeight: 400,
  marginBottom: theme.spacing(5),
  color: theme.palette.text.primary,
}));

const StyledSearchBox = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  padding: theme.spacing(2),
  boxShadow: `0 2px 10px 0px ${alpha(theme.palette.text.primary, 0.1)}`,
  border: `1px solid transparent`,
  borderRadius: '10px',
  backgroundColor: theme.palette.background.default,
  '&:hover': {
    borderColor: alpha(theme.palette.primary.main, 0.4),
  },
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '.MuiInputBase-root': {
    padding: 0,
  },
  fieldset: {
    border: 'none',
  },
  '& input::placeholder, & textarea::placeholder': {
    color: alpha(theme.palette.text.primary, 0.5),
    opacity: 1,
  },
}));

// 闪烁光标样式
const blinkAnimation = `
  @keyframes blink {
    0%, 49% {
      opacity: 1;
    }
    50%, 100% {
      opacity: 0;
    }
  }
`;

const StyledCursor = styled('span')(({ theme }) => ({
  display: 'inline-block',
  width: '1px',
  height: '18px',
  backgroundColor: alpha(theme.palette.text.primary, 1),
  marginLeft: '2px',
  animation: 'blink 1s infinite',
  flexShrink: 0,
}));

const StyledHotItem = styled(Box)(({ theme }) => ({
  color: theme.palette.text.primary,
  padding: theme.spacing(0.75, 2),
  borderRadius: '16px',
  border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
  fontSize: 12,
  cursor: 'pointer',
  transition: 'all 0.2s',
  '&:hover': {
    borderColor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
  },
}));

interface SearchSuggestion {
  id: string;
  title: string;
  description?: string;
  type?: 'recent' | 'suggestion' | 'trending';
}

const ImageIcon = (props: any) => (
  <SvgIcon viewBox='0 0 1228 1024' {...props}>
    <path d='M999.33333332 62a99.99 99.99 0 0 1 99.99 99.99V862.1A99.99 99.99 0 0 1 999.33333332 962H199.32333332A99.99 99.99 0 0 1 99.33333332 862.01V161.9A99.99 99.99 0 0 1 199.32333332 62H999.33333332zM745.98333332 567.71l-5.58 2.97L279.24333332 862.1h695.07c12.06 0 22.5-8.64 24.66-20.52l0.36-4.5V736.82L798.63333332 574.1a50.04 50.04 0 0 0-52.65-6.57zM974.31333332 161.9H224.43333332a25.02 25.02 0 0 0-25.02 25.02v607.23L687.03333332 486.17c51.3-32.4 117-30.69 166.5 4.14l8.1 6.12L999.33333332 608.03V187.1a25.02 25.02 0 0 0-20.52-24.57l-4.5-0.45zM411.81333332 287a87.48 87.48 0 1 1 0 174.96 87.48 87.48 0 0 1 0-174.96z' />
  </SvgIcon>
);

interface UploadedImage {
  id: string;
  url: string;
  file: File;
}

const BANNER_TOP_N_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

interface BannerProps {
  title: {
    text: string;
    fontSize: string;
    color: string;
  };
  subtitle: {
    text: string;
    fontSize: string;
    color: string;
  };
  bg_url?: string;
  search: {
    placeholder: string;
    hot: string[];
  };
  btns: {
    type: ButtonProps['variant'];
    text: string;
    href: string;
  }[];
  onSearch?: (
    value: string,
    type?: 'search' | 'chat',
    images?: File[],
    topN?: number,
  ) => void;
  onSearchSuggestions?: (query: string) => Promise<SearchSuggestion[]>;
  basePath?: string;
}

const Banner = React.memo(
  ({
    title,
    subtitle,
    bg_url,
    search,
    btns = [],
    onSearch,
    onSearchSuggestions,
    basePath = '',
  }: BannerProps) => {
    const [searchText, setSearchText] = useState('');
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [anchorElWidth, setAnchorElWidth] = useState<number | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const [typedText, setTypedText] = useState('');
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [topN, setTopN] = useState(10);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const typewriterTimer = useRef<NodeJS.Timeout | null>(null);

    const handleImageSelect = (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const maxImages = 3;
      const remainingSlots = maxImages - uploadedImages.length;
      if (remainingSlots <= 0) return;

      const filesToAdd = Array.from(files).slice(0, remainingSlots);
      const newImages: UploadedImage[] = [];

      for (const file of filesToAdd) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 10 * 1024 * 1024) continue;
        newImages.push({
          id: Date.now().toString() + Math.random(),
          url: URL.createObjectURL(file),
          file,
        });
      }

      setUploadedImages(prev => [...prev, ...newImages]);
    };

    const handleRemoveImage = (id: string) => {
      setUploadedImages(prev => {
        const img = prev.find(i => i.id === id);
        if (img?.url.startsWith('blob:')) URL.revokeObjectURL(img.url);
        return prev.filter(i => i.id !== id);
      });
    };

    const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        const dt = new DataTransfer();
        imageFiles.forEach(f => dt.items.add(f));
        handleImageSelect(dt.files);
      }
    };

    useEffect(() => {
      return () => {
        uploadedImages.forEach(img => {
          if (img.url.startsWith('blob:')) URL.revokeObjectURL(img.url);
        });
      };
    }, []);

    // 添加文字动画效果
    const titleRef = useTextAnimation(0, 0.1);
    const subtitleRef = useTextAnimation(0.2, 0.1);

    // 打字机效果
    useEffect(() => {
      if (isFocused || !search.hot || search.hot.length === 0) {
        return;
      }

      let currentIndex = 0;
      let currentCharIndex = 0;
      let isDeleting = false;
      let isPaused = false;

      const typeWriter = () => {
        const currentWord = search.hot[currentIndex];

        if (isPaused) {
          typewriterTimer.current = setTimeout(() => {
            isPaused = false;
            typeWriter();
          }, 1000); // 暂停1秒
          return;
        }

        if (!isDeleting) {
          // 打字阶段
          if (currentCharIndex < currentWord.length) {
            setTypedText(currentWord.substring(0, currentCharIndex + 1));
            currentCharIndex++;
            typewriterTimer.current = setTimeout(typeWriter, 100); // 打字速度（调慢）
          } else {
            // 打完了，暂停后开始删除
            isPaused = true;
            isDeleting = true;
            typeWriter();
          }
        } else {
          // 删除阶段
          if (currentCharIndex > 0) {
            currentCharIndex--;
            setTypedText(currentWord.substring(0, currentCharIndex));
            typewriterTimer.current = setTimeout(typeWriter, 80); // 删除速度（调慢）
          } else {
            // 删完了，切换到下一个词
            isDeleting = false;
            currentIndex = (currentIndex + 1) % search.hot.length;
            typewriterTimer.current = setTimeout(typeWriter, 200); // 切换词之间的延迟
          }
        }
      };

      typeWriter();

      return () => {
        if (typewriterTimer.current) {
          clearTimeout(typewriterTimer.current);
        }
      };
    }, [isFocused, search.hot]);

    // 防抖搜索
    const debouncedSearch = useCallback(
      (query: string) => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(async () => {
          if (query.trim() && onSearchSuggestions) {
            setIsLoading(true);
            try {
              const results = await onSearchSuggestions(query);
              setSuggestions(results);
            } catch (error) {
              console.error('搜索建议获取失败:', error);
              setSuggestions([]);
            } finally {
              setIsLoading(false);
            }
          } else {
            setSuggestions([]);
          }
        }, 300);
      },
      [onSearchSuggestions],
    );

    // 处理输入变化
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchText(value);
      setSelectedIndex(-1);

      if (value.trim()) {
        debouncedSearch(value);
        if (onSearch) {
          setAnchorEl(e.currentTarget.parentElement);
          setAnchorElWidth(e.currentTarget.parentElement?.offsetWidth || 0);
        }
      } else {
        setSuggestions([]);
        setAnchorEl(null);
      }
    };

    const doSearch = (type: 'search' | 'chat' = 'chat') => {
      if (!searchText.trim() && uploadedImages.length === 0) return;
      const files = uploadedImages.map(img => img.file);
      onSearch?.(searchText, type, files.length > 0 ? files : undefined, topN);
      setSearchText('');
      uploadedImages.forEach(img => {
        if (img.url.startsWith('blob:')) URL.revokeObjectURL(img.url);
      });
      setUploadedImages([]);
      setAnchorEl(null);
      setSelectedIndex(-1);
    };

    // 处理键盘事件
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        doSearch('chat');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Escape') {
        setAnchorEl(null);
        setSelectedIndex(-1);
      }
    };

    // 处理输入框聚焦
    const handleInputFocus = (e: React.FocusEvent) => {
      setIsFocused(true);
      setTypedText(''); // 清空打字机文本
      if (searchText.trim()) {
        setAnchorEl(e.currentTarget.parentElement);
        setAnchorElWidth(e.currentTarget.parentElement?.offsetWidth || 0);
      }
    };

    // 处理输入框失焦
    const handleInputBlur = () => {
      setIsFocused(false);
    };

    // 清理定时器
    useEffect(() => {
      return () => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
      };
    }, []);

    return (
      <StyledBanner
        sx={{
          ...(bg_url
            ? {
                backgroundImage: `url(${bg_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }
            : {}),
        }}
      >
        <StyledTopicBox
          sx={{
            alignItems: 'flex-start',
            gap: 0,
            py: { xs: 8, md: '200px' },
            pt: { xs: 16 },
          }}
        >
          <StyledTitle ref={titleRef}>{title.text}</StyledTitle>
          {/* {subtitle.text && ( */}
          <StyledSubTitle
            ref={subtitleRef}
            sx={{
              fontSize: `${subtitle.fontSize || 16}px`,
            }}
          >
            {subtitle.text}
          </StyledSubTitle>
          {/* )} */}

          <StyledSearchBox>
            {uploadedImages.length > 0 && (
              <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mb: 1 }}>
                {uploadedImages.map(image => (
                  <Box
                    key={image.id}
                    sx={{
                      position: 'relative',
                      width: 56,
                      height: 56,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: theme =>
                        `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                    }}
                  >
                    <img
                      src={image.url}
                      alt=''
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <IconButton
                      size='small'
                      onClick={() => handleRemoveImage(image.id)}
                      sx={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 18,
                        height: 18,
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: '#fff',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
            <Box sx={{ position: 'relative' }}>
              <style>{blinkAnimation}</style>
              {!isFocused &&
                !searchText &&
                typedText &&
                uploadedImages.length === 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      pointerEvents: 'none',
                      color: theme => alpha(theme.palette.text.primary, 0.85),
                      fontSize: '16px',
                      lineHeight: 1.5,
                      display: 'inline-flex',
                      alignItems: 'center',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    <span>{typedText}</span>
                    <StyledCursor />
                  </Box>
                )}
              <StyledTextField
                fullWidth
                placeholder={isFocused || searchText ? search.placeholder : ''}
                value={searchText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onPaste={handlePaste}
                multiline
                rows={3}
              />
            </Box>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              multiple
              style={{ display: 'none' }}
              onChange={e => {
                handleImageSelect(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
              <Stack direction='row' gap='8px 16px' flexWrap='wrap'>
                {search.hot?.map(hot => (
                  <StyledHotItem
                    key={hot}
                    onClick={() => onSearch?.(hot, 'chat', undefined, topN)}
                  >
                    {hot}
                  </StyledHotItem>
                ))}
              </Stack>
              <Stack
                direction='row'
                gap={1}
                sx={{ ml: 'auto' }}
                alignItems='center'
              >
                <IconButton
                  size='small'
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ flexShrink: 0 }}
                >
                  <ImageIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                </IconButton>
                <Tooltip
                  title='知识库检索返回的片段数量上限（1～10）'
                  placement='top'
                >
                  <FormControl
                    size='small'
                    sx={{ minWidth: 76, flexShrink: 0 }}
                  >
                    <Select
                      value={topN}
                      onChange={e => setTopN(Number(e.target.value))}
                      sx={{ fontSize: 12, height: 32 }}
                    >
                      {BANNER_TOP_N_OPTIONS.map(n => (
                        <MenuItem key={n} value={n} sx={{ fontSize: 12 }}>
                          Top {n}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Tooltip>
                <Button
                  variant='contained'
                  size='small'
                  sx={{
                    fontSize: 12,
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                  onClick={() => doSearch('chat')}
                >
                  AI 智能问答
                </Button>
              </Stack>
            </Stack>
          </StyledSearchBox>

          {btns.length > 0 && (
            <Stack
              direction='row'
              gap={{
                xs: '16px 24px',
                md: '16px 40px',
              }}
              sx={{ mt: 5 }}
              flexWrap='wrap'
            >
              {btns.map(btn => (
                <Button
                  key={btn.text}
                  variant={btn.type}
                  href={btn.href}
                  target='_blank'
                  size='large'
                  color='primary'
                  sx={theme => ({
                    ...(btn.type === 'outlined' && {
                      borderWidth: 2,
                      bgcolor: theme.palette.background.default,
                      borderColor: alpha(theme.palette.primary.main, 0.8),
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                      },
                    }),
                    lineHeight: 1.5,
                    fontSize: {
                      xs: 14,
                      md: 18,
                    },
                    px: {
                      xs: 3,
                      md: '69px',
                    },
                    py: {
                      xs: 1,
                      md: '12px',
                    },
                  })}
                >
                  {btn.text}
                </Button>
              ))}
            </Stack>
          )}
        </StyledTopicBox>
      </StyledBanner>
    );
  },
);

export default Banner;
