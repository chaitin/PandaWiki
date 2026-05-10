export type ShareWebAppBranding = {
  title?: string;
  icon?: string;
};

type ShareWebInfoJson = {
  success?: boolean;
  data?: {
    settings?: {
      title?: string;
      icon?: string;
    };
  };
};

/** 无需登录态，与前台站点共用 share 接口，读取定制导航栏的标题与 LOGO */
export async function fetchShareWebAppBranding(
  kbId: string,
): Promise<ShareWebAppBranding | null> {
  if (!kbId) return null;
  const base = typeof window !== 'undefined' ? window.__BASENAME__ || '' : '';
  try {
    const res = await fetch(`${base}/share/v1/app/web/info`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'X-KB-ID': kbId },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ShareWebInfoJson;
    if (!json?.success || !json.data?.settings) return null;
    const { title, icon } = json.data.settings;
    return { title: title?.trim() || undefined, icon: icon || undefined };
  } catch {
    return null;
  }
}
