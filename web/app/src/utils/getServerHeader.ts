import { getBasePath } from './getBasePath';
export async function getServerHeader(
  kbId?: string,
): Promise<Record<string, string>> {
  const { headers, cookies } = await import('next/headers');
  const headersList = await headers();
  const kb_id =
    kbId || headersList.get('x-kb-id') || process.env.DEV_KB_ID || '';
  const cookieStore = await cookies();

  // 手动构建 cookie header，避免转义问题
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies
    .map(cookie => {
      const safeValue = encodeURI(cookie.value);
      return `${cookie.name}=${safeValue}`;
    })
    .join('; ');

  return {
    'x-kb-id': kb_id,
    cookie: cookieHeader,
  };
}

export async function getServerPathname(): Promise<string> {
  const { headers } = await import('next/headers');
  const headersList = await headers();

  // 从中间件设置的自定义 header 中获取当前路径
  const pathname = headersList.get('x-current-path') || '/';

  return pathname;
}

export async function getServerSearch(): Promise<string> {
  const { headers } = await import('next/headers');
  const headersList = await headers();
  const search = headersList.get('x-current-search') || '';
  return search;
}

export async function getServerBasePath(): Promise<string> {
  try {
    const serverHeaders = await getServerHeader();
    const baseUrl = process.env.TARGET || '';
    const response = await fetch(`${baseUrl}/share/v1/app/web/info`, {
      headers: serverHeaders,
    });

    if (response.ok) {
      const data = await response.json();
      const kbDetail = data?.data;
      return getBasePath(kbDetail?.base_url || '');
    }
  } catch (error) {
    console.error('Failed to get basePath:', error);
  }

  return '';
}
