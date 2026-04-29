'use client';

import { useStore } from '@/provider';
import { useBasePath } from '@/hooks';
import {
  getShareV1AuthGet,
  postShareV1AuthLoginSimple,
  postShareV1AuthLoginUserPassword,
} from '@/request/ShareAuth';
import { getShareV1NodeList } from '@/request/ShareNode';
import { clearCookie } from '@/utils/cookie';
import { ConstsAuthType, ConstsSourceType } from '@/request/types';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { IconKoulingrenzheng, IconMima, IconZhanghao } from '@panda-wiki/icons';
import { message } from '@ctzhian/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getResolvedKbId } from '@/utils/kbId';
import { SITE_FEEDBACK_SIMPLE_GATE_USERNAME } from '@/utils/siteFeedbackAuth';

export default function LoginModal() {
  const {
    loginModalOpen,
    setLoginModalOpen,
    kbDetail,
    setNodeList,
    persistClientAuthInfo,
  } = useStore();
  const basePath = useBasePath();
  const pathname = usePathname();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [authType, setAuthType] = useState<ConstsAuthType>();
  const [sourceType, setSourceType] = useState<ConstsSourceType>();
  const [authLoaded, setAuthLoaded] = useState(false);

  const kbId = getResolvedKbId(kbDetail);

  useEffect(() => {
    if (!loginModalOpen) return;
    setPassword('');
    setUsername('');
    setAuthType(undefined);
    setSourceType(undefined);
    setAuthLoaded(false);
    const headers =
      kbId !== '' ? ({ 'X-KB-ID': kbId } as Record<string, string>) : undefined;
    getShareV1AuthGet(headers ? { headers } : {})
      .then(res => {
        setAuthType(res?.auth_type as ConstsAuthType | undefined);
        setSourceType(res?.source_type as ConstsSourceType | undefined);
      })
      .catch(() => {
        /* 仍展示账号密码表单，由提交接口返回具体错误 */
      })
      .finally(() => setAuthLoaded(true));
  }, [loginModalOpen, kbId, kbDetail]);

  const close = () => setLoginModalOpen?.(false);

  const goFullLoginPage = () => {
    const redirect = encodeURIComponent(pathname || '/home');
    const loginUrl = basePath ? `${basePath}/auth/login` : '/auth/login';
    close();
    router.push(`${loginUrl}?redirect=${redirect}`);
  };

  const afterAuthSuccess = async () => {
    try {
      const res = await getShareV1NodeList();
      setNodeList?.((res as unknown as never[]) ?? []);
    } catch (_) {}
    message.success('认证成功');
    close();
  };

  const handleSimpleLogin = async () => {
    if (!password.trim()) {
      message.error('请输入访问口令');
      return;
    }
    setLoading(true);
    try {
      clearCookie();
      await postShareV1AuthLoginSimple({ password });
      persistClientAuthInfo?.({
        username: SITE_FEEDBACK_SIMPLE_GATE_USERNAME,
        email: '',
        avatar_url: '',
      });
      await afterAuthSuccess();
    } catch (e: unknown) {
      message.error((e as { message?: string })?.message || '认证失败，请重试');
      clearCookie();
    } finally {
      setLoading(false);
    }
  };

  const handleUserPasswordLogin = async () => {
    if (!username.trim() || !password.trim()) {
      message.error('请输入用户名和密码');
      return;
    }
    const effectiveKbId = getResolvedKbId(kbDetail).trim();
    setLoading(true);
    try {
      clearCookie();
      await postShareV1AuthLoginUserPassword(
        { username, password },
        effectiveKbId ? { headers: { 'X-KB-ID': effectiveKbId } } : {},
      );
      persistClientAuthInfo?.({
        username,
        email: username,
        avatar_url: '',
      });
      await afterAuthSuccess();
    } catch (e: unknown) {
      message.error((e as { message?: string })?.message || '认证失败，请重试');
      clearCookie();
    } finally {
      setLoading(false);
    }
  };

  /** 仅简单口令走口令框 */
  const showSimpleForm =
    authLoaded && authType === ConstsAuthType.AuthTypeSimple;

  /**
   * 企业认证且为飞书/钉钉/OAuth 等需整页跳转的方式
   *（用户名密码、LDAP 与 auth 未配置/空值均在弹窗内用账号密码尝试）
   */
  const showEnterpriseThirdParty =
    authLoaded &&
    authType === ConstsAuthType.AuthTypeEnterprise &&
    !!sourceType &&
    sourceType !== ConstsSourceType.SourceTypeUserPassword &&
    sourceType !== ConstsSourceType.SourceTypeLDAP;

  const showUserPasswordForm =
    authLoaded && !showSimpleForm && !showEnterpriseThirdParty;

  return (
    <Dialog open={!!loginModalOpen} onClose={close} maxWidth='xs' fullWidth>
      <DialogTitle sx={{ pr: 5 }}>
        登录后继续
        <IconButton
          aria-label='关闭'
          onClick={close}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {!authLoaded && (
            <Box display='flex' justifyContent='center' py={3}>
              <CircularProgress size={28} />
            </Box>
          )}

          {showSimpleForm && (
            <>
              <TextField
                fullWidth
                type='password'
                value={password}
                autoFocus
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleSimpleLogin();
                }}
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
              />
              <Button
                fullWidth
                variant='contained'
                onClick={() => void handleSimpleLogin()}
                disabled={loading || !password.trim()}
              >
                {loading ? '验证中…' : '认证访问'}
              </Button>
            </>
          )}

          {showUserPasswordForm && (
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
                          sx={{ fontSize: 16, width: 24, height: 16 }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                fullWidth
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleUserPasswordLogin();
                }}
                placeholder='密码'
                disabled={loading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <IconMima
                          sx={{ fontSize: 16, width: 24, height: 16 }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                fullWidth
                variant='contained'
                onClick={() => void handleUserPasswordLogin()}
                disabled={loading || !username.trim() || !password.trim()}
              >
                {loading ? '登录中…' : '登录'}
              </Button>
            </>
          )}

          {showEnterpriseThirdParty && (
            <Box>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                当前知识库使用第三方或企业统一登录，请在登录页完成认证。
              </Typography>
              <Button fullWidth variant='contained' onClick={goFullLoginPage}>
                前往登录页
              </Button>
            </Box>
          )}

          {authLoaded && (
            <Typography
              variant='caption'
              color='text.secondary'
              textAlign='center'
            >
              <Link component='button' type='button' onClick={goFullLoginPage}>
                打开完整登录页
              </Link>
            </Typography>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
