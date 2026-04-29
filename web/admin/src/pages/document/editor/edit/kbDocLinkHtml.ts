/** 与 @ctzhian/tiptap 内联链接 parseHTML 一致（type="icon"） */

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function buildInlineDocLinkHtml(href: string, title: string) {
  return `<a href="${escapeAttr(href)}" type="icon" target="_blank" rel="noopener noreferrer nofollow" title="${escapeAttr(title)}">${escapeHtml(title)}</a>`;
}
