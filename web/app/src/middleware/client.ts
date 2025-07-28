import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const kb_id = request.headers.get('x-kb-id') || process.env.DEV_KB_ID || '';
  const authToken = request.cookies.get(`auth_${kb_id}`)?.value || '';
  console.log('🍎 client api >>>', url.pathname, ' >>> ', kb_id)

  const pathname = url.pathname.replace(/client/, 'share')

  try {
    const apiBaseUrl = process.env.TARGET || '';
    const targetUrl = `${apiBaseUrl}${pathname}${url.search}`;

    const proxyHeaders = new Headers();

    request.headers.forEach((value, key) => {
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        proxyHeaders.set(key, value);
      }
    });

    proxyHeaders.set('x-kb-id', kb_id);
    proxyHeaders.set('X-Simple-Auth-Password', authToken);

    const proxyOptions: RequestInit = {
      method: request.method,
      headers: proxyHeaders,
    };

    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const body = await request.text();
        if (body) {
          proxyOptions.body = body;
        }
      } catch (error) {
        console.error('读取请求体失败:', error);
      }
    }

    const response = await fetch(targetUrl, proxyOptions);

    if (response.status === 401) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', url.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const isSSE = request.headers.get('accept')?.includes('text/event-stream') ||
      response.headers.get('content-type')?.includes('text/event-stream');

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    if (isSSE && response.body) {
      console.log('🍆 SSE 流式代理转发');

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('代理请求失败:', error);

    return new NextResponse(
      JSON.stringify({
        error: '服务暂时不可用，请稍后重试',
        message: error instanceof Error ? error.message : '未知错误'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}