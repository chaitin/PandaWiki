'use client';

import { useStore } from '@/provider';
import { addOpacityToColor, copyText } from '@/utils';
import { Box, Dialog, useTheme } from '@mui/material';
import 'katex/dist/katex.min.css';
import mk from '@vscode/markdown-it-katex';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/an-old-hope.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { incrementalRender } from './incrementalRenderer';
import mermaid from 'mermaid';

// ==================== 常量定义 ====================
const MERMAID_CONFIG = {
  startOnLoad: false,
  theme: 'default' as const,
  securityLevel: 'loose' as const,
  fontFamily: 'inherit',
  suppressErrorRendering: true,
};

const IMAGE_STYLES = {
  BASE: [
    'border-style: none',
    'border-radius: 10px',
    'margin-left: 5px',
    'box-shadow: 0px 0px 3px 1px rgba(0,0,5,0.15)',
    'cursor: pointer',
    'max-width: 60%',
    'box-sizing: content-box',
    'background-color: var(--color-canvas-default)',
  ],
  DEFAULT_SIZE: { width: 'auto', height: 'auto' },
};

const LOADING_MESSAGES = {
  MERMAID_WAITING: '🔄 等待图表代码...',
  MERMAID_INCOMPLETE: '🔄 等待完整的图表代码...',
};

// ==================== 类型定义 ====================
interface MarkDown2Props {
  loading?: boolean;
  content: string;
}

interface ImageAttributes {
  [key: string]: string;
}

interface RenderOptions {
  width?: string;
  height?: string;
  customStyle?: string;
  otherAttrs?: ImageAttributes;
}

// ==================== Mermaid 相关功能 ====================
let isMermaidInitialized = false;

/**
 * 初始化 Mermaid
 */
const initializeMermaid = (): boolean => {
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
 * 渲染 Mermaid 图表（支持渐进式渲染）
 */
const renderMermaidChart = async (
  index: number,
  code: string,
  mermaidSuccessLastRef: React.RefObject<Map<string, string>>,
  mermaidSuccessIdRef: React.RefObject<Map<string, string>>
): Promise<string> => {
  try {
    if (!initializeMermaid()) {
      throw new Error('Mermaid initialization failed');
    }

    if (mermaidSuccessIdRef.current.has(code)) {
      return '';
    }

    const id = `mermaid-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    let svg: string = mermaidSuccessLastRef.current.get(index.toString()) || '';
    try {
      const renderResult = await mermaid.render(id, code);
      svg = renderResult.svg;
      mermaidSuccessLastRef.current.set(index.toString(), svg);
      mermaidSuccessIdRef.current.set(code, svg);
    } catch (renderError) {
      if (!svg) {
        return `<div class="mermaid-loading">${LOADING_MESSAGES.MERMAID_WAITING}</div>`;
      }
    }
    return svg;
  } catch (error) {
    return `<div class="mermaid-progressive" data-status="loading">
      <div class="mermaid-loading">${LOADING_MESSAGES.MERMAID_INCOMPLETE}</div>
    </div>`;
  }
};

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
        str
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

/**
 * 安全的字符串哈希函数
 */
const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(36);
};

/**
 * 安全的 Base64 编码，支持中文
 */
const safeBase64Encode = (str: string): string => {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch {
    return hashString(str);
  }
};

/**
 * 安全的 Base64 解码
 */
const safeBase64Decode = (str: string): string => {
  try {
    return decodeURIComponent(
      atob(str)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return str;
  }
};

// ==================== 主组件 ====================
const MarkDown2: React.FC<MarkDown2Props> = ({ loading = false, content }) => {
  const theme = useTheme();
  const { themeMode = 'light' } = useStore();

  // 状态管理
  const [showThink, setShowThink] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImgSrc, setPreviewImgSrc] = useState('');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<string>('');
  const mdRef = useRef<MarkdownIt | null>(null);
  const mermaidSuccessLastRef = useRef<Map<string, string>>(new Map());
  const mermaidSuccessIdRef = useRef<Map<string, string>>(new Map());

  // ==================== 事件处理函数 ====================
  const handleImageClick = useCallback((src: string) => {
    setPreviewImgSrc(src);
    setPreviewOpen(true);
  }, []);

  const handleCodeClick = useCallback((code: string) => {
    copyText(code);
  }, []);

  const handleThinkToggle = useCallback(() => {
    setShowThink((prev) => !prev);
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
   * 渲染图片
   */
  const renderImage = useCallback(
    (src: string, alt: string, options: RenderOptions = {}) => {
      const {
        width = IMAGE_STYLES.DEFAULT_SIZE.width,
        height = IMAGE_STYLES.DEFAULT_SIZE.height,
        customStyle = '',
        otherAttrs = {},
      } = options;

      const imageKey = `img_${src}`;
      const attrs = Object.entries(otherAttrs)
        .map(([name, value]) => `${name}="${value}"`)
        .join(' ');

      const baseStyles = [
        `width: ${width}`,
        `height: ${height}`,
        ...IMAGE_STYLES.BASE,
      ];

      if (customStyle) {
        baseStyles.push(customStyle);
      }

      const styleString = baseStyles.join('; ');

      return `
      <div class="image-container">
        <img 
          src="${src}" 
          alt="${alt || 'markdown-img'}" 
          data-key="${imageKey}"
          referrerpolicy="no-referrer"
          ${attrs}
          style="${styleString}"
        />
      </div>
    `;
    },
    []
  );

  /**
   * 渲染 Mermaid 容器
   */
  const renderMermaid = useCallback((code: string) => {
    const encodedCode = safeBase64Encode(code);
    const svg = mermaidSuccessIdRef.current.get(safeBase64Decode(code)) || '';
    return `<div class="mermaid-container" data-code="${encodedCode}">${svg}</div>`;
  }, []);

  /**
   * 创建思考区域的切换按钮
   */
  const createThinkToggleButton = useCallback(() => {
    if (loading) return '';

    return `<button 
      class="think-toggle-btn" 
      onclick="window.handleThinkToggle && window.handleThinkToggle()" 
      style="
        background: ${theme.palette.background.paper};
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        margin-left: auto;
        flex-shrink: 0;
        transition: all 0.2s;
        color: ${theme.palette.text.secondary};
      "
      onmouseover="this.style.backgroundColor='${addOpacityToColor(
        theme.palette.primary.main,
        0.1
      )}'; this.style.color='${theme.palette.primary.main}'"
      onmouseout="this.style.backgroundColor='${
        theme.palette.background.paper
      }'; this.style.color='${theme.palette.text.secondary}'"
    >
      <span style="
        transform: ${showThink ? 'rotate(-180deg)' : 'rotate(0deg)'};
        transition: transform 0.3s;
        font-size: 18px;
        line-height: 1;
      ">↓</span>
    </button>`;
  }, [loading, theme, showThink]);

  // ==================== 绑定事件 ====================
  /**
   * 绑定图片点击事件
   */
  const bindImageEvents = useCallback(() => {
    if (!containerRef.current) return;

    const images = containerRef.current.querySelectorAll('img[data-key]');
    images.forEach((img) => {
      const imgElement = img as HTMLImageElement;
      imgElement.onclick = null; // 移除旧事件
      imgElement.onclick = () => handleImageClick(imgElement.src);
    });
  }, [handleImageClick]);

  // ==================== 渲染器自定义 ====================
  /**
   * 自定义 MarkdownIt 渲染器
   */
  const customizeRenderer = useCallback(
    (md: MarkdownIt) => {
      const originalFenceRender = md.renderer.rules.fence;

      // 自定义图片渲染
      md.renderer.rules.image = (tokens, idx) => {
        const token = tokens[idx];
        const srcIndex = token.attrIndex('src');
        const src = srcIndex >= 0 ? token.attrs![srcIndex][1] : '';
        const alt = token.content;

        // 解析属性
        const attrs = token.attrs || [];
        const otherAttrs: ImageAttributes = {};
        let width = IMAGE_STYLES.DEFAULT_SIZE.width;
        let height = IMAGE_STYLES.DEFAULT_SIZE.height;
        let customStyle = '';

        attrs.forEach(([name, value]) => {
          switch (name) {
            case 'width':
              width = value;
              break;
            case 'height':
              height = value;
              break;
            case 'style':
              customStyle = value;
              break;
            default:
              if (name !== 'src' && name !== 'alt') {
                otherAttrs[name] = value;
              }
          }
        });

        return renderImage(src, alt, {
          width,
          height,
          customStyle,
          otherAttrs,
        });
      };

      // 自定义代码块渲染
      md.renderer.rules.fence = (tokens, idx, options, env, renderer) => {
        const token = tokens[idx];
        const info = token.info.trim();
        const code = token.content;

        if (info === 'mermaid') {
          return renderMermaid(code);
        }

        const defaultRender = originalFenceRender || md.renderer.rules.fence;
        let result = defaultRender
          ? defaultRender(tokens, idx, options, env, renderer)
          : `<pre><code>${code}</code></pre>`;

        // 添加点击复制功能
        result = result.replace(
          /<pre[^>]*>/,
          `<pre style="cursor: pointer; position: relative;" onclick="window.handleCodeCopy && window.handleCodeCopy(\`${code.replace(
            /`/g,
            '\\`'
          )}\`)">`
        );

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

        md.renderer.rules.html_block = (
          tokens,
          idx,
          options,
          env,
          renderer
        ) => {
          const token = tokens[idx];
          const content = token.content;

          // 处理 think 标签
          if (content.includes('<think>')) {
            return `<div class="think-content">
            <div class="think-inner ${!showThink ? 'three-ellipsis' : ''}">`;
          }
          if (content.includes('</think>')) {
            return `</div>${createThinkToggleButton()}</div>`;
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
          renderer
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
    [renderImage, renderMermaid, showThink, theme, createThinkToggleButton]
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
    (window as any).handleThinkToggle = handleThinkToggle;

    return () => {
      delete (window as any).handleCodeCopy;
      delete (window as any).handleThinkToggle;
    };
  }, [handleCodeClick, handleThinkToggle]);

  // 主要的内容渲染 Effect
  useEffect(() => {
    if (!containerRef.current || !mdRef.current || !content) return;

    // 处理 think 标签格式
    let processedContent = content;
    if (!processedContent.includes('\n\n</think>')) {
      const idx = processedContent.indexOf('\n</think>');
      if (idx !== -1) {
        processedContent =
          content.slice(0, idx) + '\n\n</think>' + content.slice(idx + 9);
      }
    }

    // 检查内容变化
    if (processedContent === lastContentRef.current) return;

    customizeRenderer(mdRef.current);

    try {
      const newHtml = mdRef.current.render(processedContent);
      incrementalRender(containerRef.current, newHtml, lastContentRef.current);
      bindImageEvents();
      lastContentRef.current = processedContent;

      // 处理 Mermaid 图表渲染
      const mermaidContainers =
        containerRef.current.querySelectorAll('.mermaid-container');

      if (mermaidContainers.length === 0) {
        onScrollBottom();
        return;
      }

      // 递归渲染 Mermaid 图表
      const renderMermaidSequentially = async (index: number) => {
        if (index >= mermaidContainers.length) return;

        const element = mermaidContainers[index] as HTMLElement;
        const encodedCode = element.dataset.code || '';

        if (encodedCode) {
          try {
            const code = safeBase64Decode(encodedCode);
            const rendered = await renderMermaidChart(
              index,
              code,
              mermaidSuccessLastRef,
              mermaidSuccessIdRef
            );
            if (rendered) {
              element.innerHTML = rendered;
            }

            if (index === mermaidContainers.length - 1) {
              onScrollBottom();
            }

            await renderMermaidSequentially(index + 1);
          } catch (error) {
            console.error('Mermaid rendering error:', error);
          }
        }
      };

      renderMermaidSequentially(0);
    } catch (error) {
      console.error('Markdown 渲染错误:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div>Markdown 渲染错误</div>';
      }
      bindImageEvents();
    }
  }, [content, customizeRenderer, bindImageEvents, onScrollBottom]);

  // Think 标签样式处理
  useEffect(() => {
    if (!containerRef.current) return;

    const thinkElements =
      containerRef.current.querySelectorAll('.think-content');
    thinkElements.forEach((element) => {
      const thinkDiv = element as HTMLElement;

      // 设置容器样式
      Object.assign(thinkDiv.style, {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '16px',
        fontSize: '12px',
        color: theme.palette.text.secondary,
        marginBottom: '40px',
        lineHeight: '20px',
        backgroundColor: theme.palette.background.paper,
        padding: '16px',
        cursor: 'pointer',
        borderRadius: '10px',
      });

      // 设置内容区域样式
      const contentDiv = thinkDiv.querySelector('.think-inner') as HTMLElement;
      if (contentDiv) {
        Object.assign(contentDiv.style, {
          transition: 'height 0.3s',
          overflow: 'hidden',
          height: showThink ? 'auto' : '60px',
        });

        contentDiv.classList.toggle('three-ellipsis', !showThink);
      }
    });
  }, [showThink, theme, content]);

  // ==================== 组件样式 ====================
  const componentStyles = {
    fontSize: '14px',
    background: 'transparent',
    '--primary-color': theme.palette.primary.main,
    '--background-paper': theme.palette.background.paper,

    // Think 区域样式
    '.think-content': {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '16px',
      fontSize: '12px',
      color: 'text.tertiary',
      marginBottom: '40px',
      lineHeight: '20px',
      bgcolor: 'background.paper',
      padding: '16px',
      cursor: 'pointer',
      borderRadius: '10px',
      '.think-inner': {
        transition: 'height 0.3s',
        overflow: 'hidden',
        height: showThink ? 'auto' : '60px',
      },
    },

    // 省略号样式
    '.three-ellipsis': {
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: 3,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },

    // 按钮样式
    '.think-toggle-btn': {
      '&:hover': {
        backgroundColor: addOpacityToColor(theme.palette.primary.main, 0.1),
        color: theme.palette.primary.main,
      },
      '&:active': {
        transform: 'scale(0.95)',
      },
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

    // 图片和 Mermaid 样式
    '.image-container': {
      position: 'relative',
      display: 'inline-block',
    },
    '.mermaid-loading': {
      textAlign: 'center',
      padding: '20px',
      color: 'text.secondary',
      fontSize: '14px',
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

      {/* 图片预览弹窗 */}
      <Dialog
        sx={{
          '.MuiDialog-paper': {
            maxWidth: '95vw',
            maxHeight: '95vh',
          },
        }}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      >
        <img
          onClick={() => setPreviewOpen(false)}
          src={previewImgSrc}
          alt='preview'
          style={{ width: '100%', height: '100%' }}
        />
      </Dialog>
    </Box>
  );
};

export default MarkDown2;
