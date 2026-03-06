'use client';

import {
  postShareProV1AuthCas,
  postShareProV1AuthDingtalk,
  postShareProV1AuthFeishu,
  postShareProV1AuthGithub,
  postShareProV1AuthLdap,
  postShareProV1AuthOauth,
  postShareProV1AuthWecom,
} from '@/request/pro/ShareAuth';
import { postShareV1AuthGithub } from '@/request/ShareAuth';
import {
  getShareV1AuthGet,
  postShareV1AuthLoginSimple,
} from '@/request/ShareAuth';
import { getShareV1NodeList } from '@/request/ShareNode';
import { parseNodeListResponse } from '@/utils/tree';
import { clearCookie } from '@/utils/cookie';

import {
  IconKoulingrenzheng,
  IconLDAP,
  IconMima,
  IconZhanghao,
  IconFeishu,
} from '@panda-wiki/icons';

import Logo from '@/assets/images/logo.png';
import { FooterProvider } from '@/components/footer';
import { IconDingDing, IconQiyeweixin } from '@/components/icons';
import { IconGitHub1 } from '@panda-wiki/icons';
import { useStore } from '@/provider';
import {
  ConstsSourceType,
  ConstsAuthType,
  ConstsLicenseEdition,
} from '@/request/types';
import {
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  SvgIcon,
  SvgIconProps,
} from '@mui/material';
import { message } from '@ctzhian/ui';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useBasePath } from '@/hooks';
import { getImagePath } from '@/utils/getImagePath';
function isWeComByUA() {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent.toLowerCase();
  // 1. 必须包含 MicroMessenger (表示微信/企业微信内核)
  // 2. 必须包含 wxwork 或 wecom (表示企业微信)
  return (
    ua.includes('micromessenger') &&
    (ua.includes('wxwork') || ua.includes('wecom'))
  );
}

const CasIcon = (props: SvgIconProps) => {
  return (
    <SvgIcon
      width='32'
      height='32'
      viewBox='16.5 15 32 32'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <rect x='16.5' y='19' width='32' height='24' fill='url(#pattern0)' />
      <defs>
        <pattern
          id='pattern0'
          patternContentUnits='objectBoundingBox'
          width='1'
          height='1'
        >
          <use
            xlinkHref='#image0_4694_78339'
            transform='translate(0 -0.0112474) scale(0.00613497 0.00817996)'
          />
        </pattern>
        <image
          id='image0_4694_78339'
          width='163'
          height='125'
          xlinkHref='data:image/png;base64,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'
        />
      </defs>
    </SvgIcon>
  );
};

export default function Login() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [authType, setAuthType] = useState<ConstsAuthType>();
  const [licenseEdition, setLicenseEdition] = useState<ConstsLicenseEdition>();
  const [sourceType, setSourceType] = useState<ConstsSourceType>();
  const { kbDetail, themeMode, mobile = false, setNodeList } = useStore();
  const basePath = useBasePath();

  const redirectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${basePath}${decodeURIComponent(searchParams.get('redirect') || '')}`
      : '';

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
          const raw = (res as any) ?? [];
          const { isGrouped, navDataMap, defaultNavId } =
            parseNodeListResponse(raw);
          const nodeList = isGrouped
            ? (navDataMap[defaultNavId || ''] ??
              navDataMap[Object.keys(navDataMap)[0]] ??
              [])
            : raw;
          setNodeList?.(Array.isArray(nodeList) ? nodeList : []);
          message.success('认证成功');
          window.open(redirectUrl, '_self');
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
        authType === ConstsAuthType.AuthTypeEnterprise &&
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
      redirect_url: redirectUrl,
    }).then(res => {
      window.location.href = res.url || '/';
    });
  };

  const handleFeishuLogin = () => {
    clearCookie();
    postShareProV1AuthFeishu({
      redirect_url: redirectUrl,
    }).then(res => {
      window.location.href = res.url || '/';
    });
  };

  const handleQiyeweixinLogin = () => {
    clearCookie();
    postShareProV1AuthWecom({
      redirect_url: redirectUrl,
      is_app: isWeComByUA(),
    }).then(res => {
      window.location.href = res.url || '/';
    });
  };

  const handleOAuthLogin = () => {
    clearCookie();
    postShareProV1AuthOauth({
      redirect_url: redirectUrl,
    }).then(res => {
      window.location.href = res.url || '/';
    });
  };

  const handleGitHubLogin = () => {
    clearCookie();
    if (licenseEdition === ConstsLicenseEdition.LicenseEditionFree) {
      postShareV1AuthGithub({
        redirect_url: redirectUrl,
      }).then(res => {
        window.location.href = res.url || '/';
      });
    } else {
      postShareProV1AuthGithub({
        redirect_url: redirectUrl,
      }).then(res => {
        window.location.href = res.url || '/';
      });
    }
  };

  const handleCASLogin = () => {
    postShareProV1AuthCas({
      redirect_url: redirectUrl,
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
          const raw = (res as any) ?? [];
          const { isGrouped, navDataMap, defaultNavId } =
            parseNodeListResponse(raw);
          const nodeList = isGrouped
            ? (navDataMap[defaultNavId || ''] ??
              navDataMap[Object.keys(navDataMap)[0]] ??
              [])
            : raw;
          setNodeList?.(Array.isArray(nodeList) ? nodeList : []);
          message.success('认证成功');
          window.open(redirectUrl, '_self');
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
      setLicenseEdition(res?.license_edition);
      if (res?.auth_type === ConstsAuthType.AuthTypeNull) {
        window.open(redirectUrl, '_self');
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
                  src={getImagePath(kbDetail?.settings?.icon, basePath)}
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
            {authType === ConstsAuthType.AuthTypeSimple && (
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
                          <IconKoulingrenzheng
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

            {authType === ConstsAuthType.AuthTypeEnterprise && (
              <>
                {sourceType === ConstsSourceType.SourceTypeDingTalk && (
                  <Button
                    fullWidth
                    variant='contained'
                    onClick={handleDingTalkLogin}
                    startIcon={<IconDingDing />}
                    sx={{ height: '50px', fontSize: 16 }}
                  >
                    登录
                  </Button>
                )}
                {sourceType === ConstsSourceType.SourceTypeFeishu && (
                  <Button
                    fullWidth
                    variant='contained'
                    onClick={handleFeishuLogin}
                    startIcon={<IconFeishu />}
                    sx={{ height: '50px', fontSize: 16 }}
                  >
                    登录
                  </Button>
                )}
                {sourceType === ConstsSourceType.SourceTypeWeCom && (
                  <Button
                    fullWidth
                    variant='contained'
                    onClick={handleQiyeweixinLogin}
                    startIcon={<IconQiyeweixin />}
                    sx={{ height: '50px', fontSize: 16 }}
                  >
                    登录
                  </Button>
                )}
                {sourceType === ConstsSourceType.SourceTypeOAuth && (
                  <Button
                    fullWidth
                    variant='contained'
                    onClick={handleOAuthLogin}
                    sx={{ height: '50px', fontSize: 16 }}
                  >
                    登录
                  </Button>
                )}
                {sourceType === ConstsSourceType.SourceTypeGitHub && (
                  <Button
                    fullWidth
                    variant='contained'
                    onClick={handleGitHubLogin}
                    startIcon={<IconGitHub1 />}
                    sx={{ height: '50px', fontSize: 16 }}
                  >
                    登录
                  </Button>
                )}

                {sourceType === ConstsSourceType.SourceTypeCAS && (
                  <Button
                    fullWidth
                    variant='contained'
                    onClick={handleCASLogin}
                    startIcon={<CasIcon sx={{ fontSize: '28px !important' }} />}
                    sx={{ height: '50px', fontSize: 16 }}
                  >
                    登录
                  </Button>
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
                                    <IconZhanghao
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
                                    <IconMima
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
      <FooterProvider showBrand={false} />
    </>
  );
}
