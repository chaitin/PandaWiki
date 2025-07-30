export async function getServerHeader(): Promise<Record<string, string>> {
  const { headers, cookies } = await import('next/headers');
  const headersList = await headers();
  const kb_id = headersList.get('x-kb-id') || process.env.DEV_KB_ID || '';
  const cookieStore = await cookies();
  const authToken = cookieStore.get(`auth_${kb_id}`)?.value || '';

  // 手动构建 cookie header，避免转义问题
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  return {
    'x-kb-id': kb_id,
    'x-simple-auth-password': authToken,
    cookie: cookieHeader,
  };
}
