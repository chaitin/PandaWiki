/** 与根 layout 注入的 window.__KB_ID__、以及 kbDetail 上的 id/kb_id 对齐 */
export function getResolvedKbId(kbDetail: unknown): string {
  const d = kbDetail as { id?: string; kb_id?: string } | null | undefined;
  const fromDetail = (d?.id || d?.kb_id || '').trim();
  if (fromDetail) return fromDetail;
  if (typeof window !== 'undefined') {
    const w = String(
      (window as unknown as { __KB_ID__?: string }).__KB_ID__ || '',
    ).trim();
    if (w) return w;
  }
  return '';
}
