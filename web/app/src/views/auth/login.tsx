'use client';

import {
  postShareProV1AuthCas,
  postShareProV1AuthDingtalk,
  postShareProV1AuthFeishu,
  postShareProV1AuthLdap,
  postShareProV1AuthOauth,
  postShareProV1AuthWecom,
} from '@/request/pro/ShareAuth';
import {
  getShareV1AuthGet,
  postShareV1AuthLoginSimple,
} from '@/request/ShareAuth';
import { getShareV1NodeList } from '@/request/ShareNode';
import { clearCookie } from '@/utils/cookie';

import Logo from '@/assets/images/logo.png';
import { FooterProvider } from '@/components/footer';
import {
  IconCAS,
  IconDingDing,
  IconFeishu,
  IconLDAP,
  IconLock,
  IconOAuth,
  IconPassword,
  IconQiyeweixin,
  IconUser,
} from '@/components/icons';
import { useStore } from '@/provider';
import { ConstsSourceType, DomainAuthType } from '@/request/types';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material';
import { message } from 'ct-mui';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Login() {
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [authType, setAuthType] = useState<DomainAuthType>();
  const [sourceType, setSourceType] = useState<ConstsSourceType>();
  const router = useRouter();
  const { kbDetail, themeMode, mobile = false, setNodeList } = useStore();

  const handleLogin = async () => {
    if (!password.trim()) {
      message.error('请输入访问口令');
      return;
    }
    setLoading(true);
    try {
      clearCookie();
      postShareV1AuthLoginSimple({
        password,
      }).then(() => {
        getShareV1NodeList().then(res => {
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
      if (
        authType === DomainAuthType.AuthTypeEnterprise &&
        sourceType === ConstsSourceType.SourceTypeLDAP
      ) {
        // For LDAP auth, check if both username and password are filled before submitting
        if (username.trim() && password.trim()) {
          handleLDAPLogin();
        }
      } else {
        handleLogin();
      }
    }
  };

  const handleDingTalkLogin = () => {
    clearCookie();
    postShareProV1AuthDingtalk({
      redirect_url: window.location.origin,
    }).then(res => {
      window.location.href = res.url || '/';
    });
  };

  const handleFeishuLogin = () => {
    clearCookie();
    postShareProV1AuthFeishu({
      redirect_url: window.location.origin,
    }).then(res => {
      window.location.href = res.url || '/';
    });
  };

  const handleQiyeweixinLogin = () => {
    clearCookie();
    postShareProV1AuthWecom({
      redirect_url: window.location.origin,
    }).then(res => {
      window.location.href = res.url || '/';
    });
  };

  const handleOAuthLogin = () => {
    clearCookie();
    postShareProV1AuthOauth({
      redirect_url: window.location.origin,
    }).then(res => {
      window.location.href = res.url || '/';
    });
  };

  const handleCASLogin = () => {
    postShareProV1AuthCas({
      redirect_url: window.location.origin,
    }).then(res => {
      window.location.href = res.url || '/';
    });
  };

  const handleLDAPLogin = () => {
    setLoading(true);
    try {
      postShareProV1AuthLdap({
        username,
        password,
      }).then(() => {
        getShareV1NodeList().then(res => {
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

  useEffect(() => {
    getShareV1AuthGet({}).then(res => {
      setAuthType(res?.auth_type);
      setSourceType(res?.source_type);
      if (res?.auth_type === DomainAuthType.AuthTypeNull) {
        router.push('/');
      }
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
                <TextField
                  fullWidth
                  type='password'
                  value={password}
                  autoFocus
                  onChange={e => setPassword(e.target.value)}
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
                {sourceType === ConstsSourceType.SourceTypeDingTalk && (
                  <IconButton onClick={handleDingTalkLogin}>
                    <IconDingDing sx={{ fontSize: 40 }}></IconDingDing>
                  </IconButton>
                )}
                {sourceType === ConstsSourceType.SourceTypeFeishu && (
                  <IconButton onClick={handleFeishuLogin}>
                    <IconFeishu sx={{ fontSize: 40 }}></IconFeishu>
                  </IconButton>
                )}
                {sourceType === ConstsSourceType.SourceTypeWeCom && (
                  <IconButton onClick={handleQiyeweixinLogin}>
                    <IconQiyeweixin sx={{ fontSize: 28 }}></IconQiyeweixin>
                  </IconButton>
                )}
                {sourceType === ConstsSourceType.SourceTypeOAuth && (
                  <IconButton onClick={handleOAuthLogin}>
                    <IconOAuth sx={{ fontSize: 40 }}></IconOAuth>
                  </IconButton>
                )}

                {sourceType === ConstsSourceType.SourceTypeCAS && (
                  <IconButton onClick={handleCASLogin}>
                    <IconCAS sx={{ fontSize: 40 }}></IconCAS>
                  </IconButton>
                )}

                {sourceType === ConstsSourceType.SourceTypeLDAP && (
                  <Stack spacing={2} width='100%'>
                    {(() => {
                      const textFieldSx = {
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
                      };

                      return (
                        <>
                          <TextField
                            fullWidth
                            type='text'
                            value={username}
                            autoFocus
                            onChange={e => setUsername(e.target.value)}
                            placeholder='用户名'
                            disabled={loading}
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position='start'>
                                    <IconUser
                                      sx={{
                                        fontSize: 16,
                                        width: 24,
                                        height: 16,
                                      }}
                                    />
                                  </InputAdornment>
                                ),
                              },
                            }}
                            sx={textFieldSx}
                          />
                          <TextField
                            fullWidth
                            type='password'
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder='密码'
                            disabled={loading}
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position='start'>
                                    <IconPassword
                                      sx={{
                                        fontSize: 16,
                                        width: 24,
                                        height: 16,
                                      }}
                                    />
                                  </InputAdornment>
                                ),
                              },
                            }}
                            sx={textFieldSx}
                          />
                          <Button
                            fullWidth
                            variant='contained'
                            onClick={handleLDAPLogin}
                            sx={{
                              mt: 2,
                              height: '50px',
                              fontSize: 16,
                              borderRadius: '10px',
                              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                            }}
                            startIcon={
                              <IconLDAP
                                sx={{
                                  fontSize: 16,
                                  width: 24,
                                  height: 16,
                                  color:
                                    loading ||
                                      !username.trim() ||
                                      !password.trim()
                                      ? ''
                                      : '#e73f3f',
                                }}
                              />
                            }
                            disabled={
                              loading || !username.trim() || !password.trim()
                            }
                          >
                            {loading ? '验证中...' : '登录'}
                          </Button>
                        </>
                      );
                    })()}
                  </Stack>
                )}
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
        <FooterProvider showBrand={false} />
      </Box>
    </>
  );
}