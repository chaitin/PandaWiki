import { getApiV1KnowledgeBaseDetail } from '@/request/KnowledgeBase';
import { useAppSelector, useAppDispatch } from '@/store';
import { setKbDetail } from '@/store/slices/config';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Button, IconButton, Stack, Tooltip } from '@mui/material';
import { message, Modal } from '@ctzhian/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import System from '../System';
import Bread from './Bread';
import { IconDengchu } from '@panda-wiki/icons';

const Header = () => {
  const navigate = useNavigate();
  const { kb_id } = useAppSelector(state => state.config);
  const dispatch = useAppDispatch();
  const [wikiUrl, setWikiUrl] = useState<string>('');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    if (kb_id) {
      getApiV1KnowledgeBaseDetail({ id: kb_id }).then(res => {
        dispatch(setKbDetail(res));
        const settings = res.access_settings;
        const host = settings?.hosts?.[0] || '';
        let defaultUrl: string = '';

        // 优先使用 HTTP 配置打开 Wiki 站点
        if (host && settings?.ports && settings.ports.length > 0) {
          defaultUrl = settings.ports.includes(80)
            ? `http://${host}`
            : `http://${host}:${settings.ports[0]}`;
        } else if (settings?.base_url) {
          defaultUrl = settings.base_url;
        }
        // 拼接 kb_id，确保 App 前台打开正确的知识库（多知识库隔离）
        const sep = defaultUrl.includes('?') ? '&' : '?';
        setWikiUrl(`${defaultUrl}${sep}kb_id=${kb_id}`);
      });
    }
  }, [kb_id]);

  return (
    <Stack
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
        bgcolor: 'background.paper2',
      }}
    >
      <Bread />
      <Stack direction={'row'} alignItems={'center'} gap={2}>
        <Button
          size='small'
          variant='contained'
          color='dark'
          onClick={() => {
            if (wikiUrl) {
              window.open(wikiUrl, '_blank');
            }
          }}
        >
          访问 Wiki 网站
        </Button>
        <System />
        <Tooltip arrow title='退出登录'>
          <IconButton
            size='small'
            sx={{
              bgcolor: 'background.paper',
              width: '24px',
              height: '24px',
              '&:hover': {
                color: 'primary.main',
              },
            }}
            onClick={() => {
              setLogoutConfirmOpen(true);
            }}
          >
            <IconDengchu sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Modal
        open={logoutConfirmOpen}
        onCancel={() => setLogoutConfirmOpen(false)}
        onOk={() => {
          message.success('退出登录成功，请重新登录');
          setTimeout(() => {
            localStorage.removeItem('panda_wiki_token');
            navigate('/login');
          }, 1500);
        }}
        cancelButtonProps={{
          variant: 'outlined',
          sx: { '&:hover': { borderColor: 'grey.300' } },
        }}
        okButtonProps={{
          variant: 'contained',
          sx: {
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
          },
        }}
        title={
          <Stack direction='column' gap={3}>
            <Stack direction='row' alignItems='center' gap={1}>
              <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 24 }} />
              <span style={{ fontWeight: 'bold' }}>确定要退出当前账号？</span>
            </Stack>
          </Stack>
        }
        transitionDuration={300}
      />
    </Stack>
  );
};

export default Header;
