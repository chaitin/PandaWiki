'use client';

import { useStore } from '@/provider';
import { useBasePath } from '@/hooks';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const LOGIN_PATH = '/auth/login';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authInfo } = useStore();
  const basePath = useBasePath();
  const pathname = usePathname();
  const router = useRouter();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // 等 StoreProvider 从 localStorage 读完 authInfo 后再做跳转判断
  useEffect(() => {
    const t = setTimeout(() => setHasCheckedAuth(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hasCheckedAuth) return;

    const isLoginPage =
      pathname === LOGIN_PATH || pathname?.endsWith(LOGIN_PATH);
    const isEmptyAuth =
      authInfo == null ||
      (typeof authInfo === 'object' && Object.keys(authInfo).length === 0);

    if (!isLoginPage && isEmptyAuth) {
      const loginUrl = basePath ? `${basePath}${LOGIN_PATH}` : LOGIN_PATH;
      const redirect = encodeURIComponent(pathname || '/');
      router.replace(`${loginUrl}?redirect=${redirect}`);
    }
  }, [hasCheckedAuth, authInfo, pathname, basePath, router]);

  return <>{children}</>;
}
