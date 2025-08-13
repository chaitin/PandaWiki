export async function getServerHeader(): Promise<Record<string, string>> {
  const { headers, cookies } = await import('next/headers');
  const headersList = await headers();
  const kb_id = headersList.get('x-kb-id') || process.env.DEV_KB_ID || '';
  const cookieStore = await cookies();

  // 手动构建 cookie header，避免转义问题
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies
    .map(cookie => `${cookie.name}=${cookie.value}`)
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
