'use client';

import { useStore } from '@/provider';
import { addOpacityToColor, copyText } from '@/utils';
import { Box, useTheme } from '@mui/material';
import 'katex/dist/katex.min.css';
import mk from '@vscode/markdown-it-katex';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/an-old-hope.css';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { incrementalRender } from './incrementalRenderer';
import { createImageRenderer } from './imageRenderer';
import {
  useThinkingRenderer,
  processThinkingContent,
} from './thinkingRenderer';
import { createMermaidRenderer } from './mermaidRenderer';

// ==================== 类型定义 ====================
interface MarkDown2Props {
  loading?: boolean;
  content: string;
}

// ==================== 工具函数 ====================
/**
 * 创建 MarkdownIt 实例
 */
const createMarkdownIt = (): MarkdownIt => {
  const md = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
    typographer: true,
    highlight: (str: string, lang: string): string => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(str, { language: lang });
          return `<pre class="hljs" style="cursor: pointer;"><code class="language-${lang}">${highlighted.value}</code></pre>`;
        } catch {
          // 处理高亮失败的情况
        }
      }
      return `<pre class="hljs" style="cursor: pointer;"><code>${md.utils.escapeHtml(
        str,
      )}</code></pre>`;
    },
  });

  // 添加 KaTeX 数学公式支持
  try {
    md.use(mk);
  } catch (error) {
    console.warn('markdown-it-katex not available:', error);
  }

  return md;
};

// ==================== 主组件 ====================
const MarkDown2: React.FC<MarkDown2Props> = ({ loading = false, content }) => {
  const theme = useTheme();
  const { themeMode = 'light' } = useStore();

  // 状态管理
  const [showThink, setShowThink] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<string>('');
  const mdRef = useRef<MarkdownIt | null>(null);
  const mermaidSuccessIdRef = useRef<Map<number, string>>(new Map());
  const imageRenderCacheRef = useRef<Map<number, string>>(new Map()); // 图片渲染缓存

  // ==================== 事件处理函数 ====================
  const handleCodeClick = useCallback((code: string) => {
    copyText(code);
  }, []);

  const handleThinkToggle = useCallback(() => {
    setShowThink(prev => !prev);
  }, []);

  const onScrollBottom = useCallback(() => {
    setTimeout(() => {
      const container = document.querySelector('.conversation-container');
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    });
  }, []);

  // ==================== 渲染器函数 ====================
  /**
   * 处理图片加载成功
   */
  const handleImageLoad = useCallback((index: number, html: string) => {
    imageRenderCacheRef.current.set(index, html);
  }, []);

  /**
   * 处理图片加载失败
   */
  const handleImageError = useCallback((index: number, html: string) => {
    imageRenderCacheRef.current.set(index, html);
  }, []);

  // 创建图片渲染器
  const renderImage = useMemo(
    () =>
      createImageRenderer({
        onImageLoad: handleImageLoad,
        onImageError: handleImageError,
        imageRenderCache: imageRenderCacheRef.current,
      }),
    [handleImageLoad, handleImageError],
  );

  // 创建thinking渲染器
  const renderThinking = useThinkingRenderer({
    showThink,
    onToggle: handleThinkToggle,
    loading,
  });

  // 创建mermaid渲染器
  const renderMermaid = useMemo(
    () => createMermaidRenderer(mermaidSuccessIdRef),
    [],
  );

  // ==================== 渲染器自定义 ====================
  /**
   * 自定义 MarkdownIt 渲染器
   */
  const customizeRenderer = useCallback(
    (md: MarkdownIt) => {
      const originalFenceRender = md.renderer.rules.fence;
      // 自定义图片渲染
      let imageCount = 0;
      let mermaidCount = 0;
      md.renderer.rules.image = (tokens, idx) => {
        imageCount++;
        const token = tokens[idx];
        const src = token.attrGet('src') || '';
        const alt = token.attrGet('alt') || token.content;
        const attrs = token.attrs || [];
        return renderImage(src, alt, attrs, imageCount - 1);
      };

      // 自定义代码块渲染
      md.renderer.rules.fence = (tokens, idx, options, env, renderer) => {
        const token = tokens[idx];
        const info = token.info.trim();
        const code = token.content;

        if (info === 'mermaid') {
          mermaidCount++;
          return renderMermaid(code, mermaidCount);
        }

        const defaultRender = originalFenceRender || md.renderer.rules.fence;
        const result = defaultRender
          ? defaultRender(tokens, idx, options, env, renderer)
          : `<pre><code>${code}</code></pre>`;

        // 添加点击复制功能
        // result = result.replace(
        //   /<pre[^>]*>/,
        //   `<pre style="cursor: pointer; position: relative;" onclick="window.handleCodeCopy && window.handleCodeCopy(\`${code.replace(
        //     /`/g,
        //     '\\`'
        //   )}\`)">`
        // );

        return result;
      };

      // 处理行内代码
      md.renderer.rules.code_inline = (tokens, idx) => {
        const token = tokens[idx];
        const code = token.content;
        return `<code onclick="window.handleCodeCopy && window.handleCodeCopy('${code}')" style="cursor: pointer;">${code}</code>`;
      };

      // 自定义标题渲染（h1 -> h2）
      md.renderer.rules.heading_open = (tokens, idx) => {
        const token = tokens[idx];
        if (token.tag === 'h1') {
          token.tag = 'h2';
        }
        return `<${token.tag}>`;
      };

      md.renderer.rules.heading_close = (tokens, idx) => {
        const token = tokens[idx];
        return `</${token.tag}>`;
      };

      // 自定义链接渲染
      md.renderer.rules.link_open = (tokens, idx) => {
        const token = tokens[idx];
        const hrefIndex = token.attrIndex('href');
        const href = hrefIndex >= 0 ? token.attrs![hrefIndex][1] : '';

        token.attrSet('target', '_blank');
        token.attrSet('rel', 'noopener noreferrer');

        return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: ${theme.palette.primary.main}; text-decoration: underline;">`;
      };

      // 处理自定义 HTML 标签
      const setupCustomHtmlHandlers = () => {
        const originalHtmlBlock = md.renderer.rules.html_block;
        const originalHtmlInline = md.renderer.rules.html_inline;

        // 用于跟踪thinking状态
        let isInThinking = false;
        let thinkingContent = '';

        md.renderer.rules.html_block = (
          tokens,
          idx,
          options,
          env,
          renderer,
        ) => {
          const token = tokens[idx];
          const content = token.content;

          // 处理 think 标签开始
          if (content.includes('<think>')) {
            isInThinking = true;
            thinkingContent = '';
            return ''; // 不输出任何内容，开始收集
          }

          // 处理 think 标签结束
          if (content.includes('</think>')) {
            if (isInThinking) {
              isInThinking = false;
              const renderedThinking = renderThinking(thinkingContent.trim());
              thinkingContent = '';
              return renderedThinking;
            }
            return '';
          }

          // 如果在thinking标签内，收集内容
          if (isInThinking) {
            thinkingContent += content;
            return '';
          }

          // 处理 error 标签
          if (content.includes('<error>')) return '<span class="chat-error">';
          if (content.includes('</error>')) return '</span>';

          return originalHtmlBlock
            ? originalHtmlBlock(tokens, idx, options, env, renderer)
            : content;
        };

        md.renderer.rules.html_inline = (
          tokens,
          idx,
          options,
          env,
          renderer,
        ) => {
          const token = tokens[idx];
          const content = token.content;

          if (content.includes('<error>')) return '<span class="chat-error">';
          if (content.includes('</error>')) return '</span>';

          return originalHtmlInline
            ? originalHtmlInline(tokens, idx, options, env, renderer)
            : content;
        };
      };

      setupCustomHtmlHandlers();
    },
    [renderImage, renderMermaid, renderThinking, showThink, theme],
  );

  // ==================== Effects ====================
  // 初始化 MarkdownIt
  useEffect(() => {
    if (!mdRef.current) {
      mdRef.current = createMarkdownIt();
    }
  }, []);

  // 设置全局函数
  useEffect(() => {
    (window as any).handleCodeCopy = handleCodeClick;

    return () => {
      delete (window as any).handleCodeCopy;
    };
  }, [handleCodeClick]);

  // 主要的内容渲染 Effect
  useEffect(() => {
    if (!containerRef.current || !mdRef.current || !content) return;

    // 处理 think 标签格式
    const processedContent = processThinkingContent(content);

    // 检查内容变化
    if (processedContent === lastContentRef.current) return;

    customizeRenderer(mdRef.current);

    try {
      // 渲染markdown（thinking标签在renderer rules中直接处理）
      const newHtml = mdRef.current.render(processedContent);

      incrementalRender(containerRef.current, newHtml, lastContentRef.current);
      lastContentRef.current = processedContent;
      onScrollBottom();
    } catch (error) {
      console.error('Markdown 渲染错误:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div>Markdown 渲染错误</div>';
      }
    }
  }, [content, customizeRenderer, onScrollBottom]);

  // ==================== 组件样式 ====================
  const componentStyles = {
    fontSize: '14px',
    background: 'transparent',
    '--primary-color': theme.palette.primary.main,
    '--background-paper': theme.palette.background.paper,

    // 省略号样式
    '.three-ellipsis': {
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 3,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },

    // 图片和 Mermaid 样式
    '.image-container': {
      position: 'relative',
      display: 'inline-block',
    },
    '.image-error': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100px',
      color: '#999',
      fontSize: '14px',
    },
    '.mermaid-loading': {
      textAlign: 'center',
      padding: '20px',
      color: 'text.secondary',
      fontSize: '14px',
    },

    // LaTeX 样式
    '.katex': {
      display: 'inline-block',
      fontSize: '1em',
      lineHeight: '1.2',
      color: 'text.primary',
    },
    '.katex-display': {
      textAlign: 'center',
      margin: '1em 0',
      overflow: 'auto',
      '& > .katex': {
        display: 'block',
        fontSize: '1.1em',
        color: 'text.primary',
      },
    },

    // 暗色主题下的 LaTeX 样式
    ...(themeMode === 'dark' && {
      '.katex, .katex *, .katex .mord, .katex .mrel, .katex .mop, .katex .mbin, .katex .mpunct, .katex .mopen, .katex .mclose, .katex-display':
        {
          color: `${theme.palette.text.primary} !important`,
        },
    }),
  };

  // ==================== 渲染 ====================
  return (
    <Box
      className={`markdown-body ${themeMode === 'dark' ? 'md-dark' : ''}`}
      sx={componentStyles}
    >
      <div ref={containerRef} />
    </Box>
  );
};

export default MarkDown2;
