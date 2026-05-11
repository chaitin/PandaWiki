export interface WorkModeClarifyMeta {
  category: string;
  candidates: number;
  missing: string[];
}

const WORK_MODE_CLARIFY_REGEX =
  /<!--\s*WORK_MODE_CLARIFY\s+(\{[\s\S]*?\})\s*-->\s*\n?/;

export function extractWorkModeClarify(content: string): {
  meta: WorkModeClarifyMeta | null;
  text: string;
} {
  if (!content) return { meta: null, text: '' };
  const match = content.match(WORK_MODE_CLARIFY_REGEX);
  if (!match) return { meta: null, text: content };
  try {
    const parsed = JSON.parse(match[1]);
    const meta: WorkModeClarifyMeta = {
      category: typeof parsed.category === 'string' ? parsed.category : '',
      candidates: typeof parsed.candidates === 'number' ? parsed.candidates : 0,
      missing: Array.isArray(parsed.missing)
        ? parsed.missing.filter((s: unknown) => typeof s === 'string')
        : [],
    };
    return { meta, text: content.replace(match[0], '') };
  } catch {
    return { meta: null, text: content.replace(match[0], '') };
  }
}

/** 若含工作模式追问标记，则清空整条助手回复（标记 + 追问正文）；否则返回 null 表示无需处理 */
export function removeWorkModeClarifyFromAnswer(
  content: string,
): string | null {
  if (!content) return null;
  if (!WORK_MODE_CLARIFY_REGEX.test(content)) return null;
  return '';
}
