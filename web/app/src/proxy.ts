import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getShareV1AppWidgetInfo } from './request/ShareApp';

import { parsePathname } from '@/utils';
import { postShareV1StatPage } from '@/request/ShareStat';
import { getShareV1NodeList } from '@/request/ShareNode';
import { getShareV1AppWebInfo } from '@/request/ShareApp';
import {
  filterEmptyFolders,
  convertToTree,
  parseNodeListResponse,
} from '@/utils/tree';
import { deepSearchFirstNode } from '@/utils';

const StatPage = {
  welcome: 1,
  node: 2,
  chat: 3,
  auth: 4,
} as const;

const getFirstNode = async () => {
  const nodeListResult: any = await getShareV1NodeList();
  const { isGrouped, navDataMap, defaultNavId } = parseNodeListResponse(
    nodeListResult || [],
  );
  const nodeListForTree = isGrouped
    ? (navDataMap[defaultNavId || ''] ?? navDataMap[Object.keys(navDataMap)[0]])
    : nodeListResult || [];
  const tree = filterEmptyFolders(
    convertToTree(Array.isArray(nodeListForTree) ? nodeListForTree : []),
  );
  return deepSearchFirstNode(tree);
};

const getHomePath = async () => {
  const info = await getShareV1AppWebInfo();
  return info?.settings?.home_page_setting;
};

const homeProxy = async (
  request: NextRequest,
  headers: Record<string, string>,
  session: string,
) => {
  const url = request.nextUrl.clone();
  const { page, id } = parsePathname(url.pathname);
  try {
    // 获取节点列表
    if (url.pathname === '/') {
      const homePath = await getHomePath();
      if (homePath === 'custom') {
        return NextResponse.rewrite(new URL('/home', request.url));
      } else {
        const [firstNode] = await Promise.all([getFirstNode(), getHomePath()]);
        if (firstNode) {
          return NextResponse.rewrite(
            new URL(`/node/${firstNode.id}`, request.url),
          );
        }
        return NextResponse.rewrite(new URL('/node', request.url));
      }
    }

    // 页面上报
    const pages = Object.keys(StatPage);
    if (pages.includes(page) || pages.includes(id)) {
      postShareV1StatPage(
        {
          scene: StatPage[page as keyof typeof StatPage],
          node_id: id || '',
        },
        {
          headers: {
            'x-pw-session-id': session,
            ...headers,
          },
        },
      );
    }

    return NextResponse.next();
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      error.message === 'NEXT_REDIRECT'
    ) {
      return NextResponse.redirect(
        new URL(
          `/auth/login?redirect=${encodeURIComponent(url.pathname + url.search)}`,
          request.url,
        ),
      );
    }
  }

  return NextResponse.next();
};

const proxyShare = async (request: NextRequest) => {
  // 转发到 process.env.TARGET
  const kb_id = request.headers.get('x-kb-id') || process.env.DEV_KB_ID || '';

  const targetOrigin = process.env.TARGET!;
  const targetUrl = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    targetOrigin,
  );
  // 构造 fetch 选项
  const fetchHeaders = new Headers(request.headers);
  fetchHeaders.set('x-kb-id', kb_id);

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const fetchOptions: RequestInit = {
    method: request.method,
    headers: fetchHeaders,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
    ...(hasBody && { duplex: 'half' as const }),
  };
  const proxyRes = await fetch(targetUrl.toString(), fetchOptions);
  const nextRes = new NextResponse(proxyRes.body, {
    status: proxyRes.status,
    headers: proxyRes.headers,
    statusText: proxyRes.statusText,
  });
  return nextRes;
};

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  if (pathname.startsWith('/widget')) {
    const widgetInfo: any = await getShareV1AppWidgetInfo();
    if (widgetInfo) {
      if (!widgetInfo?.settings?.widget_bot_settings?.is_open) {
        return NextResponse.rewrite(new URL('/not-found', request.url));
      }
    }
    return;
  }

  const headers: Record<string, string> = {};
  for (const [key, value] of request.headers.entries()) {
    headers[key] = value;
  }

  let sessionId = request.cookies.get('x-pw-session-id')?.value || '';
  let needSetSessionId = false;

  if (!sessionId) {
    sessionId = uuidv4();
    needSetSessionId = true;
  }

  let response: NextResponse;

  if (pathname.startsWith('/share/')) {
    response = await proxyShare(request);
  } else {
    response = await homeProxy(request, headers, sessionId);
  }

  if (needSetSessionId) {
    response.cookies.set('x-pw-session-id', sessionId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365, // 1 年
    });
  }
  if (!pathname.startsWith('/share')) {
    response.headers.set('x-current-path', pathname);
    response.headers.set('x-current-search', url.search);
  }
  return response;
}

export const config = {
  matcher: [
    '/',
    '/home',
    '/share/:path*',
    '/chat/:path*',
    '/widget',
    '/welcome',
    '/auth/login',
    '/node/:path*',
    '/node',
  ],
};
