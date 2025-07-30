'use client';

import { postShareProV1AuthDingtalk } from '@/request/pro/ShareAuth';
import {
  getShareV1AuthGet,
  postShareV1AuthLoginSimple,
} from '@/request/ShareAuth';
import { getShareV1NodeList } from '@/request/ShareNode';

import { DomainAuthType } from '@/request/types';
import Logo from '@/assets/images/logo.png';
import Footer from '@/components/footer';
import { IconLock } from '@/components/icons';
import { useStore } from '@/provider';
import {
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  IconButton,
} from '@mui/material';
import { message } from 'ct-mui';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconDingDing } from '@/components/icons';

export default function Login() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authType, setAuthType] = useState<DomainAuthType>();
  const router = useRouter();
  const {
    kbDetail,
    kb_id,
    themeMode,
    mobile = false,
    setNodeList,
  } = useStore();

  const handleLogin = async () => {
    if (!password.trim()) {
      message.error('请输入访问口令');
      return;
    }
    if (!kb_id) {
      message.error('知识库配置错误');
      return;
    }
    setLoading(true);
    try {
      postShareV1AuthLoginSimple({
        password,
      }).then(() => {
        getShareV1NodeList().then((res) => {
          setNodeList?.((res as any) ?? []);
          message.success('认证成功');
          router.push('/');
        });
      });
    } catch (error) {
      message.error('认证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleDingTalkLogin = () => {
    postShareProV1AuthDingtalk({
      redirect_url: window.location.origin,
    }).then((res) => {
      window.location.href = res.url || '/';
    });
  };

  useEffect(() => {
    getShareV1AuthGet({}).then((res) => {
      setAuthType(res?.auth_type);
    });
  }, []);

  return (
    <>
      <Box
        sx={{
          minHeight: mobile ? `calc(100vh - 120px)` : `calc(100vh - 40px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor:
            themeMode === 'dark' ? 'background.default' : 'background.paper',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 400,
            p: 4,
            backdropFilter: 'blur(2px)',
            bgcolor:
              themeMode === 'dark' ? 'background.paper' : 'background.default',
            borderRadius: '10px',
            ...(mobile && {
              m: 3,
            }),
          }}
        >
          <Stack alignItems='center'>
            <Stack alignItems='center' gap={1} sx={{ mb: 5 }}>
              {kbDetail?.settings?.icon ? (
                <img
                  src={kbDetail?.settings?.icon}
                  alt='logo'
                  width={40}
                  height={40}
                />
              ) : (
                <Image src={Logo.src} width={40} height={40} alt='logo' />
              )}
              <Box
                sx={{ fontSize: 28, lineHeight: '36px', fontWeight: 'bold' }}
              >
                {kbDetail?.settings?.title}
              </Box>
            </Stack>
            {authType === DomainAuthType.AuthTypeSimple && (
              <>
                {' '}
                <TextField
                  fullWidth
                  type='password'
                  value={password}
                  autoFocus
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='请输入访问口令'
                  disabled={loading}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <IconLock
                            sx={{ fontSize: 16, width: 24, height: 16 }}
                          />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    borderRadius: '10px',
                    overflow: 'hidden',
                    '& .MuiInputBase-input': {
                      p: 2,
                      lineHeight: '24px',
                      height: '24px',
                      fontFamily: 'Mono',
                    },
                    '& .MuiOutlinedInput-root': {
                      pr: '18px',
                      bgcolor: 'background.paper',
                      '& fieldset': {
                        borderRadius: '10px',
                        borderColor: 'divider',
                        px: 2,
                      },
                    },
                  }}
                />
                <Button
                  fullWidth
                  variant='contained'
                  onClick={handleLogin}
                  sx={{ mt: 5, height: '50px', fontSize: 16 }}
                  disabled={loading || !password.trim()}
                >
                  {loading ? '验证中...' : '认证访问'}
                </Button>
              </>
            )}

            {authType === DomainAuthType.AuthTypeEnterprise && (
              <>
                <IconButton onClick={handleDingTalkLogin}>
                  <IconDingDing sx={{ fontSize: 40 }}></IconDingDing>
                </IconButton>
              </>
            )}

            <Box
              sx={{
                textAlign: 'center',
                color: 'text.disabled',
                fontSize: 14,
                lineHeight: '20px',
                mt: 2,
              }}
            >
              需要认证以后才能访问
            </Box>
          </Stack>
        </Box>
      </Box>
      <Box
        sx={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <Footer showBrand={false} />
      </Box>
    </>
  );
}
