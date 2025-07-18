import { KBDetail, NodeDetail, NodeListItem, WidgetInfo } from '@/assets/type';
import { getServerHeader } from '@/utils/getServerHeader';

interface ApiClientConfig {
  kb_id?: string;
  headers?: Record<string, string>;
  cache?: RequestCache;
  authToken?: string;
  session?: string;
}

interface Response<T> {
  data?: T;
  status: number;
  message?: string;
  success?: boolean;
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.TARGET || '';
  }

  // 服务端专用方法 - 带cookie的请求
  async request<T>(
    url: string,
    options: RequestInit = {},
    config: ApiClientConfig = {}
  ): Promise<Response<T>> {
    const { kb_id = '', headers = {}, cache, authToken, session } = config;
    let serverHeader = {};
    if (typeof window === 'undefined') {
      serverHeader = await getServerHeader();
    }
    const requestHeaders: Record<string, string> = {
      ...serverHeader,
      'Content-Type': 'application/json',
      'x-kb-id': kb_id,
      ...headers,
    };

    if (session) requestHeaders['x-pw-session-id'] = session;
    if (authToken) requestHeaders['x-simple-auth-password'] = authToken;

    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: requestHeaders,
        ...(cache && { cache }),
      });
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return {
          status: response.status,
          message: `HTTP error! status: ${response.status}`,
        };
      }
      const result = await response.json();
      if (result.success === false) {
        console.error(result.message);
      }
      return { ...result, status: response.status };
    } catch (error) {
      return {
        status: 500,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // 服务端获取知识库信息
  async serverGetKBInfo(
    kb_id: string,
    authToken?: string
  ): Promise<Response<KBDetail>> {
    return this.request(
      `/share/v1/app/web/info`,
      {
        method: 'GET',
      },
      {
        kb_id,
        authToken,
        cache: 'no-store',
      }
    );
  }

  async serverGetWidgetInfo(kb_id: string): Promise<Response<WidgetInfo>> {
    return this.request(
      `/share/v1/app/widget/info`,
      {
        method: 'GET',
      },
      {
        kb_id,
        cache: 'no-store',
      }
    );
  }

  // 服务端获取节点列表
  async serverGetNodeList(
    kb_id: string,
    authToken?: string
  ): Promise<Response<NodeListItem[]>> {
    return this.request(
      `/share/v1/node/list`,
      {
        method: 'GET',
      },
      {
        kb_id,
        authToken,
      }
    );
  }
  // 服务端获取节点列表
  async clientGetNodeList(
    kb_id: string,
    authToken?: string
  ): Promise<Response<NodeListItem[]>> {
    return this.request(
      window?.location.origin + `/client/v1/node/list`,
      {
        method: 'GET',
      },
      {
        kb_id,
        authToken,
      }
    );
  }

  // 服务端获取节点详情
  async serverGetNodeDetail(
    id: string,
    kb_id: string,
    authToken?: string
  ): Promise<Response<NodeDetail>> {
    return this.request(
      `/share/v1/node/detail?id=${id}`,
      {
        method: 'GET',
      },
      {
        kb_id,
        authToken,
      }
    );
  }

  // 客服端请求
  async clientGetNodeDetail(
    id: string,
    kb_id: string,
    authToken?: string
  ): Promise<Response<NodeDetail>> {
    return this.request(
      window?.location.origin + `/client/v1/node/detail?id=${id}`,
      {
        method: 'GET',
      },
      {
        kb_id,
        authToken,
      }
    );
  }

  // 服务端页面埋点
  async serviceStatPage(data: {
    node_id: string;
    scene: number;
    kb_id: string;
    authToken?: string;
    headers?: Record<string, string>;
    session: string;
  }): Promise<Response<void>> {
    return this.request(
      '/share/v1/stat/page',
      {
        method: 'POST',
        body: JSON.stringify({
          node_id: data.node_id,
          scene: data.scene,
        }),
      },
      {
        kb_id: data.kb_id,
        authToken: data.authToken,
        session: data.session,
        headers: data.headers,
      }
    );
  }

  // 客服端页面埋点
  async clientStatPage(data: {
    node_id: string;
    scene: number;
    kb_id: string;
    authToken?: string;
  }): Promise<Response<void>> {
    return this.request(
      window?.location.origin + '/client/v1/stat/page',
      {
        method: 'POST',
        body: JSON.stringify({
          node_id: data.node_id,
          scene: data.scene,
        }),
      },
      {
        kb_id: data.kb_id,
        authToken: data.authToken,
      }
    );
  }

  async clientPostComment(data: {
    content: string;
    node_id: string;
    user_name: string;
    kb_id: string;
  }): Promise<Response<void>> {
    return this.request(
      '/client/v1/comment',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      {
        kb_id: data.kb_id,
        // authToken: data.authToken,
      }
    );
  }

  async clientGetComment(id: string, kb_id: string): Promise<Response<any>> {
    return this.request(
      '/client/v1/comment/list?id=' + id,
      {
        method: 'GET',
      },
      {
        kb_id,
        // authToken: data.authToken,
      }
    );
  }

  // 客服端反馈
  async clientFeedback(data: {
    kb_id: string;
    authToken?: string;
    conversation_id: string;
    message_id: string;
    type: number;
    score: number;
    feedback_content?: string;
  }): Promise<
    Response<{
      success: boolean;
      message: string;
    }>
  > {
    return this.request(
      window?.location.origin + '/client/v1/chat/feedback',
      {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: data.conversation_id,
          message_id: data.message_id,
          type: data.type,
          score: data.score,
          feedback_content: data.feedback_content,
        }),
      },
      {
        kb_id: data.kb_id,
        authToken: data.authToken,
      }
    );
  }
}

export const apiClient = new ApiClient();
