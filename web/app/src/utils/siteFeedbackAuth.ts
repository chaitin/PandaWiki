import type { GithubComChaitinPandaWikiProApiShareV1AuthInfoResp } from '@/request/pro/types';

import { isAuthInfoEmpty } from '@/utils/authInfo';

/** 与 LoginModal 简单口令成功后的展示名一致；此类会话无 auths.user_id，不能提交站点反馈 */
export const SITE_FEEDBACK_SIMPLE_GATE_USERNAME = '访客';

/** 未登录，或仅为简单访问口令（无账号身份） */
export function lacksAccountIdentityForSiteFeedback(
  authInfo?: GithubComChaitinPandaWikiProApiShareV1AuthInfoResp | null,
): boolean {
  if (isAuthInfoEmpty(authInfo)) return true;
  return (authInfo?.username ?? '') === SITE_FEEDBACK_SIMPLE_GATE_USERNAME;
}
