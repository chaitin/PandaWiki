import { KBDetail } from '@/assets/type';
import { Box, Button, IconButton, Stack } from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconClose, IconMore } from '../icons';

const NavBtns = ({ detail }: { detail?: KBDetail }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

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
        <IconMore />
      </IconButton>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          transition: 'all 0.3s ease-in-out',
          transform: 'translateX(100vw) translateY(-100vh)',
          ...(open && {
            bgcolor: 'background.default',
            transform: 'translateX(0) translateY(0)',
          }),
        }}
      >
        <Link href={'/'} prefetch={false}>
          <Stack
            direction='row'
            alignItems='center'
            gap={1.5}
            sx={{ py: '14px', cursor: 'pointer', ml: 3 }}
          >
            {detail?.settings?.icon && (
              <img
                src={detail?.settings?.icon}
                alt='logo'
                width={32}
                height={32}
              />
            )}
            <Box sx={{ fontSize: 18 }}>{detail?.settings?.title}</Box>
          </Stack>
        </Link>
        <Stack gap={4} sx={{ px: 3, mt: 4 }}>
          {detail?.settings?.btns?.map((item, index) => (
            <Link
              key={index}
              href={item.url}
              target={item.target}
              prefetch={false}
            >
              <Button
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
                }}
              >
                {item.text}
              </Button>
            </Link>
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
          <IconClose />
        </IconButton>
      </Box>
    </>
  );
};

export default NavBtns;
