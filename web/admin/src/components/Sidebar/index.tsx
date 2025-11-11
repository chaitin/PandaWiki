import Logo from '@/assets/images/logo.png';
import Qrcode from '@/assets/images/qrcode.png';

import { Box, Button, Stack, Typography, useTheme } from '@mui/material';
import { ConstsUserKBPermission } from '@/request/types';
import { Icon, Modal } from '@ctzhian/ui';
import { useState, useMemo, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Avatar from '../Avatar';
import Version from './Version';
import { useAppSelector } from '@/store';

const MENUS = [
  {
    label: '文档',
    value: '/',
    pathname: 'document',
    icon: 'icon-neirongguanli',
    show: true,
    perms: [
      ConstsUserKBPermission.UserKBPermissionFullControl,
      ConstsUserKBPermission.UserKBPermissionDocManage,
    ],
  },
  {
    label: '统计',
    value: '/stat',
    pathname: 'stat',
    icon: 'icon-tongjifenxi1',
    show: true,
    perms: [
      ConstsUserKBPermission.UserKBPermissionFullControl,
      ConstsUserKBPermission.UserKBPermissionDataOperate,
    ],
  },
  {
    label: '贡献',
    value: '/contribution',
    pathname: 'contribution',
    icon: 'icon-gongxian',
    show: true,
    perms: [ConstsUserKBPermission.UserKBPermissionFullControl],
  },
  {
    label: '问答',
    value: '/conversation',
    pathname: 'conversation',
    icon: 'icon-duihualishi1',
    show: true,
    perms: [
      ConstsUserKBPermission.UserKBPermissionFullControl,
      ConstsUserKBPermission.UserKBPermissionDataOperate,
    ],
  },
  {
    label: '反馈',
    value: '/feedback',
    pathname: 'feedback',
    icon: 'icon-jushou',
    show: true,
    perms: [
      ConstsUserKBPermission.UserKBPermissionFullControl,
      ConstsUserKBPermission.UserKBPermissionDataOperate,
    ],
  },
  {
    label: '发布',
    value: '/release',
    pathname: 'release',
    icon: 'icon-paper-full',
    show: true,
    perms: [
      ConstsUserKBPermission.UserKBPermissionFullControl,
      ConstsUserKBPermission.UserKBPermissionDocManage,
    ],
  },
  {
    label: '设置',
    value: '/setting',
    pathname: 'application-setting',
    icon: 'icon-chilun',
    show: true,
    perms: [ConstsUserKBPermission.UserKBPermissionFullControl],
  },
];

const Sidebar = () => {
  const { pathname } = useLocation();
  const { kbDetail } = useAppSelector(state => state.config);
  const theme = useTheme();
  const [showQrcode, setShowQrcode] = useState(false);
  const navigate = useNavigate();
  const menus = useMemo(() => {
    return MENUS.filter(it => {
      return it.perms.includes(kbDetail.perm!);
    });
  }, [kbDetail]);

  useEffect(() => {
    const menu = menus.find(it => {
      if (it.value === '/') {
        return pathname === '/';
      }
      return pathname.startsWith(it.value);
    });

    if (!menu && menus.length > 0) {
      navigate(menus[0].value);
    }
  }, [pathname, menus]);

  return (
    <Stack
      sx={{
        width: 138,
        m: 2,
        zIndex: 999,
        p: 2,
        height: 'calc(100vh - 32px)',
        bgcolor: '#FFFFFF',
        borderRadius: '10px',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
    >
      <Stack
        direction={'row'}
        alignItems={'center'}
        justifyContent={'center'}
        sx={{ flexShrink: 0 }}
      >
        <Avatar src={Logo} sx={{ width: 30, height: 30 }} />
      </Stack>
      <Box
        sx={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'text.primary',
          textAlign: 'center',
          lineHeight: '36px',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        LiteWiki
      </Box>
      <Stack sx={{ pt: 2, flexGrow: 1 }} gap={1}>
        {menus.map(it => {
          let isActive = false;
          if (it.value === '/') {
            isActive = pathname === '/';
          } else {
            isActive = pathname.includes(it.value);
          }
          if (!it.show) return null;
          return (
            <NavLink
              key={it.pathname}
              to={it.value}
              style={{
                zIndex: isActive ? 2 : 1,
              }}
            >
              <Button
                variant={isActive ? 'contained' : 'text'}
                color='dark'
                sx={{
                  width: '100%',
                  height: 50,
                  px: 2,
                  justifyContent: 'flex-start',
                  color: isActive ? '#FFFFFF' : 'text.primary',
                  fontWeight: isActive ? '500' : '400',
                  boxShadow: isActive
                    ? '0px 10px 25px 0px rgba(33,34,45,0.2)'
                    : 'none',
                  ':hover': {
                    boxShadow: isActive
                      ? '0px 10px 25px 0px rgba(33,34,45,0.2)'
                      : 'none',
                  },
                }}
              >
                <Icon
                  type={it.icon}
                  sx={{
                    fontSize: 14,
                    mr: 1,
                    color: isActive ? '#FFFFFF' : 'text.disabled',
                  }}
                />
                {it.label}
              </Button>
            </NavLink>
          );
        })}
      </Stack>
      <Stack gap={1} sx={{ flexShrink: 0 }}>
        <Button
          variant='outlined'
          color='dark'
          sx={{
            fontSize: 14,
            flexShrink: 0,
            fontWeight: 400,
            pr: 1.5,
            pl: 1.5,
            gap: 0.5,
            justifyContent: 'flex-start',
            border: `1px solid ${theme.palette.divider}`,
            '.MuiButton-startIcon': {
              mr: '3px',
            },
            '&:hover': {
              color: 'primary.main',
            },
          }}
          startIcon={
            <Icon type='icon-bangzhuwendang1' sx={{ width: 14, height: 14 }} />
          }
          onClick={() =>
            window.open('https://LiteWiki.docs.baizhi.cloud/', '_blank')
          }
        >
          帮助文档
        </Button>
        <Button
          variant='outlined'
          color='dark'
          sx={{
            fontSize: 14,
            flexShrink: 0,
            fontWeight: 400,
            pr: 1.5,
            pl: 1.5,
            gap: 0.5,
            justifyContent: 'flex-start',
            textTransform: 'none',
            border: `1px solid ${theme.palette.divider}`,
            '.MuiButton-startIcon': {
              mr: '3px',
            },
            '&:hover': {
              color: 'primary.main',
            },
          }}
          startIcon={<Icon type='icon-GitHub' sx={{ width: 14, height: 14 }} />}
          onClick={() =>
            window.open('https://github.com/chaitin/LiteWiki', '_blank')
          }
        >
          GitHub
        </Button>
        <Button
          variant='outlined'
          color='dark'
          sx={{
            fontSize: 14,
            flexShrink: 0,
            fontWeight: 400,
            pr: 1.5,
            pl: 1.5,
            gap: 0.5,
            justifyContent: 'flex-start',
            border: `1px solid ${theme.palette.divider}`,
            '.MuiButton-startIcon': {
              mr: '3px',
            },
            '&:hover': {
              color: 'primary.main',
            },
          }}
          onClick={() => setShowQrcode(true)}
          startIcon={<Icon type='icon-group' sx={{ width: 14, height: 14 }} />}
        >
          在线支持
        </Button>
        <Version />
      </Stack>
      <Modal
        open={showQrcode}
        onCancel={() => setShowQrcode(false)}
        title='在线支持'
        footer={null}
        width={600}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            {/* Enterprise WeChat Group */}
            <Box sx={{ flex: 1, display: 'flex' }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background:
                    'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  textAlign: 'center',
                  width: '100%',
                  height: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <Stack alignItems='center' spacing={1.5}>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600, color: '#2d3748' }}
                  >
                    企业微信交流群
                  </Typography>
                  <Box
                    component='img'
                    src={Qrcode}
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: 2,
                      border: '2px solid white',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
                    }}
                  />
                  <Typography
                    variant='body2'
                    sx={{ color: '#4a5568', fontSize: 13 }}
                  >
                    扫码加入企业微信交流群
                  </Typography>
                </Stack>
              </Box>
            </Box>

            {/* Divider */}
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  width: 1,
                  height: '60%',
                  background:
                    'linear-gradient(to bottom, transparent, #e2e8f0, transparent)',
                }}
              />
            </Box>

            {/* Community Forum */}
            <Box sx={{ flex: 1, display: 'flex' }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background:
                    'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  textAlign: 'center',
                  width: '100%',
                  height: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <Stack alignItems='center' spacing={2}>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600, color: '#2d3748' }}
                  >
                    社区论坛
                  </Typography>
                  <Button
                    variant='contained'
                    onClick={() =>
                      window.open(
                        'https://bbs.baizhi.cloud?ref=LiteWiki',
                        '_blank',
                      )
                    }
                    sx={{
                      px: 3,
                      py: 1,
                      fontSize: 13,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      background:
                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.5)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    访问官方论坛
                  </Button>
                  <Typography
                    variant='body2'
                    sx={{ color: '#4a5568', fontSize: 13, textAlign: 'center' }}
                  >
                    查看更多技术讨论和社区动态
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Modal>
    </Stack>
  );
};

export default Sidebar;
