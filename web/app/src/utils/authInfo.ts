import type { GithubComChaitinPandaWikiProApiShareV1AuthInfoResp } from '@/request/pro/types';

export function isAuthInfoEmpty(
  authInfo?: GithubComChaitinPandaWikiProApiShareV1AuthInfoResp | null,
): boolean {
  if (authInfo == null) return true;
  if (typeof authInfo !== 'object') return true;
  return Object.keys(authInfo).length === 0;
}
