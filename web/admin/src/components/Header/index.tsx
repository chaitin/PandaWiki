import { IconButton, Stack, Tooltip } from '@mui/material';
import { Icon, Message } from 'ct-mui';
import { useNavigate } from 'react-router-dom';
import System from '../System';
import Bread from './Bread';

const Header = () => {
  const navigate = useNavigate()

  return <Stack
    direction={'row'}
    alignItems={'center'}
    justifyContent={'space-between'}
    sx={{
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
          Message.success('退出登录成功')
          localStorage.removeItem('panda_wiki_token')
          navigate('/login')
        }}>
          <Icon type='icon-dengchu' sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  </Stack>
}

export default Header
