import ErrorComponent from '@/components/error';
import StoreProvider from '@/provider';
import { ThemeStoreProvider } from '@/provider/themeStore';
import { getShareV1AppWebInfo } from '@/request/ShareApp';
import { getShareProV1AuthInfo } from '@/request/pro/ShareAuth';
import { Box } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { headers, cookies } from 'next/headers';
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
  const cookieStore = await cookies();
  const themeMode = (cookieStore.get('theme_mode')?.value || 'light') as
    | 'light'
    | 'dark';

  let error: any = null;

  const [kbDetailResolve, authInfoResolve] = await Promise.allSettled([
    getShareV1AppWebInfo(),
    getShareProV1AuthInfo({}),
  ]);

  const authInfo: any =
    authInfoResolve.status === 'fulfilled' ? authInfoResolve.value : undefined;
  const kbDetail: any =
    kbDetailResolve.status === 'fulfilled' ? kbDetailResolve.value : undefined;

  if (
    authInfoResolve.status === 'rejected' &&
    authInfoResolve.reason.code === 403
  ) {
    error = authInfoResolve.reason;
  }

  const { isMobile } = getSelectorsByUserAgent(userAgent || '') || {
    isMobile: false,
  };

  return (
    <html lang='en'>
      <body
        className={`${gilory.variable} ${themeMode === 'dark' ? 'dark' : ''}`}
      >
        <AppRouterCacheProvider>
          <ThemeStoreProvider themeMode={themeMode}>
            <StoreProvider
              kbDetail={kbDetail}
              themeMode={themeMode || 'light'}
              mobile={isMobile}
              authInfo={authInfo}
            >
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  height: error ? '100vh' : 'auto',
                }}
                id='app-theme-root'
              >
                {error ? <ErrorComponent error={error} /> : children}
              </Box>
            </StoreProvider>
          </ThemeStoreProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
};

export default Layout;
