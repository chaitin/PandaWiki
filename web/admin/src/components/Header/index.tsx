import { getKnowledgeBaseDetail } from '@/api';
import { useAppSelector } from '@/store';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Button, IconButton, Stack, Tooltip } from '@mui/material';
import { Icon, Message, Modal } from 'ct-mui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import System from '../System';
import Bread from './Bread';

const Header = () => {
  const navigate = useNavigate()
  const { kb_id } = useAppSelector(state => state.config)
  const [wikiUrl, setWikiUrl] = useState<string>('')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  useEffect(() => {
    if (kb_id) {
      getKnowledgeBaseDetail({ id: kb_id }).then(res => {
        if (res.access_settings.base_url) {
          setWikiUrl(res.access_settings.base_url)
        } else {
          let defaultUrl: string = ''
          const host = res.access_settings?.hosts?.[0] || ''
          if (!host) return

          if (res.access_settings.ssl_ports && res.access_settings.ssl_ports.length > 0) {
            defaultUrl = res.access_settings.ssl_ports.includes(443) ? `https://${host}` : `https://${host}:${res.access_settings.ssl_ports[0]}`
          } else if (res.access_settings.ports && res.access_settings.ports.length > 0) {
            defaultUrl = res.access_settings.ports.includes(80) ? `http://${host}` : `http://${host}:${res.access_settings.ports[0]}`
          }
          setWikiUrl(defaultUrl)
        }
      })
    }
  }, [kb_id])

  return <Stack
    direction={'row'}
    alignItems={'center'}
    justifyContent={'space-between'}
    sx={{
      minWidth: '900px',
      position: 'fixed',
      pl: '170px',
      py: 2,
      pr: 2,
      zIndex: 998,
      width: '100%',
      bgcolor: 'background.paper0',
    }}
  >
    <Bread />
    <Stack direction={'row'} alignItems={'center'} gap={2}>
      <Button size='small' variant='contained' onClick={() => {
        if (wikiUrl) {
          window.open(wikiUrl, '_blank')
        }
      }}>访问 Wiki 网站</Button>
      <System />
      <Tooltip arrow title='退出登录'>
        <IconButton size='small' sx={{
          bgcolor: 'background.paper',
          width: '24px',
          height: '24px',
          '&:hover': {
            color: 'primary.main',
          }
        }} onClick={() => {
          setLogoutConfirmOpen(true)
        }}>
          <Icon type='icon-dengchu' sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Stack>
    <Modal
      open={logoutConfirmOpen}
      onCancel={() => setLogoutConfirmOpen(false)}
      onOk={() => {
        Message.success('退出登录成功，请重新登录')
        setTimeout(() => {
          localStorage.removeItem('panda_wiki_token')
          navigate('/login')
        }, 1500)
      }}
      cancelButtonProps={{
        variant: 'outlined',
        sx: { '&:hover': { borderColor: 'grey.300' } }
      }}
      okButtonProps={{
        variant: 'contained',
        sx: {
          bgcolor: 'primary.main',
          '&:hover': { bgcolor: 'primary.dark' }
        }
      }}
      title={
        <Stack direction="column" gap={3}>
          <Stack direction='row' alignItems='center' gap={1}>
            <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 24 }} />
            <span style={{ fontWeight: 'bold' }}>确定要退出当前账号？</span>
          </Stack>
        </Stack>
      }
      transitionDuration={300}
    />
  </Stack>
}

export default Header
