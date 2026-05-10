export type QaAppMode = 'training' | 'work';

/** 同页内切换模式时通知问答弹窗等订阅方更新样式 */
export const QA_APP_MODE_CHANGE_EVENT = 'panda-wiki:qa-app-mode';

export const CHAT_QA_MODE_STORAGE_KEY = 'panda_wiki_qa_app_mode';

export const DEFAULT_QA_APP_MODE: QaAppMode = 'training';

export function parseValidQaAppMode(value: unknown): QaAppMode | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (s === 'training' || s === 'work') return s;
  return null;
}

export function getInitialQaAppMode(): QaAppMode {
  if (typeof window === 'undefined') return DEFAULT_QA_APP_MODE;
  return (
    parseValidQaAppMode(localStorage.getItem(CHAT_QA_MODE_STORAGE_KEY)) ??
    DEFAULT_QA_APP_MODE
  );
}

export function persistQaAppMode(mode: QaAppMode): void {
  if (typeof window === 'undefined') return;
  if (parseValidQaAppMode(mode) == null) return;
  localStorage.setItem(CHAT_QA_MODE_STORAGE_KEY, mode);
  window.dispatchEvent(
    new CustomEvent<QaAppMode>(QA_APP_MODE_CHANGE_EVENT, { detail: mode }),
  );
}
