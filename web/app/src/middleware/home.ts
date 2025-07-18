import { parsePathname } from '@/utils';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { apiClient } from '../api';

const StatPage = {
  welcome: 1,
  node: 2,
  chat: 3,
  auth: 4,
};

export async function middleware(
  request: NextRequest,
  headers: Record<string, string>,
  session: string
) {
  const url = request.nextUrl.clone();
  const { page, id } = parsePathname(url.pathname);

  const kb_id = request.headers.get('x-kb-id') || process.env.DEV_KB_ID || '';
  const authToken = request.cookies.get(`auth_${kb_id}`)?.value || '';

  try {
    // 获取节点列表
    const nodeListResult = await apiClient.serverGetNodeList(kb_id, authToken);
    if (nodeListResult.status === 401 && !url.pathname.startsWith('/auth')) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', url.pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (url.pathname === '/') {
      return NextResponse.redirect(new URL('/welcome', request.url));
    }

    // 页面上报
    const pages = Object.keys(StatPage);
    if (pages.includes(page) || pages.includes(id)) {
      apiClient.serviceStatPage({
        kb_id,
        authToken,
        scene: StatPage[page as keyof typeof StatPage],
        node_id: id || '',
        headers,
        session,
      });
    }

    return NextResponse.next();
  } catch (error) {
    console.log(error);
  }

  return NextResponse.next();
}
