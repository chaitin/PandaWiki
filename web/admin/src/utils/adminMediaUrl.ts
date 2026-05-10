/** 将站内相对资源路径解析为带后台 basename 的完整 URL */
export function adminMediaUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const base = typeof window !== 'undefined' ? window.__BASENAME__ || '' : '';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (base && normalized.startsWith(base)) return normalized;
  return `${base}${normalized}`;
}
