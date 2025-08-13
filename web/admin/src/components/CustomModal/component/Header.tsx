import { useAppSelector } from '@/store';
import { Box, Button, Stack, TextField, InputAdornment } from '@mui/material';
import { useMemo, useState } from 'react';
import Logo from '@/assets/images/logo.png';
import { Icon } from 'ct-mui';
import { AppSetting } from '@/api';

interface HeaderProps {
  settings: Partial<AppSetting>;
}
const Header = ({ settings }: HeaderProps) => {
  const [searchValue, setSearchValue] = useState('');
  const title = settings.title || '默认标题';
  const icon = settings.icon || '';
  const btns = settings.btns || [];
  const placeholder =
    settings.web_app_custom_style?.header_search_placeholder || '搜索...';
  const handleSearch = () => {
    console.log('搜索内容:', searchValue);
  };

  return (
    <Stack
      direction='row'
      alignItems='center'
      justifyContent='space-between'
      sx={{
        position: 'relative',
        zIndex: 10,
        pr: 5,
        pl: 5,
        height: 64,
        bgcolor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
        maxWidth: '100%',
        minWidth: 0, // 防止 flex 项目溢出
      }}
    >
      <Stack
        direction='row'
        alignItems='center'
        gap={1.5}
        sx={{
          py: '20px',
          color: 'text.primary',
          minWidth: 0, // 防止 flex 项目溢出
          flexShrink: 0, // 防止在空间不足时收缩
        }}
      >
        {icon ? (
          <img src={icon} alt='logo' width={32} height={32} />
        ) : (
          <img src={Logo} width={32} height={32} alt='logo' />
        )}
        <Box
          sx={{
            fontSize: 18,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Box>
      </Stack>
      <Stack
        direction='row'
        alignItems='center'
        gap={2}
        sx={{
          minWidth: 0, // 防止 flex 项目溢出
        }}
      >
        <TextField
          size='small'
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={placeholder || '搜索...'}
          sx={{
            width: '300px',
            bgcolor: 'background.default',
            borderRadius: '10px',
            overflow: 'hidden',
            '& .MuiInputBase-input': {
              lineHeight: '24px',
              height: '24px',
              fontFamily: 'Mono',
            },
            '& .MuiOutlinedInput-root': {
              pr: '18px',
              '& fieldset': {
                borderRadius: '10px',
                borderColor: 'divider',
                px: 2,
              },
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position='end'>
                <Icon
                  type='icon-sousuo'
                  onClick={handleSearch}
                  sx={{ cursor: 'pointer', color: 'text.tertiary' }}
                />
              </InputAdornment>
            ),
          }}
        />
        {btns.map((item: any, index: number) => (
          <Button
            key={index}
            variant={item.variant}
            startIcon={
              item.showIcon && item.icon ? (
                <img src={item.icon} alt='logo' width={24} height={24} />
              ) : null
            }
            sx={{
              textTransform: 'none',
              flexShrink: 0,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                lineHeight: '24px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.text}
            </Box>
          </Button>
        ))}
      </Stack>
    </Stack>
  );
};

export default Header;
