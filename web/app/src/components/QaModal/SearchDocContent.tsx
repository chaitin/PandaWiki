'use client';
import React, { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  InputAdornment,
  Typography,
  Stack,
  CircularProgress,
  alpha,
  Skeleton,
  styled,
} from '@mui/material';
import Logo from '@/assets/images/logo.png';
import noDocImage from '@/assets/images/no-doc.png';
import Image from 'next/image';
import { IconJinsousuo, IconFasong, IconMianbaoxie } from '@panda-wiki/icons';
import { postShareV1ChatSearch } from '@/request/ShareChatSearch';
import { DomainNodeContentChunkSSE } from '@/request/types';
import { message } from '@ctzhian/ui';
import { IconWenjian } from '@panda-wiki/icons';
import { useStore } from '@/provider';

const StyledSearchResultItem = styled(Stack)(({ theme }) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    borderBottom: '1px dashed',
    borderColor: alpha(theme.palette.text.primary, 0.1),
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    borderBottom: '1px dashed',
    borderColor: alpha(theme.palette.text.primary, 0.1),
  },
  padding: theme.spacing(2),
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: alpha(theme.palette.text.primary, 0.02),
    '.hover-primary': {
      color: 'primary.main',
    },
  },
}));

const SearchDocSkeleton = () => {
  return (
    <StyledSearchResultItem>
      <Stack gap={1}>
        <Skeleton variant='rounded' height={16} width={200} />
        <Skeleton variant='rounded' height={22} width={400} />
        <Skeleton variant='rounded' height={16} width={500} />
      </Stack>
    </StyledSearchResultItem>
  );
};
interface SearchDocContentProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  placeholder: string;
}

const SearchDocContent: React.FC<SearchDocContentProps> = ({
  inputRef,
  placeholder,
}) => {
  const { kbDetail } = useStore();
  // 模糊搜索相关状态
  const [fuzzySuggestions, setFuzzySuggestions] = useState<string[]>([]);
  const [showFuzzySuggestions, setShowFuzzySuggestions] = useState(false);
  const [input, setInput] = useState('');
  const [hasSearch, setHasSearch] = useState(false);
  // 搜索结果相关状态
  const [searchResults, setSearchResults] = useState<
    DomainNodeContentChunkSSE[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // 执行搜索
  const handleSearch = async () => {
    if (isSearching) return;
    if (!input.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setShowFuzzySuggestions(false);
    setFuzzySuggestions([]);

    let token = '';
    const Cap = (await import('@cap.js/widget')).default;
    const cap = new Cap({
      apiEndpoint: '/share/v1/captcha/',
    });
    try {
      const solution = await cap.solve();
      token = solution.token;
    } catch (error) {
      message.error('验证失败');
      console.log(error, 'error---------');
      setIsSearching(false);
      return;
    }
    postShareV1ChatSearch({ message: input, captcha_token: token })
      .then(res => {
        setSearchResults(res.node_result || []);
        setHasSearch(true);
      })
      .finally(() => {
        setIsSearching(false);
      });
  };

  // 处理搜索结果点击
  const handleSearchResultClick = (result: DomainNodeContentChunkSSE) => {
    window.open(`/node/${result.node_id}`, '_blank');
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
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

  return (
    <Box>
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='center'
        gap={2}
        sx={{ mb: 3, mt: 1 }}
      >
        <Image
          src={kbDetail?.settings?.icon || Logo.src}
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
      </Stack>
      {/* 搜索输入框 */}
      <TextField
        ref={inputRef}
        value={input}
        placeholder={placeholder}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        fullWidth
        autoFocus
        sx={theme => ({
          boxShadow: `0px 20px 40px 0px ${alpha(theme.palette.text.primary, 0.06)}`,
          borderRadius: 2,
          '& .MuiInputBase-root': {
            fontSize: 16,
            backgroundColor: theme.palette.background.default,
            '& fieldset': {
              borderColor: alpha(theme.palette.text.primary, 0.1),
            },
            '&:hover fieldset': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused fieldset': {
              borderColor: `${theme.palette.primary.main} !important`,
              borderWidth: 1,
            },
          },
          '& .MuiInputBase-input': {
            py: 1.5,
          },
        })}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <IconJinsousuo sx={{ fontSize: 20, color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position='end'>
                <IconButton
                  size='small'
                  onClick={handleSearch}
                  disabled={!input.trim() || isSearching}
                  sx={{
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'primary.lighter' },
                    '&.Mui-disabled': { color: 'action.disabled' },
                  }}
                >
                  {isSearching ? (
                    <CircularProgress size={20} />
                  ) : (
                    <IconFasong
                      sx={{
                        fontSize: 22,
                      }}
                    />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      {/* 模糊搜索建议列表 */}
      {showFuzzySuggestions && fuzzySuggestions.length > 0 && (
        <Stack
          sx={{
            mt: 1,
            position: 'relative',
            zIndex: 1000,
          }}
          gap={0.5}
        >
          {fuzzySuggestions.map((suggestion, index) => (
            <Box
              key={index}
              onClick={() => handleFuzzySuggestionClick(suggestion)}
              sx={{
                py: 1,
                px: 2,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                bgcolor: 'transparent',
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                display: 'flex',
                alignItems: 'center',
                width: 'auto',
                fontSize: 14,
                fontWeight: 400,
              }}
            >
              {highlightMatch(suggestion, input)}
            </Box>
          ))}
        </Stack>
      )}
      {/* 搜索结果列表 */}
      {searchResults.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {/* 搜索结果统计 */}
          <Typography
            variant='body2'
            sx={{
              color: 'text.tertiary',
              mb: 2,
              fontSize: 14,
            }}
          >
            共找到 {searchResults.length} 个结果
          </Typography>

          {/* 搜索结果列表 */}
          <Stack sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 334px)' }}>
            {searchResults.map((result, index) => (
              <StyledSearchResultItem
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                key={result.node_id}
                gap={2}
                onClick={() => handleSearchResultClick(result)}
              >
                <Stack sx={{ flex: 1, width: 0 }} gap={0.5}>
                  {/* 路径 */}
                  <Typography
                    variant='caption'
                    sx={{
                      color: 'text.tertiary',
                      fontSize: 12,
                      display: 'block',
                    }}
                  >
                    {(result.node_path_names || []).length > 0
                      ? result.node_path_names?.join(' > ')
                      : result.name}
                  </Typography>

                  {/* 标题和图标 */}

                  <Typography
                    variant='h6'
                    className='hover-primary'
                    sx={{
                      gap: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'text.primary',
                      flex: 1,
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {result.emoji || <IconWenjian />} {result.name}
                  </Typography>

                  {/* 描述 */}
                  <Typography
                    variant='body2'
                    sx={{
                      color: 'text.tertiary',
                      fontSize: 12,
                      lineHeight: 1.5,
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {result.summary || '暂无摘要'}
                  </Typography>
                </Stack>
                <IconMianbaoxie sx={{ fontSize: 12 }} />
              </StyledSearchResultItem>
            ))}
          </Stack>
        </Box>
      )}

      {searchResults.length === 0 && !isSearching && hasSearch && (
        <Box sx={{ my: 5, textAlign: 'center' }}>
          <Image src={noDocImage} alt='暂无结果' width={250} />
          <Typography variant='body2' sx={{ color: 'text.tertiary' }}>
            暂无相关结果
          </Typography>
        </Box>
      )}

      {/* 搜索中状态 */}
      {isSearching && (
        <Stack sx={{ mt: 2 }}>
          {[...Array(3)].map((_, index) => (
            <SearchDocSkeleton key={index} />
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default SearchDocContent;
