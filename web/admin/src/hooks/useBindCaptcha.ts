/* eslint-disable @typescript-eslint/no-explicit-any */
import { Message } from 'ct-mui';
import { useEffect, useRef, useState } from 'react';

export function useBindCaptcha(
  id: string,
  {
    init = false,
    businessId = '0195ea3c-ab47-73f3-9f8e-e72b8fd7f089',
  }: { init: boolean; businessId?: string },
) {
  const captcha = useRef<any>({});
  const resolveRef = useRef<any>(null);
  const [load, setLoad] = useState(false);
  const [token, setToken] = useState<string>();

  const initCaptcha = () => {
    captcha.current = new (window as any).SCaptcha({
      businessid: businessId,
      action: 'pow',
      position: 'mask',
    });
    captcha.current!.bind(
      ('#' + id).replace(/:/g, '\\:'),
      (action: any, data: any) => {
        if (action === 'finished') {
          captcha.current.reset();
          if (data) {
            setToken(data);
            resolveRef.current(data);
          } else {
            Message.error('验证失败');
          }
        }
      },
    );
    const oldStart = captcha.current.start.bind(captcha.current);
    captcha.current.start = (e: any) => {
      oldStart(e);
      return new Promise(resolve => {
        resolveRef.current = resolve;
      });
    };
  };

  const loadCaptcha = () => {
    const script = document.createElement('script');
    script.src =
      'https://0195ea3c-ab47-73f3-9f8e-e72b8fd7f089.safepoint.s-captcha-r1.com/v1/static/web.js';
    document.body.appendChild(script);
    script.onload = () => {
      setLoad(true);
    };
  };

  useEffect(() => {
    if (init) {
      if (!load) {
        loadCaptcha();
      } else {
        initCaptcha();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init, load]);

  return [captcha, token] as [any, string];
}
