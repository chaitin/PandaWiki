export const CHAT_TOP_N_STORAGE_KEY = 'panda_wiki_chat_top_n';

export const DEFAULT_CHAT_TOP_N = 10;

const MIN = 1;
const MAX = 10;

export function parseValidChatTopN(value: unknown): number | null {
  const n =
    typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  if (Number.isNaN(n) || n < MIN || n > MAX) return null;
  return n;
}

/** 从 localStorage 读取已保存的 Top N，无效或缺失时返回默认值 */
export function getInitialChatTopN(): number {
  if (typeof window === 'undefined') return DEFAULT_CHAT_TOP_N;
  const parsed = parseValidChatTopN(
    localStorage.getItem(CHAT_TOP_N_STORAGE_KEY),
  );
  return parsed ?? DEFAULT_CHAT_TOP_N;
}

export function persistChatTopN(n: number): void {
  if (typeof window === 'undefined') return;
  const parsed = parseValidChatTopN(n);
  if (parsed == null) return;
  localStorage.setItem(CHAT_TOP_N_STORAGE_KEY, String(parsed));
}
