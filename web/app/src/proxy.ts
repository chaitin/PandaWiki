import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getShareV1AppWidgetInfo } from './request/ShareApp';

import { getBasePath, parsePathname } from '@/utils';
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

const stripBasePath = (pathname: string, basePath: string) => {
  if (!basePath) return pathname;
  if (pathname === basePath) return '/';
  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length) || '/';
  }
  return pathname;
};

const homeProxy = async (
  request: NextRequest,
  headers: Record<string, string>,
  session: string,
  pathname?: string,
) => {
  const url = request.nextUrl.clone();
  if (pathname) {
    url.pathname = pathname;
  }
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

    if (pathname && pathname !== request.nextUrl.pathname) {
      return NextResponse.rewrite(
        new URL(`${url.pathname}${url.search}`, request.url),
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

  if (pathname && pathname !== request.nextUrl.pathname) {
    return NextResponse.rewrite(
      new URL(`${url.pathname}${url.search}`, request.url),
    );
  }
  return NextResponse.next();
};

const proxyShare = async (request: NextRequest, pathname?: string) => {
  // 转发到 process.env.TARGET
  const kb_id = request.headers.get('x-kb-id') || process.env.DEV_KB_ID || '';

  const targetOrigin = process.env.TARGET!.trim();
  const targetUrl = new URL(
    (pathname || request.nextUrl.pathname) + request.nextUrl.search,
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
  let kbDetail: any = null;
  try {
    kbDetail = await getShareV1AppWebInfo();
  } catch (e) {
    // 后端暂不可用时中间件不能抛异常，否则所有页面都打不开
    console.error('Failed to load app info in proxy:', e);
  }
  const basePath = getBasePath(kbDetail?.base_url || '');
  const appPathname = stripBasePath(pathname, basePath);

  if (appPathname.startsWith('/widget')) {
    const kb_id =
      url.searchParams.get('kb_id') ||
      request.headers.get('x-kb-id') ||
      process.env.DEV_KB_ID ||
      '';
    const widgetInfo: any = await getShareV1AppWidgetInfo({
      headers: { 'x-kb-id': kb_id },
    });
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

  if (appPathname.startsWith('/share/')) {
    response = await proxyShare(request, appPathname);
  } else {
    response = await homeProxy(request, headers, sessionId, appPathname);
  }

  if (needSetSessionId) {
    response.cookies.set('x-pw-session-id', sessionId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365, // 1 年
    });
  }
  if (!appPathname.startsWith('/share')) {
    response.headers.set('x-current-path', appPathname);
    response.headers.set('x-current-search', url.search);
  }
  return response;
}

export const config = {
  matcher: [
    '/',
    '/home',
    '/:basePath/home',
    '/share/:path*',
    '/:basePath/share/:path*',
    '/chat/:path*',
    '/:basePath/chat/:path*',
    '/widget',
    '/:basePath/widget',
    '/welcome',
    '/:basePath/welcome',
    '/auth/login',
    '/:basePath/auth/login',
    '/node/:path*',
    '/:basePath/node/:path*',
    '/node',
    '/:basePath/node',
  ],
};
