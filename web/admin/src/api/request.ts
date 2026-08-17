import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { message } from '@ctzhian/ui';

type BasicResponse<T> = {
  data: T;
  success: boolean;
  message: string;
};

type ErrorResponse = {
  data: unknown;
  success: boolean;
  message: string;
};

type Response<T> = BasicResponse<T> | ErrorResponse;

const request = <T>(options: AxiosRequestConfig): Promise<T> => {
  const token = localStorage.getItem('panda_wiki_token') || '';
  const config = {
    baseURL: window.__BASENAME__ || '/',
    timeout: 0,
    withCredentials: true,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const service: AxiosInstance = axios.create(config);
  service.interceptors.response.use(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    (response: AxiosResponse<Response<T>>) => {
      if (response.status === 200) {
        const res = response.data;
        // 兼容 Go 后端（统一包装 {success, data, message}）和 Java 后端（直接返回数据）
        if (res && typeof res.success === 'boolean') {
          if (res.success) {
            return res.data;
          }
          message.error(res.message || '网络异常');
          return Promise.reject(res);
        }
        return res;
      }
      message.error(response.statusText);
      return Promise.reject(response);
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        window.location.href = window.__BASENAME__ + '/login';
        localStorage.removeItem('panda_wiki_token');
      }
      message.error(error.response?.statusText || '网络异常');
      return Promise.reject(error.response);
    },
  );

  return service(options);
};

export default request;
