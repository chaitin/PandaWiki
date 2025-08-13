import { login } from '@/api';
import Bgi from '@/assets/images/login-bgi.png';
import Logo from '@/assets/images/logo.png';
import Avatar from '@/components/Avatar';
import Card from '@/components/Card';
import { useURLSearchParams } from '@/hooks';
import { Box, Button, IconButton, Stack, TextField } from '@mui/material';
import { Icon, Message } from 'ct-mui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useURLSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [see, setSee] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = () => {
    login({ account, password })
      .then(res => {
        localStorage.setItem('panda_wiki_token', res.token);
        navigate(redirect);
        Message.success('登录成功');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        backgroundImage: `url(${Bgi})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Stack
        direction='row'
        alignItems={'center'}
        justifyContent={'center'}
        sx={{
          width: '100%',
          height: '100%',
        }}
      >
        <Card
          sx={{
            mt: -3,
            p: 4,
            width: 458,
            boxShadow:
              '0px 0px 4px 0px rgba(54,59,76,0.1), 0px 20px 40px 0px rgba(54,59,76,0.1)',
            position: 'absolute',
            top: '50%',
            left: '50%',
            bgcolor: 'background.paper',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Stack alignItems={'center'}>
            <Avatar src={Logo} sx={{ width: 64, height: 64, mb: 1 }} />
            <Stack
              direction={'row'}
              alignItems={'center'}
              gap={1}
              sx={{
                fontSize: 28,
                fontFamily: 'Gbold',
                color: 'text.primary',
                mb: 4,
              }}
            >
              PandaWiki
            </Stack>
            <TextField
              value={account}
              fullWidth
              sx={{ mb: 4 }}
              onChange={e => setAccount(e.target.value)}
              placeholder='账号'
              autoFocus
              tabIndex={1}
              slotProps={{
                input: {
                  startAdornment: (
                    <Icon
                      type='icon-zhanghao'
                      sx={{ fontSize: 16, mr: 2, flexShrink: 0 }}
                    />
                  ),
                  endAdornment: account ? (
                    <IconButton
                      onClick={() => setAccount('')}
                      size='small'
                      tabIndex={-1}
                    >
                      <Icon
                        type='icon-icon_tool_close'
                        sx={{ fontSize: 14, color: 'text.auxiliary' }}
                      />
                    </IconButton>
                  ) : null,
                },
              }}
            />
            <TextField
              value={password}
              fullWidth
              sx={{ mb: 4 }}
              onChange={e => setPassword(e.target.value)}
              tabIndex={2}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (!account || !password) return;
                  setLoading(true);
                  submit();
                }
              }}
              placeholder='密码'
              type={see ? 'text' : 'password'}
              slotProps={{
                input: {
                  startAdornment: (
                    <Icon
                      type='icon-mima'
                      sx={{ fontSize: 16, mr: 2, flexShrink: 0 }}
                    />
                  ),
                  endAdornment: password ? (
                    <Stack
                      direction={'row'}
                      alignItems={'center'}
                      sx={{ mr: '14px' }}
                    >
                      <IconButton
                        onClick={() => setSee(!see)}
                        size='small'
                        tabIndex={-1}
                      >
                        <Icon
                          type={see ? 'icon-kejian' : 'icon-bukejian'}
                          sx={{ fontSize: 18, color: 'text.auxiliary' }}
                        />
                      </IconButton>
                      <IconButton
                        onClick={() => setPassword('')}
                        size='small'
                        tabIndex={-1}
                      >
                        <Icon
                          type='icon-icon_tool_close'
                          sx={{ fontSize: 14, color: 'text.auxiliary' }}
                        />
                      </IconButton>
                    </Stack>
                  ) : null,
                },
              }}
            />
            <Button
              fullWidth
              variant='contained'
              sx={{ height: 48 }}
              onClick={() => {
                if (!account || !password) return;
                setLoading(true);
                submit();
              }}
              loading={loading}
            >
              登录
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
};

export default Login;
