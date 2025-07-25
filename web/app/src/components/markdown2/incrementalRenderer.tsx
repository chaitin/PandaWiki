/**
 * 增量渲染器 - 只更新变化的DOM部分以避免闪烁
 */

interface DiffResult {
  type: 'add' | 'remove' | 'modify' | 'same';
  element?: Element;
  newHtml?: string;
  index: number;
}

/**
 * 简单的HTML差异检测
 */
function findHtmlDiffs(
  oldHtml: string,
  newHtml: string
): { shouldUpdate: boolean; diffs: DiffResult[] } {
  // 如果完全相同，不需要更新
  if (oldHtml === newHtml) {
    return { shouldUpdate: false, diffs: [] };
  }

  // 对于复杂的差异检测，这里使用简化版本
  // 在实际项目中，可以使用更复杂的算法如 Myers diff 或 virtual DOM diff

  const oldLength = oldHtml.length;
  const newLength = newHtml.length;

  // 如果新内容更长，说明有新增内容
  if (newLength > oldLength && newHtml.startsWith(oldHtml)) {
    return {
      shouldUpdate: true,
      diffs: [
        {
          type: 'add',
          newHtml: newHtml.slice(oldLength),
          index: oldLength,
        },
      ],
    };
  }

  // 否则进行完整更新
  return {
    shouldUpdate: true,
    diffs: [
      {
        type: 'modify',
        newHtml: newHtml,
        index: 0,
      },
    ],
  };
}

/**
 * 主要的增量渲染函数
 */
export function incrementalRender(
  container: HTMLElement,
  newHtml: string,
  oldContent: string
): void {
  if (!container) return;

  const oldHtml = container.innerHTML;
  const diffs = findHtmlDiffs(oldHtml, newHtml);

  if (!diffs.shouldUpdate) {
    return;
  }

  try {
    // 对于简单的追加情况
    if (diffs.diffs.length === 1 && diffs.diffs[0].type === 'add') {
      const diff = diffs.diffs[0];
      if (diff.newHtml) {
        // 创建临时容器解析新HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = diff.newHtml;

        // 将新元素追加到容器
        while (tempDiv.firstChild) {
          container.appendChild(tempDiv.firstChild);
        }
      }
    } else {
      // 完整更新
      container.innerHTML = newHtml;
    }
  } catch (error) {
    console.error('增量渲染错误:', error);
    // 降级到完整渲染
    container.innerHTML = newHtml;
  }
}
