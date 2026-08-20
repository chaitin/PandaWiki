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

const getFirstNode = async (kbId?: string) => {
  const nodeListResult: any = await getShareV1NodeList({
    headers: { 'x-kb-id': kbId || '' },
  });
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

const getHomePath = async (kbId?: string) => {
  const info = await getShareV1AppWebInfo({
    headers: { 'x-kb-id': kbId || '' },
  });
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
  kbId?: string,
  requestHeaders?: Headers,
) => {
  const url = request.nextUrl.clone();
  if (pathname) {
    url.pathname = pathname;
  }
  const { page, id } = parsePathname(url.pathname);
  const rewriteInit = requestHeaders
    ? { request: { headers: requestHeaders } }
    : undefined;
  try {
    // 获取节点列表
    if (url.pathname === '/') {
      const homePath = await getHomePath(kbId);
      if (homePath === 'custom') {
        return NextResponse.rewrite(new URL('/home', request.url), rewriteInit);
      } else {
        const [firstNode] = await Promise.all([
          getFirstNode(kbId),
          getHomePath(kbId),
        ]);
        if (firstNode) {
          return NextResponse.rewrite(
            new URL(`/node/${firstNode.id}`, request.url),
            rewriteInit,
          );
        }
        return NextResponse.rewrite(new URL('/node', request.url), rewriteInit);
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
        rewriteInit,
      );
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
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
      rewriteInit,
    );
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
};

const proxyShare = async (
  request: NextRequest,
  pathname?: string,
  kbId?: string,
  requestHeaders?: Headers,
) => {
  const kb_id =
    kbId || request.headers.get('x-kb-id') || process.env.DEV_KB_ID || '';

  const targetOrigin = process.env.TARGET!.trim();
  const targetUrl = new URL(
    (pathname || request.nextUrl.pathname) + request.nextUrl.search,
    targetOrigin,
  );
  // 构造 fetch 选项
  const fetchHeaders = new Headers(request.headers);
  fetchHeaders.set('x-kb-id', kb_id);
  if (requestHeaders?.get('x-pw-session-id')) {
    fetchHeaders.set('x-pw-session-id', requestHeaders.get('x-pw-session-id')!);
  }

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
  const urlKbId = url.searchParams.get('kb_id') || '';
  let kbDetail: any = null;
  try {
    kbDetail = await getShareV1AppWebInfo({ headers: { 'x-kb-id': urlKbId } });
  } catch (e) {
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

  // 把会话 ID 注入 SSR 请求头，前端服务端渲染时能拿到访客标识（首次访问没有 cookie）
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pw-session-id', sessionId);

  let response: NextResponse;

  if (appPathname.startsWith('/share/')) {
    response = await proxyShare(request, appPathname, urlKbId, requestHeaders);
  } else {
    response = await homeProxy(
      request,
      headers,
      sessionId,
      appPathname,
      urlKbId,
      requestHeaders,
    );
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
