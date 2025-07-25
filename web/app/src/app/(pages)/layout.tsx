import { apiClient } from "@/api";
import StoreProvider from "@/provider";
import { darkTheme, lightTheme } from "@/theme";
import { Box } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { ThemeProvider } from "ct-mui";
import parse, { DOMNode, domToReact } from 'html-react-parser';
import type { Metadata, Viewport } from "next";
import localFont from 'next/font/local';
import { cookies, headers } from "next/headers";
import Script from 'next/script';
import { cache } from "react";
import { getSelectorsByUserAgent } from "react-device-detect";
import "../globals.css";

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

const getKBDetailCached = cache(async (kb_id: string) => {
  const result = await apiClient.serverGetKBInfo(kb_id);
  if (!result.success) {
    return undefined;
  }
  return result.data;
})

const getNodeListCached = cache(async (kb_id: string, authToken: string) => {
  const result = await apiClient.serverGetNodeList(kb_id, authToken);
  if (!result.success) {
    return undefined;
  }
  return result.data;
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const kb_id = headersList.get('x-kb-id') || process.env.DEV_KB_ID || ''
  const kbDetail = await getKBDetailCached(kb_id)

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
  }
}

const Layout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const headersList = await headers()
  const cookieStore = await cookies()
  const userAgent = headersList.get('user-agent');

  const kb_id = headersList.get('x-kb-id') || process.env.DEV_KB_ID || ''
  const authToken = cookieStore.get(`auth_${kb_id}`)?.value || '';

  const kbDetail = await getKBDetailCached(kb_id)
  const nodeList = await getNodeListCached(kb_id, authToken)

  const themeMode = kbDetail?.settings?.theme_mode || 'light'

  const { isMobile } = getSelectorsByUserAgent(userAgent || '');

  const options = {
    replace(domNode: DOMNode) {
      if (domNode.type === 'script') {
        if (!domNode.children) return <Script {...domNode.attribs} />;
        return <Script {...domNode.attribs}>{domToReact(domNode.children as any, options)}</Script>
      }
    },
  };

  return <html lang="en">
    <head>
      {kbDetail?.settings?.head_code && (
        <>{parse(kbDetail.settings.head_code, options)}</>
      )}
    </head>
    <body className={`${gilory.variable}`}>
      <ThemeProvider theme={themeMode === 'dark' ? darkTheme : lightTheme}>
        <AppRouterCacheProvider>
          <StoreProvider
            kb_id={kb_id}
            kbDetail={kbDetail}
            themeMode={themeMode || 'light'}
            nodeList={nodeList || []}
            mobile={isMobile}
            token={authToken}
          >
            <Box sx={{ bgcolor: 'background.paper' }}>
              {children}
            </Box>
          </StoreProvider>
        </AppRouterCacheProvider>
      </ThemeProvider>
      {kbDetail?.settings?.body_code && (
        <>{parse(kbDetail.settings.body_code, options)}</>
      )}
    </body>
  </html>

};

export default Layout;
