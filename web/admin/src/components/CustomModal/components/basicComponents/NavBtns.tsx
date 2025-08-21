import { Box, Button, IconButton, Stack } from '@mui/material';
import { Icon } from '@ctzhian/ui';
import { AppSetting } from '@/api';
import { useState } from 'react';
import { getButtonThemeStyle } from './buttonThemeUtils';

const NavBtns = ({ detail }: { detail?: Partial<AppSetting> }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton
        size='small'
        onClick={() => setOpen(!open)}
        sx={{
          color: 'text.primary',
          width: 40,
          height: 40,
        }}
      >
        <Icon type='icon-a-caidan' />
      </IconButton>
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: '110vh',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
          transition: 'all 0.3s ease-in-out',
          transform: 'translateX(200%) translateY(-200%)',
          ...(open && {
            bgcolor: 'background.default',
            transform: 'translateX(0) translateY(0)',
          }),
        }}
      >
        <Stack
          direction='row'
          alignItems='center'
          gap={1.5}
          sx={{ py: '14px', cursor: 'pointer', ml: 1.5, color: 'text.primary' }}
        >
          {detail?.icon && <img src={detail?.icon} alt='logo' width={32} />}
          <Box sx={{ fontSize: 18 }}>{detail?.title}</Box>
        </Stack>
        <Stack gap={4} sx={{ px: 3, mt: 4, bgcolor: 'background.default' }}>
          {detail?.btns?.map(item => (
            <Button
              key={item.id}
              fullWidth
              variant={item.variant}
              startIcon={
                item.showIcon && item.icon ? (
                  <img src={item.icon} alt='logo' width={36} height={36} />
                ) : null
              }
              sx={{
                textTransform: 'none',
                justifyContent: 'flex-start',
                height: '60px',
                px: 4,
                gap: 3,
                fontSize: 18,
                '& .MuiButton-startIcon': {
                  ml: 0,
                  mr: 0,
                },
                ...getButtonThemeStyle(detail?.theme_mode, item.variant),
              }}
            >
              {item.text}
            </Button>
          ))}
        </Stack>
        <IconButton
          size='small'
          onClick={() => setOpen(!open)}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            color: 'text.primary',
            width: 40,
            height: 40,
            zIndex: 1,
          }}
        >
          <Icon type='icon-chahao' />
        </IconButton>
      </Box>
    </>
  );
};

export default NavBtns;
