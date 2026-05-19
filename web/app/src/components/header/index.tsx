'use client';

import Logo from '@/assets/images/logo.png';
import {
  Stack,
  Box,
  Button,
  IconButton,
  alpha,
  Tooltip,
  Typography,
} from '@mui/material';
import { postShareProV1AuthLogout } from '@/request/pro/ShareAuth';
import { IconDengchu } from '@panda-wiki/icons';
import { useStore } from '@/provider';
import { useMemo, useState } from 'react';
import ErrorIcon from '@mui/icons-material/Error';
import { message, Modal } from '@ctzhian/ui';
import {
  Header as CustomHeader,
  WelcomeHeader as WelcomeHeaderComponent,
} from '@panda-wiki/ui';
import QaModal from '../QaModal';
import ThemeSwitch from './themeSwitch';
import SiteFeedbackDialog from '../SiteFeedbackDialog';
import { getImagePath } from '@/utils/getImagePath';
import { useBasePath } from '@/hooks';
import { isAuthInfoEmpty } from '@/utils/authInfo';
import { lacksAccountIdentityForSiteFeedback } from '@/utils/siteFeedbackAuth';
import { clearCookie } from '@/utils/cookie';
interface HeaderProps {
  isDocPage?: boolean;
  isWelcomePage?: boolean;
}

const LogoutButton = () => {
  const [open, setOpen] = useState(false);
  const { clearClientAuthInfo } = useStore();
  const handleLogout = async () => {
    try {
      await postShareProV1AuthLogout();
    } catch (_) {
      /* 仍清理本地态，避免残留已登录表现 */
    }
    await clearCookie();
    clearClientAuthInfo?.();
    const protocol = window.location.protocol;
    const host = window.location.host;
    window.location.href = `${protocol}//${host}/auth/login`;
  };
  return (
    <>
      <Modal
        title={
          <Stack direction='row' alignItems='center' gap={1}>
            <ErrorIcon sx={{ fontSize: 24, color: 'warning.main' }} />
            <Box sx={{ mt: '2px' }}>提示</Box>
          </Stack>
        }
        open={open}
        okText='确定'
        cancelText='取消'
        onCancel={() => setOpen(false)}
        onOk={handleLogout}
        closable={false}
      >
        <Box sx={{ pl: 4 }}>确定要退出登录吗？</Box>
      </Modal>
      <Tooltip title='退出登录' arrow>
        <IconButton size='small' onClick={() => setOpen(true)}>
          <IconDengchu
            sx={(theme: import('@mui/material/styles').Theme) => ({
              cursor: 'pointer',
              color: alpha(theme.palette.text.primary, 0.65),
              fontSize: 24,
              '&:hover': { color: theme.palette.primary.main },
            })}
          />
        </IconButton>
      </Tooltip>
    </>
  );
};

const Header = ({ isDocPage = false, isWelcomePage = false }: HeaderProps) => {
  const {
    mobile = false,
    kbDetail,
    catalogWidth,
    setQaModalOpen,
    setLoginModalOpen,
    authInfo,
  } = useStore();
  const [siteFbOpen, setSiteFbOpen] = useState(false);
  const basePath = useBasePath();
  const docWidth = useMemo(() => {
    if (isWelcomePage) return 'full';
    return kbDetail?.settings?.theme_and_style?.doc_width || 'full';
  }, [kbDetail, isWelcomePage]);

  const openQaOrLogin = () => {
    if (isAuthInfoEmpty(authInfo)) {
      setLoginModalOpen?.(true);
      return;
    }
    setQaModalOpen?.(true);
  };

  const openSiteFeedbackOrLogin = () => {
    if (isAuthInfoEmpty(authInfo)) {
      setLoginModalOpen?.(true);
      return;
    }
    if (lacksAccountIdentityForSiteFeedback(authInfo)) {
      message.error(
        '问题反馈需使用账号登录（用户名密码或企业 SSO），当前为访问口令认证',
      );
      setLoginModalOpen?.(true);
      return;
    }
    setSiteFbOpen(true);
  };

  const handleSearch = (value?: string, type: 'chat' | 'search' = 'chat') => {
    if (value?.trim()) {
      if (type === 'chat') {
        if (isAuthInfoEmpty(authInfo)) {
          setLoginModalOpen?.(true);
          return;
        }
        sessionStorage.setItem('chat_search_query', value.trim());
        setQaModalOpen?.(true);
      } else {
        sessionStorage.setItem('chat_search_query', value.trim());
      }
    }
  };

  return (
    <CustomHeader
      isDocPage={isDocPage}
      mobile={mobile}
      docWidth={docWidth}
      catalogWidth={catalogWidth}
      logo={getImagePath(kbDetail?.settings?.icon || Logo.src, basePath)}
      title={kbDetail?.settings?.title}
      placeholder={
        kbDetail?.settings?.web_app_custom_style?.header_search_placeholder
      }
      showSearch
      homePath={basePath || '/'}
      btns={
        kbDetail?.settings?.btns?.map((item: any) => ({
          ...item,
          url: getImagePath(item.url, basePath),
          icon: getImagePath(item.icon, basePath),
        })) || []
      }
      onSearch={handleSearch}
      onQaClick={openQaOrLogin}
    >
      <Stack sx={{ ml: 2 }} direction='row' alignItems='center' gap={1}>
        <Button
          size='small'
          color='inherit'
          onClick={openSiteFeedbackOrLogin}
          sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
        >
          问题反馈
        </Button>
        <ThemeSwitch />
        {!isAuthInfoEmpty(authInfo) && authInfo && (
          <>
            {authInfo.username && (
              <Typography
                variant='body2'
                sx={{
                  color: 'text.secondary',
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {authInfo.username}
              </Typography>
            )}
            <LogoutButton />
          </>
        )}
      </Stack>
      <SiteFeedbackDialog
        open={siteFbOpen}
        onClose={() => setSiteFbOpen(false)}
      />
      <QaModal />
    </CustomHeader>
  );
};

export const WelcomeHeader = () => {
  const basePath = useBasePath();
  const [siteFbOpen, setSiteFbOpen] = useState(false);
  const {
    mobile = false,
    kbDetail,
    catalogWidth,
    setQaModalOpen,
    setLoginModalOpen,
    authInfo,
  } = useStore();

  const openQaOrLogin = () => {
    if (isAuthInfoEmpty(authInfo)) {
      setLoginModalOpen?.(true);
      return;
    }
    setQaModalOpen?.(true);
  };

  const openSiteFeedbackOrLogin = () => {
    if (isAuthInfoEmpty(authInfo)) {
      setLoginModalOpen?.(true);
      return;
    }
    if (lacksAccountIdentityForSiteFeedback(authInfo)) {
      message.error(
        '问题反馈需使用账号登录（用户名密码或企业 SSO），当前为访问口令认证',
      );
      setLoginModalOpen?.(true);
      return;
    }
    setSiteFbOpen(true);
  };

  const handleSearch = (value?: string, type: 'chat' | 'search' = 'chat') => {
    if (value?.trim()) {
      if (type === 'chat') {
        if (isAuthInfoEmpty(authInfo)) {
          setLoginModalOpen?.(true);
          return;
        }
        sessionStorage.setItem('chat_search_query', value.trim());
        setQaModalOpen?.(true);
      } else {
        sessionStorage.setItem('chat_search_query', value.trim());
      }
    }
  };
  return (
    <WelcomeHeaderComponent
      isDocPage={false}
      mobile={mobile}
      docWidth='full'
      catalogWidth={catalogWidth}
      logo={getImagePath(kbDetail?.settings?.icon || Logo.src, basePath)}
      title={kbDetail?.settings?.title}
      placeholder={
        kbDetail?.settings?.web_app_custom_style?.header_search_placeholder
      }
      showSearch
      homePath={basePath || '/'}
      btns={
        kbDetail?.settings?.btns?.map((item: any) => ({
          ...item,
          url: getImagePath(item.url, basePath),
          icon: getImagePath(item.icon, basePath),
        })) || []
      }
      onSearch={handleSearch}
      onQaClick={openQaOrLogin}
    >
      <Stack sx={{ ml: 2 }} direction='row' alignItems='center' gap={1}>
        <Button
          size='small'
          color='inherit'
          onClick={openSiteFeedbackOrLogin}
          sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
        >
          问题反馈
        </Button>
        <ThemeSwitch />
        {!isAuthInfoEmpty(authInfo) && authInfo && (
          <>
            {authInfo.username && (
              <Typography
                variant='body2'
                sx={{
                  color: 'text.secondary',
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {authInfo.username}
              </Typography>
            )}
            <LogoutButton />
          </>
        )}
      </Stack>
      <SiteFeedbackDialog
        open={siteFbOpen}
        onClose={() => setSiteFbOpen(false)}
      />
      <QaModal />
    </WelcomeHeaderComponent>
  );
};

export default Header;
