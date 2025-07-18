'use client';
import notFound from '@/assets/images/404.png';
import Footer from '@/components/footer';
import { useStore } from '@/provider';
import { darkTheme, lightTheme } from '@/theme';
import { Box, Stack } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { ThemeProvider } from 'ct-mui';
import Image from 'next/image';

export default function NotFound() {
  const { themeMode = 'light' } = useStore()

  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === 'development' && (
          <>
            <link rel="stylesheet" href="/widget-bot.css" />
            <script src="/widget-bot.js" async></script>
          </>
        )}
      </head>
      <body>
        <ThemeProvider theme={themeMode === 'dark' ? darkTheme : lightTheme}>
          <AppRouterCacheProvider>
            <Box
              sx={{
                position: 'relative',
                pt: 28,
                height: '100vh',
              }}
            >
              <Stack
                sx={{
                  maxWidth: 1200,
                  overflow: 'auto',
                  pb: 6,
                  mx: 'auto',
                }}
                justifyContent='center'
                alignItems='center'
              >
                <Image src={notFound.src} alt='404' width={380} height={200} />
                <Stack gap={3} alignItems='center' sx={{ color: 'text.tertiary', fontSize: 14, mt: 3 }}>
                  页面不存在
                </Stack>
              </Stack>
              <Box sx={{
                height: 40,
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
              }}>
                <Footer showBrand={false} fullWidth={true} />
              </Box>
            </Box>
          </AppRouterCacheProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
