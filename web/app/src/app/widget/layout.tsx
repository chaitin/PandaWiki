import StoreProvider from '@/provider';
import { getShareV1AppWidgetInfo } from '@/request/ShareApp';
import { darkThemeWidget, lightThemeWidget } from '@/theme';
import { getServerHeader, getServerSearch } from '@/utils/getServerHeader';
import { ThemeProvider } from '@ctzhian/ui';
import React from 'react';

const Layout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const search = await getServerSearch();
  const searchParams = new URLSearchParams(search);
  const kbId = searchParams.get('kb_id') || '';
  const serverHeaders = await getServerHeader(kbId);
  const widgetDetail: any = await getShareV1AppWidgetInfo({
    headers: serverHeaders,
  });
  const themeMode = widgetDetail?.settings?.widget_bot_settings?.theme_mode;

  let selectedTheme = lightThemeWidget;

  if (themeMode === 'dark') {
    selectedTheme = darkThemeWidget;
  }

  return (
    <ThemeProvider theme={selectedTheme}>
      <StoreProvider widget={widgetDetail}>{children}</StoreProvider>
    </ThemeProvider>
  );
};

export default Layout;
