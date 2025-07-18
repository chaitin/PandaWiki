export async function getServerHeader(): Promise<Record<string, string>> {
  const { headers, cookies } = await import('next/headers');
  const headersList = await headers();
  const kb_id = headersList.get('x-kb-id') || process.env.DEV_KB_ID || '';
  const cookieStore = await cookies();
  const authToken = cookieStore.get(`auth_${kb_id}`)?.value || '';
  return {
    'x-kb-id': kb_id,
    'x-simple-auth-password': authToken,
    cookie: cookieStore.toString(),
  };
}
