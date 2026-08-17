'use client';
import { useMemo, useState, useEffect } from 'react';
import Home from '@/views/home';
import { WelcomeFooter } from '@/components/footer';
import { ThemeProvider } from '@ctzhian/ui';
import { WelcomeHeader } from '@/components/header';
import { Stack, createTheme } from '@mui/material';
import { createComponentStyleOverrides } from '@/theme';
import { useStore } from '@/provider';
import { THEME_TO_PALETTE } from '@panda-wiki/themes/constants';
import { postShareV1StatPage } from '@/request/ShareStat';

const HomePage = () => {
  const { kbDetail } = useStore();
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    // 欢迎页访问埋点
    postShareV1StatPage({ scene: 1 });
  }, []);

  useEffect(() => {
    let ticking = false;

    const checkVisibility = () => {
      const elements = document.querySelectorAll('.banner-search-box');
      if (elements.length > 0) {
        // 判断是否还有任意一个搜索框处于可视区域内
        // 顶部预留 64px 为头部占用区域
        const hasVisibleBox = Array.from(elements).some(el => {
          const rect = el.getBoundingClientRect();
          return rect.bottom > 64 && rect.top < window.innerHeight;
        });
        setShowSearch(!hasVisibleBox);
      } else {
        setShowSearch(window.scrollY >= window.innerHeight);
      }
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkVisibility();
          ticking = false;
        });
        ticking = true;
      }
    };

    checkVisibility();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const theme = useMemo(() => {
    // @ts-ignore
    const themeMode = kbDetail?.settings?.web_app_landing_theme?.name || 'blue';
    return createTheme({
      cssVariables: {
        cssVarPrefix: 'welcome',
      },
      palette:
        THEME_TO_PALETTE[themeMode]?.palette ||
        THEME_TO_PALETTE['blue'].palette,
      typography: {
        fontFamily: 'var(--font-gilory), PingFang SC, sans-serif',
      },
      components: createComponentStyleOverrides(true),
    });
    // @ts-ignore
  }, [kbDetail?.settings?.web_app_landing_theme?.name]);

  return (
    <ThemeProvider theme={theme}>
      <Stack
        justifyContent='space-between'
        sx={{ minHeight: '100vh', bgcolor: 'background.default' }}
      >
        <WelcomeHeader showSearch={showSearch} />
        <Stack sx={{ flex: 1 }}>
          <Home />
        </Stack>
        <WelcomeFooter />
      </Stack>
    </ThemeProvider>
  );
};

export default HomePage;
