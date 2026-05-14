export interface WorkModeClarifyMeta {
  category: string;
  candidates: number;
  missing: string[];
  /** 跨轮已收集到的属性键值对 */
  collected?: Record<string, string>;
  /** 当前追问轮次（从 1 起） */
  round?: number;
  /** 最大允许追问轮次 */
  max_rounds?: number;
  /** 识别成功时的目标文档 ID；为空表示未识别（仍在追问 / 终态等） */
  identified_doc_id?: string;
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
    const collected =
      parsed.collected && typeof parsed.collected === 'object'
        ? Object.fromEntries(
            Object.entries(parsed.collected).filter(
              ([k, v]) => typeof k === 'string' && typeof v === 'string',
            ),
          )
        : undefined;
    const meta: WorkModeClarifyMeta = {
      category: typeof parsed.category === 'string' ? parsed.category : '',
      candidates: typeof parsed.candidates === 'number' ? parsed.candidates : 0,
      missing: Array.isArray(parsed.missing)
        ? parsed.missing.filter((s: unknown) => typeof s === 'string')
        : [],
      collected,
      round: typeof parsed.round === 'number' ? parsed.round : undefined,
      max_rounds:
        typeof parsed.max_rounds === 'number' ? parsed.max_rounds : undefined,
      identified_doc_id:
        typeof parsed.identified_doc_id === 'string'
          ? parsed.identified_doc_id
          : undefined,
    };
    return { meta, text: content.replace(match[0], '') };
  } catch {
    return { meta: null, text: content.replace(match[0], '') };
  }
}

/** 是否为「识别成功」的 meta（带 identified_doc_id；此时不应清空 assistant 回复） */
export function isWorkModeIdentified(
  meta: WorkModeClarifyMeta | null,
): boolean {
  return !!meta && !!meta.identified_doc_id;
}

/**
 * 若含工作模式追问标记且并非识别终态（identified_doc_id 为空），则清空整条助手回复
 * （标记 + 追问正文）以便由 chip 单独承载；否则返回 null 表示无需清空。
 */
export function removeWorkModeClarifyFromAnswer(
  content: string,
): string | null {
  if (!content) return null;
  const match = content.match(WORK_MODE_CLARIFY_REGEX);
  if (!match) return null;
  // 识别成功的 meta 也带这个 marker，但其后续是真实回答，不应清空
  try {
    const parsed = JSON.parse(match[1]);
    if (
      parsed &&
      typeof parsed.identified_doc_id === 'string' &&
      parsed.identified_doc_id
    ) {
      return null;
    }
  } catch {
    // ignore，按旧行为清空
  }
  return '';
}
