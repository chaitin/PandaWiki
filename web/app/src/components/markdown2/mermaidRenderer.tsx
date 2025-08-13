'use client';

import mermaid from 'mermaid';
import React from 'react';

const MERMAID_CONFIG = {
  startOnLoad: false,
  theme: 'default' as const,
  securityLevel: 'loose' as const,
  fontFamily: 'inherit',
  suppressErrorRendering: true,
};

// ==================== 全局状态 ====================
let isMermaidInitialized = false;

/**
 * 初始化 Mermaid
 */
export const initializeMermaid = (): boolean => {
  if (!isMermaidInitialized) {
    try {
      mermaid.initialize(MERMAID_CONFIG);
      isMermaidInitialized = true;
      return true;
    } catch (error) {
      console.error('Mermaid initialization error:', error);
      return false;
    }
  }
  return true;
};

/**
 * 创建 Mermaid 渲染器
 */
export const createMermaidRenderer = (
  mermaidSuccessIdRef: React.RefObject<Map<number, string>>,
) => {
  return (code: string, mermaidCount: number): string => {
    const svg = mermaidSuccessIdRef.current?.get(mermaidCount) || '';
    const className = `mermaid-container-${mermaidCount}`;
    setTimeout(async () => {
      initializeMermaid();
      try {
        const id = `mermaid-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 9)}`;
        const renderResult = await mermaid.render(id, code);
        mermaidSuccessIdRef.current?.set(mermaidCount, renderResult.svg);
        const mermaidContainer = document.querySelector(`.${className}`);
        mermaidContainer!.innerHTML = renderResult.svg;
      } catch (renderError) {}
    });

    return `<pre><div class="mermaid-container ${className}">${svg}</div></pre>`;
  };
};
