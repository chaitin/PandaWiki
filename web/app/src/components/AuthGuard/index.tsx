'use client';

import { useStore } from '@/provider';
import { useBasePath } from '@/hooks';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { isAuthInfoEmpty } from '@/utils/authInfo';

const LOGIN_PATH = '/auth/login';

function normalizePath(p: string | null): string {
  if (!p || p === '') return '/';
  const t = p.replace(/\/$/, '') || '/';
  return t;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authInfo } = useStore();
  const basePath = useBasePath();
  const pathname = usePathname();
  const router = useRouter();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const publicPaths = useMemo(
    () => new Set<string>(['/', '/home', '/welcome']),
    [],
  );

  // 等 StoreProvider 从 localStorage 读完 authInfo 后再做跳转判断
  useEffect(() => {
    const t = setTimeout(() => setHasCheckedAuth(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hasCheckedAuth) return;

    const isLoginPage =
      pathname === LOGIN_PATH || pathname?.endsWith(LOGIN_PATH);
    const isEmptyAuth = isAuthInfoEmpty(authInfo);
    const pathKey = normalizePath(pathname);
    const isPublicLanding = publicPaths.has(pathKey);

    if (!isLoginPage && !isPublicLanding && isEmptyAuth) {
      const loginUrl = basePath ? `${basePath}${LOGIN_PATH}` : LOGIN_PATH;
      const redirect = encodeURIComponent(pathname || '/');
      router.replace(`${loginUrl}?redirect=${redirect}`);
    }
  }, [hasCheckedAuth, authInfo, pathname, basePath, router]);

  return <>{children}</>;
}
