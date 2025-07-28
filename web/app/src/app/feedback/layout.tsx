import StoreProvider from '@/provider';
import { lightTheme } from '@/theme';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { ThemeProvider } from 'ct-mui';
import localFont from 'next/font/local';
import { headers } from 'next/headers';
import React from 'react';

const gilory = localFont({
  variable: '--font-gilory',
  src: [
    {
      path: '../../assets/fonts/gilroy-bold-700.otf',
      weight: '700',
    },
    {
      path: '../../assets/fonts/gilroy-medium-500.otf',
      weight: '400',
    },
    {
      path: '../../assets/fonts/gilroy-regular-400.otf',
      weight: '300',
    },
  ],
});

const Layout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const headersList = await headers()
  const kb_id = headersList.get('x-kb-id') || process.env.DEV_KB_ID || ''

  return <html lang="en">
    <body className={`${gilory.variable}`}>
      <ThemeProvider theme={lightTheme}>
        <AppRouterCacheProvider>
          <StoreProvider
            kb_id={kb_id}
            themeMode={'light'}
          >
            {children}
          </StoreProvider>
        </AppRouterCacheProvider>
      </ThemeProvider>
    </body>
  </html>
};

export default Layout;
