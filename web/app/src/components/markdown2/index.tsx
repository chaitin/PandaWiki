'use client';

import { useSmartScroll } from '@/hooks';
import { copyText } from '@/utils';
import { getImagePath } from '@/utils/getImagePath';
import { Box, Dialog, useTheme } from '@mui/material';
import mk from '@vscode/markdown-it-katex';
import hljs from 'highlight.js';
import 'highlight.js/styles/an-old-hope.css';
import 'katex/dist/katex.min.css';
import MarkdownIt from 'markdown-it';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { clearImageBlobCache, createImageRenderer } from './imageRenderer';
import { incrementalRender } from './incrementalRenderer';
import { createMermaidRenderer } from './mermaidRenderer';
import {
  processThinkingContent,
  useThinkingRenderer,
} from './thinkingRenderer';

// ==================== 类型定义 ====================
interface MarkDown2Props {
  loading?: boolean;
  content: string;
  autoScroll?: boolean;
}

// ==================== 工具函数 ====================
/**
 * 创建 MarkdownIt 实例
 */
const createMarkdownIt = (): MarkdownIt => {
  const md = new MarkdownIt({
    html: true,
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
    // 由于 @vscode/markdown-it-katex 和 markdown-it 类型版本不一致，这里通过 any 断言绕过类型不兼容
    (md as any).use(mk as any);
  } catch (error) {
    console.warn('markdown-it-katex not available:', error);
  }

  return md;
};

// ==================== 主组件 ====================
const MarkDown2: React.FC<MarkDown2Props> = ({
  loading = false,
  content,
  autoScroll = true,
}) => {
  const theme = useTheme();
  const themeMode = theme.palette.mode;

  // 状态管理
  const [showThink, setShowThink] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImgBlobUrl, setPreviewImgBlobUrl] = useState('');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<string>('');
  const mdRef = useRef<MarkdownIt | null>(null);
  const mermaidSuccessIdRef = useRef<Map<number, string>>(new Map());
  const imageRenderCacheRef = useRef<Map<number, string>>(new Map()); // 图片渲染缓存（HTML）
  const imageBlobCacheRef = useRef<Map<string, string>>(new Map()); // 图片 blob URL 缓存

  // 使用智能滚动 hook
  const { scrollToBottom } = useSmartScroll({
    container: '.conversation-container',
    threshold: 50, // 距离底部 50px 内认为是在底部附近
    behavior: 'smooth',
    enabled: autoScroll,
  });

  const handleThinkToggle = useCallback(() => {
    setShowThink(prev => !prev);
  }, []);

  // ==================== 渲染器函数 ====================
  /**
   * 处理图片加载成功
   */
  const handleImageLoad = useCallback((index: number, html: string) => {
    imageRenderCacheRef.current.set(index, html);
    // 图片加载完成后，useSmartScroll 的 ResizeObserver 会自动触发滚动
  }, []);

  /**
   * 处理图片加载失败
   */
  const handleImageError = useCallback((index: number, html: string) => {
    imageRenderCacheRef.current.set(index, html);
    // 图片加载失败后，useSmartScroll 的 ResizeObserver 会自动触发滚动
  }, []);

  // 创建图片渲染器
  const renderImage = useMemo(
    () =>
      createImageRenderer({
        onImageLoad: handleImageLoad,
        onImageError: handleImageError,
        imageRenderCache: imageRenderCacheRef.current,
        imageBlobCache: imageBlobCacheRef.current,
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
      let htmlImageCount = 0; // HTML 标签图片计数
      let mermaidCount = 0;
      md.renderer.rules.image = (tokens, idx) => {
        imageCount++;
        const token = tokens[idx];
        const src = getImagePath(token.attrGet('src') || '');
        const alt = token.attrGet('alt') || token.content;
        const rawAttrs = token.attrs || [];
        // 过滤潜在危险属性（如 onload/onerror 等事件处理）
        const safeAttrs = rawAttrs.filter(([name]) => {
          const lower = name.toLowerCase();
          // 屏蔽所有以 on 开头的属性，例如 onload/onerror/onclick 等
          if (lower.startsWith('on')) return false;
          return true;
        });
        return renderImage(src, alt, safeAttrs, imageCount - 1);
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

        return result;
      };

      // 处理行内代码
      md.renderer.rules.code_inline = (tokens, idx) => {
        const token = tokens[idx];
        const code = token.content;
        // 对行内代码内容做 HTML 转义，避免 `<svg onload=...>` 等被当成真正标签解析
        const safeCode = md.utils.escapeHtml(code);
        return `<code  style="cursor: pointer;">${safeCode}</code>`;
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

        // HTML 白名单 - 只允许这些标签通过
        const allowedTags = ['think', 'error'];

        // 用于跟踪thinking状态
        let isInThinking = false;
        let thinkingContent = '';

        // 检查是否是允许的标签
        const isAllowedTag = (content: string): boolean => {
          return allowedTags.some(
            tag =>
              content.includes(`<${tag}>`) || content.includes(`</${tag}>`),
          );
        };

        // 解析 HTML img 标签并提取属性
        const parseImgTag = (
          html: string,
        ): {
          src: string;
          alt: string;
          attrs: [string, string][];
        } | null => {
          // 匹配 <img> 标签（支持自闭合和普通标签）
          const imgMatch = html.match(/<img\s+([^>]*?)\/?>/i);
          if (!imgMatch) return null;

          const attrsString = imgMatch[1];
          const attrs: [string, string][] = [];
          let src = '';
          let alt = '';

          // 解析属性：匹配 name="value" 或 name='value' 或 name=value
          const attrRegex =
            /([^\s=]+)(?:=["']([^"']*)["']|=(?:["'])?([^\s>]+)(?:["'])?)?/g;
          let attrMatch;
          while ((attrMatch = attrRegex.exec(attrsString)) !== null) {
            const name = attrMatch[1].toLowerCase();
            const value = attrMatch[2] || attrMatch[3] || '';
            // 过滤所有事件处理属性（onload/onerror/onclick 等）
            if (name.startsWith('on')) {
              continue;
            }
            attrs.push([name, value]);
            if (name === 'src') src = getImagePath(value);
            if (name === 'alt') alt = value;
          }

          return { src, alt, attrs };
        };

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

          // 处理 img 标签
          if (content.includes('<img')) {
            const imgData = parseImgTag(content);
            if (imgData && imgData.src) {
              const imageIndex = imageCount + htmlImageCount;
              htmlImageCount++;
              return renderImage(
                imgData.src,
                imgData.alt,
                imgData.attrs,
                imageIndex,
              );
            }
          }

          // 🔒 安全检查：不在白名单的标签，转义输出
          if (!isAllowedTag(content)) {
            return md.utils.escapeHtml(content);
          }

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

          // 处理 img 标签
          if (content.includes('<img')) {
            const imgData = parseImgTag(content);
            if (imgData && imgData.src) {
              const imageIndex = imageCount + htmlImageCount;
              htmlImageCount++;
              return renderImage(
                imgData.src,
                imgData.alt,
                imgData.attrs,
                imageIndex,
              );
            }
          }

          // 🔒 安全检查：不在白名单的标签，转义输出
          if (!isAllowedTag(content)) {
            return md.utils.escapeHtml(content);
          }

          return originalHtmlInline
            ? originalHtmlInline(tokens, idx, options, env, renderer)
            : content;
        };
      };

      setupCustomHtmlHandlers();
    },
    [renderImage, renderMermaid, renderThinking, theme],
  );

  // ==================== Effects ====================
  // 初始化 MarkdownIt
  useEffect(() => {
    if (!mdRef.current) {
      mdRef.current = createMarkdownIt();
    }
  }, []);

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
      scrollToBottom();
    } catch (error) {
      console.error('Markdown 渲染错误:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div>Markdown 渲染错误</div>';
      }
    }
  }, [content, customizeRenderer, scrollToBottom]);

  // 添加代码块点击复制和图片点击预览功能（事件代理）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // 检查是否点击了图片
      const imgElement = target.closest(
        'img.markdown-image',
      ) as HTMLImageElement;
      if (imgElement) {
        const originalSrc = imgElement.getAttribute('data-original-src');
        if (originalSrc) {
          // 尝试获取缓存的 blob URL，如果不存在则使用原始 src
          const blobUrl = imageBlobCacheRef.current.get(originalSrc);
          setPreviewImgBlobUrl(blobUrl || originalSrc);
          setPreviewOpen(true);
        }
        return;
      }

      // 检查是否点击了代码块
      const preElement = target.closest('pre.hljs');
      if (preElement) {
        const codeElement = preElement.querySelector('code');
        if (codeElement) {
          const code = codeElement.textContent || '';
          copyText(code.replace(/\n$/, ''));
        }
        return;
      }

      // 检查是否点击了行内代码
      if (target.tagName === 'CODE' && !target.closest('pre')) {
        const code = target.textContent || '';
        copyText(code);
      }
    };

    container.addEventListener('click', handleClick);

    return () => {
      clearImageBlobCache(imageBlobCacheRef.current);
      container.removeEventListener('click', handleClick);
    };
  }, []);

  // ==================== 组件样式 ====================
  const componentStyles = {
    fontSize: '14px',
    background: 'transparent',
    '--primary-color': theme.palette.primary.main,
    '--background-paper': theme.palette.background.paper3,

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
    '.markdown-image': {
      cursor: 'pointer',
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
    <>
      {/* 图片预览弹窗 */}
      <Dialog
        sx={{
          '.MuiDialog-paper': {
            maxWidth: '95vw',
            maxHeight: '95vh',
          },
        }}
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewImgBlobUrl('');
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewImgBlobUrl}
          alt='preview'
          style={{ width: '100%', height: '100%' }}
        />
      </Dialog>
      <Box
        className={`markdown-body ${themeMode === 'dark' ? 'md-dark' : ''}`}
        sx={componentStyles}
      >
        <div ref={containerRef} />
      </Box>
    </>
  );
};

export default MarkDown2;
