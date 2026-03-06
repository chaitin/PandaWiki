'use client';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  alpha,
  Box,
  Button,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { IconSousuo } from '@panda-wiki/icons';
import React, { useEffect, useState } from 'react';
import NavBtns, { NavBtn } from './NavBtns';

// 检测平台类型
const isMac = () => /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const getKeyboardShortcut = () =>
  typeof navigator !== 'undefined' ? (isMac() ? '⌘K' : 'Ctrl+K') : '';

interface SearchSuggestion {
  id: string;
  title: string;
  description?: string;
  type?: 'recent' | 'suggestion' | 'trending';
}

interface HeaderProps {
  isDocPage?: boolean;
  mobile?: boolean;
  docWidth?: string;
  catalogWidth?: number;
  logo?: string;
  placeholder?: string;
  title?: string;
  showSearch?: boolean;
  onSearch?: (value?: string, type?: 'search' | 'chat') => void;
  onSearchSuggestions?: (query: string) => Promise<SearchSuggestion[]>;
  btns?: NavBtn[];
  children?: React.ReactNode;
  onQaClick?: () => void;
  homePath?: string;
}
const Header = React.memo(
  ({
    isDocPage = false,
    mobile = false,
    docWidth = 'full',
    homePath = '/',
    catalogWidth = 0,
    logo = '',
    placeholder = '搜索',
    title,
    showSearch = true,
    onSearch,
    onSearchSuggestions,
    btns,
    children,
    onQaClick,
  }: HeaderProps) => {
    const [ctrlKShortcut, setCtrlKShortcut] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const menuOpen = Boolean(anchorEl);

    useEffect(() => {
      setCtrlKShortcut(getKeyboardShortcut());
    }, []);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
      setAnchorEl(null);
    };

    // 全局键盘事件监听：⌘K (Mac) 或 Ctrl+K (Windows/Linux)
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Mac: Command + K, Windows/Linux: Ctrl + K
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault();
          onQaClick?.();
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, []);

    return (
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='center'
        sx={{
          transition: 'left 0.2s ease-in-out',
          position: 'sticky',
          zIndex: 101,
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          flexShrink: 0,
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
          ...(mobile && {
            left: 0,
          }),
          pl: mobile ? 3 : 5,
          pr: mobile ? 1.5 : 5,
        }}
      >
        <Stack
          direction='row'
          alignItems='center'
          gap={2}
          justifyContent='space-between'
          sx={{
            position: 'relative',
            width: '100%',
            minWidth: 0,
            // ...(isDocPage &&
            //   !mobile &&
            //   docWidth !== 'full' && {
            //     width: `calc(${DocWidth[docWidth as keyof typeof DocWidth].value}px + ${catalogWidth}px + 192px + 240px)`,
            //   }),
          }}
        >
          <Stack
            direction='row'
            alignItems='center'
            gap={1.5}
            sx={{ flex: 1, minWidth: 0 }}
          >
            <Link
              href={homePath}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                color: 'text.primary',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {logo && <img src={logo} alt='logo' height={36} />}
              <Box
                sx={{
                  fontSize: 20,
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {title}
              </Box>
            </Link>
          </Stack>
          {showSearch &&
            (mobile ? (
              // 移动端：显示搜索图标按钮
              <Stack
                direction='row'
                alignItems='center'
                justifyContent='flex-end'
              >
                <IconButton
                  size='small'
                  sx={{ width: 40, height: 40, color: 'text.primary' }}
                  onClick={() => onQaClick?.()}
                >
                  <IconSousuo sx={{ fontSize: 20 }} />
                </IconButton>
              </Stack>
            ) : (
              // 桌面端：显示搜索框
              <TextField
                placeholder={placeholder}
                fullWidth
                focused={false}
                onClick={() => onQaClick?.()}
                sx={{
                  flex: 1,
                  maxWidth: '500px',
                  minWidth: '220px',
                  bgcolor: 'background.paper3',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  '& .MuiInputBase-input': {
                    fontSize: 14,
                    lineHeight: '19.5px',
                    height: '19.5px',
                    fontFamily: 'Mono',
                    cursor: 'pointer',
                    py: '10.5px',
                    pl: 1,
                  },
                  '& .MuiOutlinedInput-root': {
                    pr: '12px',
                    pl: '12px',
                    '& fieldset': {
                      borderRadius: '10px',
                      borderColor: 'transparent',
                    },
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    },
                    '&:hover .ai-qa-button-wrapper': {
                      background:
                        'linear-gradient(135deg, #B27BFB 0%, #5A44FA 100%)',
                    },
                  },
                }}
                slotProps={{
                  input: {
                    readOnly: true,
                    startAdornment: (
                      <IconSousuo
                        sx={{
                          cursor: 'pointer',
                          color: 'text.tertiary',
                          fontSize: 20,
                          mr: 1,
                        }}
                      />
                    ),
                    endAdornment: (
                      <Stack
                        direction='row'
                        alignItems='center'
                        gap={1.5}
                        sx={{ flexShrink: 0 }}
                      >
                        <Box
                          sx={{
                            fontSize: 12,
                            color: 'text.tertiary',
                          }}
                        >
                          {ctrlKShortcut}
                        </Box>
                        <Box
                          className='ai-qa-button-wrapper'
                          sx={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            padding: '1px',
                            background:
                              'linear-gradient(135deg, #B27BFB 0%, #5A44FA 100%)',
                            transition: 'background 0.2s ease',
                          }}
                        >
                          <Button
                            variant='contained'
                            sx={{
                              textTransform: 'none',
                              minWidth: 'auto',
                              px: 1,
                              py: '2px',
                              fontSize: 12,
                              borderRadius: '6px',
                              backgroundColor: 'background.default',
                              color: 'text.primary',
                              boxShadow:
                                '0px 1px 2px 0px rgba(145,158,171,0.16)',
                            }}
                          >
                            智能问答
                          </Button>
                        </Box>
                      </Stack>
                    ),
                  },
                }}
              />
            ))}

          {!mobile && btns && btns.length > 0 && (
            <Stack
              direction='row'
              gap={2}
              alignItems='center'
              justifyContent='flex-end'
              sx={{ flex: 1 }}
            >
              {btns.slice(0, Math.min(2, btns.length)).map((item, index) => (
                <Link key={index} href={item.url} target={item.target}>
                  <Button
                    variant={item.variant}
                    startIcon={
                      item.showIcon && item.icon ? (
                        <img
                          src={item.icon}
                          alt='logo'
                          width={24}
                          height={24}
                        />
                      ) : null
                    }
                    sx={theme => ({
                      px: 3.5,
                      whiteSpace: 'nowrap',
                      textTransform: 'none',
                      boxSizing: 'border-box',
                      height: 40,
                      ...(item.variant === 'outlined' && {
                        borderWidth: 2,
                      }),
                    })}
                  >
                    <Box sx={{ lineHeight: '24px', fontSize: 16 }}>
                      {item.text}
                    </Box>
                  </Button>
                </Link>
              ))}
              {btns.length > 2 && (
                <>
                  <IconButton
                    onClick={handleMenuClick}
                    sx={theme => ({
                      width: 40,
                      height: 40,
                      '&:hover': {
                        color: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                      },
                    })}
                  >
                    <MoreVertIcon />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={handleMenuClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 1,
                          minWidth: 180,
                          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                        },
                      },
                    }}
                  >
                    {btns.slice(2).map((item, index) => (
                      <MenuItem
                        key={index + 2}
                        onClick={handleMenuClose}
                        sx={{
                          py: 1.5,
                          px: 2,
                        }}
                      >
                        <Link
                          href={item.url}
                          target={item.target}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            textDecoration: 'none',
                            color: 'text.primary',
                            width: '100%',
                          }}
                        >
                          {item.showIcon && item.icon && (
                            <img
                              src={item.icon}
                              alt='logo'
                              width={20}
                              height={20}
                            />
                          )}
                          <Box sx={{ fontSize: 16 }}>{item.text}</Box>
                        </Link>
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </Stack>
          )}
          {mobile && (
            <NavBtns
              logo={logo}
              title={title}
              btns={btns}
              homePath={homePath}
            />
          )}
        </Stack>
        {children}
      </Stack>
    );
  },
);

export default Header;
