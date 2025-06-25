import Logo from '@/assets/images/logo.png';
import Qrcode from '@/assets/images/qrcode.png';
import { Box, Button, Stack, useTheme } from "@mui/material";
import { Icon, Modal } from 'ct-mui';
import { useState } from 'react';
import { NavLink, useLocation } from "react-router-dom";
import Avatar from '../Avatar';
import Version from './Version';

const menus = [
  {
    label: '文档',
    value: '/',
    pathname: 'document',
    icon: 'icon-neirongguanli',
    show: true,
  },
  {
    label: '分析',
    value: '/conversation',
    pathname: 'conversation-history',
    icon: 'icon-fenxi',
    show: true,
  },
  {
    label: '发布',
    value: '/release',
    pathname: 'release',
    icon: 'icon-paper-full',
    show: true,
  },
  {
    label: '设置',
    value: '/setting',
    pathname: 'application-setting',
    icon: 'icon-chilun',
    show: true,
  },
]

const Sidebar = () => {
  const { pathname } = useLocation()
  const theme = useTheme()
  const [showQrcode, setShowQrcode] = useState(false)
  return <Stack sx={{
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
  }}>
    <Stack direction={'row'} alignItems={'center'} justifyContent={'center'} sx={{ flexShrink: 0 }}>
      <Avatar src={Logo} sx={{ width: 30, height: 30 }} />
    </Stack>
    <Box sx={{
      fontSize: '16px', fontWeight: 'bold', color: 'text.primary', textAlign: 'center', lineHeight: '36px',
      borderBottom: `1px solid ${theme.palette.divider}`,
    }}>PandaWiki</Box>
    <Stack sx={{ pt: 2, flexGrow: 1 }} gap={1}>
      {menus.map(it => {
        let isActive = false
        if (it.value === '/') {
          isActive = pathname === '/'
        } else {
          isActive = pathname.includes(it.value)
        }
        if (!it.show) return null
        return <NavLink key={it.pathname} to={it.value} style={{
          zIndex: isActive ? 2 : 1,
          color: isActive ? '#FFFFFF' : 'text.primary',
        }}>
          <Button variant={isActive ? 'contained' : 'text'} sx={{
            width: '100%',
            height: 50,
            justifyContent: 'flex-start',
            color: isActive ? '#FFFFFF' : 'text.primary',
            fontWeight: isActive ? '500' : '400',
            boxShadow: isActive ? '0px 10px 25px 0px rgba(33,34,45,0.2)' : 'none',
            ':hover': {
              boxShadow: isActive ? '0px 10px 25px 0px rgba(33,34,45,0.2)' : 'none',
            }
          }} startIcon={<Icon type={it.icon} sx={{
            fontSize: 14,
            color: isActive ? '#FFFFFF' : 'text.disabled',
          }} />}>
            {it.label}
          </Button>
        </NavLink>
      })}
    </Stack>
    <Stack gap={1} sx={{ flexShrink: 0 }}>
      <Button variant='outlined' sx={{
        fontSize: 14,
        flexShrink: 0,
        bgcolor: 'background.paper',
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
        }
      }} startIcon={<Icon type='icon-bangzhuwendang1' />}
        onClick={() => window.open('https://pandawiki.docs.baizhi.cloud/', '_blank')}
      >帮助文档</Button>
      <Button variant='outlined' sx={{
        fontSize: 14,
        flexShrink: 0,
        bgcolor: 'background.paper',
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
        }
      }} startIcon={<Icon type='icon-a-Webyingyong' />}
        onClick={() => window.open('https://github.com/chaitin/PandaWiki', '_blank')}
      >Github</Button>
      <Button variant='outlined' sx={{
        fontSize: 14,
        flexShrink: 0,
        bgcolor: 'background.paper',
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
        }
      }}
        onClick={() => setShowQrcode(true)}
        startIcon={<Icon type='icon-group' />}
      >交流群</Button>
      <Version />
    </Stack>
    <Modal
      open={showQrcode}
      onCancel={() => setShowQrcode(false)}
      title='欢迎加入 PandaWiki 交流群'
      footer={null}
    >
      <Stack alignItems={'center'} justifyContent={'center'} sx={{ my: 2 }}>
        <Box component='img' src={Qrcode} sx={{ width: 300 }} />
      </Stack>
    </Modal>
  </Stack>
}

export default Sidebar