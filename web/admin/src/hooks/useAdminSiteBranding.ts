import LogoFallback from '@/assets/images/logo.png';
import { fetchShareWebAppBranding } from '@/utils/fetchShareWebAppBranding';
import { adminMediaUrl } from '@/utils/adminMediaUrl';
import { useEffect, useState } from 'react';

const DEFAULT_PAGE_TITLE = '后台管理';

function applyDocumentBranding(title: string, iconUrl: string | undefined) {
  if (typeof document === 'undefined') return;
  document.title = title || DEFAULT_PAGE_TITLE;
  const link = document.getElementById('favicon') as HTMLLinkElement | null;
  if (!link) return;
  const base = window.__BASENAME__ || '';
  if (iconUrl) {
    link.href = iconUrl;
    if (iconUrl.endsWith('.svg')) {
      link.type = 'image/svg+xml';
    } else if (iconUrl.match(/\.(png|jpg|jpeg|webp|gif)(\?|$)/i)) {
      link.type = 'image/png';
    }
  } else {
    link.href = `${base}/logo.png`;
    link.type = 'image/png';
  }
}

export function useAdminSiteBranding(
  kbId: string | undefined | null,
  options?: { syncDocument?: boolean },
) {
  const syncDocument = options?.syncDocument !== false;
  const [navTitle, setNavTitle] = useState('');
  const [logoSrc, setLogoSrc] = useState<string>(LogoFallback);

  useEffect(() => {
    if (!kbId) {
      setNavTitle('');
      setLogoSrc(LogoFallback);
      if (syncDocument) {
        applyDocumentBranding(DEFAULT_PAGE_TITLE, undefined);
      }
      return;
    }
    let cancelled = false;
    fetchShareWebAppBranding(kbId).then(branding => {
      if (cancelled) return;
      if (!branding) {
        setNavTitle('');
        setLogoSrc(LogoFallback);
        if (syncDocument) {
          applyDocumentBranding(DEFAULT_PAGE_TITLE, undefined);
        }
        return;
      }
      const title = branding.title?.trim() || '';
      const icon = branding.icon;
      setNavTitle(title);
      setLogoSrc(icon ? adminMediaUrl(icon) : LogoFallback);
      if (syncDocument) {
        const pageTitle = title || DEFAULT_PAGE_TITLE;
        applyDocumentBranding(
          pageTitle,
          icon ? adminMediaUrl(icon) : undefined,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [kbId, syncDocument]);

  const displayTitle = navTitle || DEFAULT_PAGE_TITLE;

  return {
    /** 用于侧栏、登录页大标题：有定制标题用定制，否则「后台管理」 */
    displayTitle,
    /** 头像 / LOGO 图片地址 */
    logoSrc,
  };
}
