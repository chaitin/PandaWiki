import Logo from '@/assets/images/logo.png';
import Qrcode from '@/assets/images/qrcode.png';

import { Box, Button, Stack, Typography, useTheme } from '@mui/material';
import { ConstsUserKBPermission } from '@/request/types';
import { Modal } from '@ctzhian/ui';
import { useState, useMemo, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Avatar from '../Avatar';
import Version from './Version';
import { useAppSelector } from '@/store';
import {
  IconBangzhuwendang1,
  IconNeirongguanli,
  IconTongjifenxi1,
  IconJushou,
  IconGongxian,
  IconPaperFull,
  IconDuihualishi1,
  IconChilun,
  IconGroup,
} from '@panda-wiki/icons';

const MENUS = [
  {
    label: '文档',
    value: '/',
    pathname: 'document',
    icon: IconNeirongguanli,
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
    icon: IconTongjifenxi1,
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
    icon: IconGongxian,
    show: true,
    perms: [ConstsUserKBPermission.UserKBPermissionFullControl],
  },
  {
    label: '问答',
    value: '/conversation',
    pathname: 'conversation',
    icon: IconDuihualishi1,
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
    icon: IconJushou,
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
    icon: IconPaperFull,
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
    icon: IconChilun,
    show: true,
    perms: [ConstsUserKBPermission.UserKBPermissionFullControl],
  },
];

const HELP_ITEMS = [
  {
    title: '知识库管理',
    content:
      '在顶部下拉框可切换知识库，点击「创建新 Wiki 站」可新建知识库。知识库是一个独立的 Wiki 站点，可配置域名、Logo、主题和机器人。发布后内容才会在前台展示。',
  },
  {
    title: '文档管理',
    content:
      '在「文档」页可创建目录和文档，支持 AI 摘要、AI 续写、文本润色（润色/扩写/缩写/改写）。文档保存后需在「发布」页发布，前台才能看到最新内容。',
  },
  {
    title: 'AI 智能问答',
    content:
      '前台通过 Ctrl+K 或搜索框打开智能问答，基于 RAG（向量检索 + 大模型生成）回答知识库内的问题，回答会标注引用来源，并支持点赞/点踩反馈。',
  },
  {
    title: '统计看板',
    content:
      '在「统计」页可查看访问趋势、实时来访、用户分布、热门文档、热门问题等数据。数据来自前台页面的访问埋点，用于了解知识库的使用情况。',
  },
  {
    title: '模型配置',
    content:
      '在「系统设置 → AI 模型」中配置 Chat、Embedding、Rerank 等模型。配置时可点「检测」验证连通性。Embedding/Rerank 用于向量检索，Chat 用于智能问答。',
  },
  {
    title: '网页挂件机器人',
    content:
      '在「系统设置 → AI 机器人」中配置网页挂件机器人，可将 AI 问答能力嵌入到外部网站，访客通过悬浮球即可提问。',
  },
  {
    title: '反馈闭环',
    content:
      '在「反馈」页可查看用户对 AI 回答的评价和对文档的评论，支持审核评论（通过/拒绝/删除），用于持续优化知识库质量。',
  },
];

const Sidebar = () => {
  const { pathname } = useLocation();
  const { kbDetail } = useAppSelector(state => state.config);
  const theme = useTheme();
  const [showQrcode, setShowQrcode] = useState(false);
  const [showHelpDoc, setShowHelpDoc] = useState(false);
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
        overflow: 'auto',
      }}
    >
      <Stack
        direction={'row'}
        alignItems={'center'}
        justifyContent={'center'}
        sx={{ flexShrink: 0 }}
      >
        <Avatar src={Logo} sx={{ width: 48, height: 48 }} />
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
        湖工院知识库
      </Box>
      <Stack sx={{ py: 2, flexGrow: 1 }} gap={1}>
        {menus.map(it => {
          let isActive = false;
          if (it.value === '/') {
            isActive = pathname === '/';
          } else {
            isActive = pathname.includes(it.value);
          }
          if (!it.show) return null;
          const IconMenu = it.icon;
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
                <IconMenu
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
          onClick={() => setShowQrcode(true)}
          startIcon={<IconGroup sx={{ fontSize: '14px !important' }} />}
        >
          在线支持
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
          startIcon={
            <IconBangzhuwendang1 sx={{ fontSize: '14px !important' }} />
          }
          onClick={() => setShowHelpDoc(true)}
        >
          帮助文档
        </Button>
        <Version />
      </Stack>
      <Modal
        open={showHelpDoc}
        onCancel={() => setShowHelpDoc(false)}
        title='帮助文档'
        footer={null}
        width={760}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant='h6' sx={{ mb: 2, fontWeight: 600 }}>
            湖工院知识库 功能使用说明
          </Typography>
          <Stack spacing={2.5}>
            {HELP_ITEMS.map(item => (
              <Box key={item.title}>
                <Typography
                  sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}
                >
                  {item.title}
                </Typography>
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {item.content}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Modal>
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
                    学校公众号
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
                    扫码关注学校公众号
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
                    学校官网
                  </Typography>
                  <Button
                    variant='contained'
                    onClick={() =>
                      window.open('https://www.hunangy.com/', '_blank')
                    }
                    sx={{
                      px: 3,
                      py: 1,
                      fontSize: 13,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      background:
                        'linear-gradient(135deg, #1E5AA8 0%, #2f7bd6 100%)',
                      boxShadow: '0 2px 8px rgba(30, 90, 168, 0.3)',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(30, 90, 168, 0.5)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    访问学校官网
                  </Button>
                  <Typography
                    variant='body2'
                    sx={{ color: '#4a5568', fontSize: 13, textAlign: 'center' }}
                  >
                    了解更多学校信息和校园服务
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
