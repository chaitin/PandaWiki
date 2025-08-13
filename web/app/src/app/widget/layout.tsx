import StoreProvider from '@/provider';
import { darkTheme, lightTheme } from '@/theme';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { getShareV1AppWidgetInfo } from '@/request/ShareApp';
import { ThemeProvider } from 'ct-mui';

import React from 'react';

const Layout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const widgetDetail: any = await getShareV1AppWidgetInfo();

  const themeMode =
    widgetDetail?.settings?.widget_bot_settings?.theme_mode || 'light';

  return (
    <ThemeProvider theme={themeMode === 'dark' ? darkTheme : lightTheme}>
      <AppRouterCacheProvider>
        <StoreProvider widget={widgetDetail} themeMode={themeMode || 'light'}>
          {children}
        </StoreProvider>
      </AppRouterCacheProvider>
    </ThemeProvider>
  );
};

export default Layout;
