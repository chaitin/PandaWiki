import {
  Box,
  Button,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { useState } from 'react';
import Logo from '@/assets/images/logo.png';
import { Icon } from '@ctzhian/ui';
import { AppSetting } from '@/api';
import NavBtns from '../basicComponents/NavBtns';
import { getButtonThemeStyle } from '../basicComponents/buttonThemeUtils';

interface HeaderProps {
  settings: Partial<AppSetting>;
  renderMode: 'pc' | 'mobile';
}
const Header = ({ settings, renderMode }: HeaderProps) => {
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
        paddingX: '15%',
        height: 64,
        bgcolor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
        maxWidth: '100%',
        minWidth: 0,
        ...(renderMode === 'mobile' && {
          left: 0,
          pl: 1.5,
          pr: 0.5,
        }),
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
          <img src={icon} alt='logo' width={32} />
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
        {renderMode === 'pc' && (
          <TextField
            size='small'
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
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
        )}
        {renderMode === 'mobile' && (
          <IconButton
            size='small'
            sx={{ width: 40, height: 40, color: 'text.primary' }}
          >
            <Icon type='icon-sousuo' sx={{ fontSize: 20 }} />
          </IconButton>
        )}
        {renderMode === 'pc' &&
          btns.map((item: any, index: number) => (
            <Button
              key={index}
              variant={item.variant}
              startIcon={
                item.showIcon && item.icon ? (
                  <img src={item.icon} alt='logo' width={24} height={24} />
                ) : null
              }
              sx={{
                fontWeight: 700,
                borderRadius: '6px',
                textTransform: 'none',
                flexShrink: 0,
                minWidth: 0,
                // 使用抽离的按钮主题样式函数
                ...getButtonThemeStyle(settings?.theme_mode, item.variant),
              }}
            >
              <Box
                sx={{
                  lineHeight: '24px',
                }}
              >
                {item.text}
              </Box>
            </Button>
          ))}
        {renderMode === 'mobile' && <NavBtns detail={settings} />}
        {/* {allow_theme_switching && (
          <ThemeSwitch defaultChecked={theme_mode === 'dark'} />
        )} */}
      </Stack>
    </Stack>
  );
};

export default Header;
