import { getShareV1AppWebInfo } from '@/request/ShareApp';
import StoreProvider from '@/provider';
import { darkTheme, lightTheme } from '@/theme';
import { Box } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { ThemeProvider } from 'ct-mui';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { cookies, headers } from 'next/headers';
import { getSelectorsByUserAgent } from 'react-device-detect';
import './globals.css';

const gilory = localFont({
  variable: '--font-gilory',
  src: [
    {
      path: '../assets/fonts/gilroy-bold-700.otf',
      weight: '700',
    },
    {
      path: '../assets/fonts/gilroy-medium-500.otf',
      weight: '400',
    },
    {
      path: '../assets/fonts/gilroy-regular-400.otf',
      weight: '300',
    },
  ],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata(): Promise<Metadata> {
  const kbDetail: any = await getShareV1AppWebInfo();

  return {
    metadataBase: new URL(process.env.TARGET || ''),
    title: kbDetail?.settings?.title || 'Panda-Wiki',
    description: kbDetail?.settings?.desc || '',
    icons: {
      icon: kbDetail?.settings?.icon || '/favicon.png',
    },
    openGraph: {
      title: kbDetail?.settings?.title || 'Panda-Wiki',
      description: kbDetail?.settings?.desc || '',
      images: kbDetail?.settings?.icon ? [kbDetail.settings.icon] : [],
    },
  };
}

const Layout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent');

  const kbDetail: any = await getShareV1AppWebInfo();

  const themeMode = kbDetail?.settings?.theme_mode || 'light';

  const { isMobile } = getSelectorsByUserAgent(userAgent || '');

  return (
    <html lang='en'>
      <body className={`${gilory.variable}`}>
        <ThemeProvider theme={themeMode === 'dark' ? darkTheme : lightTheme}>
          <AppRouterCacheProvider>
            <StoreProvider
              kbDetail={kbDetail}
              themeMode={themeMode || 'light'}
              mobile={isMobile}
            >
              <Box sx={{ bgcolor: 'background.paper' }}>{children}</Box>
            </StoreProvider>
          </AppRouterCacheProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default Layout;
