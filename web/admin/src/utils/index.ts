import { MAC_SYMBOLS } from '@/constant/enums';
import { message } from '@ctzhian/ui';
import { isArray, isEmpty, isNil, isObject, pickBy } from 'lodash-es';

export * from './render';

export function addOpacityToColor(color: string, opacity: number) {
  let red, green, blue;

  if (color.startsWith('#')) {
    red = parseInt(color.slice(1, 3), 16);
    green = parseInt(color.slice(3, 5), 16);
    blue = parseInt(color.slice(5, 7), 16);
  } else if (color.startsWith('rgb')) {
    const matches = color.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)/,
    ) as RegExpMatchArray;
    red = parseInt(matches[1], 10);
    green = parseInt(matches[2], 10);
    blue = parseInt(matches[3], 10);
  } else {
    return '';
  }

  const alpha = opacity;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function addCommasToNumber(num: number = 0) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function filterEmpty(obj: Record<string, any>) {
  return pickBy(obj, value => {
    if (isNil(value)) return false;
    if (value === '') return false;
    if (isArray(value) && isEmpty(value)) return false;
    if (isObject(value) && isEmpty(value)) return false;
    return true;
  });
}
export const formatByte = (limit: number, decimals = 1) => {
  if (typeof limit !== 'number' || isNaN(limit)) return '-';

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let size = limit;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
};

export function generatePassword(length = 8) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';

  const password: string[] = [
    lowercase[Math.floor(Math.random() * lowercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
  ];

  const allChars = lowercase + uppercase + numbers;

  for (let i = 3; i < length; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }
  return password.join('');
}

export const isMac = () =>
  typeof navigator !== 'undefined' &&
  navigator.platform.toLowerCase().includes('mac');

export const getShortcutKeyText = (shortcutKey: string[]) => {
  return shortcutKey
    ?.map(it =>
      isMac() ? MAC_SYMBOLS[it as keyof typeof MAC_SYMBOLS] || it : it,
    )
    .join('+');
};

export const copyText = (
  text: string,
  callback?: () => void,
  duration?: number,
  msgText?: string,
) => {
  const dur = duration ?? 1.5;

  if (msgText) {
    msgText = ` ` + msgText;
  } else {
    msgText = '';
  }

  try {
    // 优先使用现代 Clipboard API（https / localhost / 127.0.0.1 可用）
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      message.success('复制成功' + msgText, dur);
      callback?.();
      return;
    }

    // 降级方案：临时 textarea + execCommand，兼容 http 内网 IP 等非安全上下文
    const textArea = document.createElement('textarea');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        message.success('复制成功' + msgText, dur);
        callback?.();
      } else {
        message.error('复制失败，请手动复制' + msgText, dur);
      }
    } catch (err) {
      message.error('复制失败，请手动复制' + msgText, dur);
    }
    document.body.removeChild(textArea);
  } catch (err) {
    message.error('复制失败，请手动复制' + msgText, dur);
  }
};

export const validateUrl = (url: string): boolean => {
  try {
    const pattern =
      /^(https?):\/\/(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}|(\d{1,3}\.){3}\d{1,3}|\[[a-fA-F0-9:]+\])(:\d+)?(\/[^\s?#]*)?$/;
    if (!pattern.test(url)) return false;

    const parsed = new URL(url);

    return (
      ['http:', 'https:', 'ftp:'].includes(parsed.protocol) &&
      !!parsed.hostname &&
      (parsed.hostname.includes('.') ||
        /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname) ||
        parsed.hostname.startsWith('['))
    );
  } catch {
    return false;
  }
};

/**
 * 链接补全配置选项
 */
export interface CompleteLinksOptions {
  /**
   * 协议相对链接（//example.com）的处理策略
   * - 'preserve': 保持原样
   * - 'current': 使用当前页面的协议（http 或 https）
   * - 'https': 强制使用 https（默认）
   * - 'http': 强制使用 http
   */
  schemaRelative?: 'preserve' | 'current' | 'https' | 'http';
  /**
   * FTP 链接的处理策略
   * - 'preserve': 保持原样（默认）
   * - 'https': 转换为 https（ftp://example.com -> https://example.com）
   * - 'remove': 移除 ftp:// 前缀，转为普通域名
   */
  ftpProtocol?: 'preserve' | 'https' | 'remove';
  /**
   * HTTP 链接的处理策略
   * - 'preserve': 保持原样（默认）
   * - 'https': 转换为 https
   */
  httpProtocol?: 'preserve' | 'https';
  /**
   * 裸域名补全时使用的协议
   * - 'https': 使用 https（默认）
   * - 'http': 使用 http
   * - 'current': 使用当前页面的协议
   */
  bareDomainProtocol?: 'https' | 'http' | 'current';
}

/**
 * 将文本中的所有链接补全为完整链接（含协议的绝对地址）
 * - 处理 Markdown 链接: [title](href)
 * - 处理 Markdown 图片: ![alt](url)
 * - 处理 HTML 链接: <a href="...">...</a>
 * - 处理 HTML 标签的 src 属性: <img src="...">, <iframe src="...">, <script src="..."> 等
 * - 相对/根路径/上级路径 将基于 window.location.href 解析为绝对地址
 * - 裸域名/子域名（如 example.com / sub.example.com）自动补全协议前缀
 * - 已包含协议(http/https/ftp/mailto/tel/data等)或锚点(#)的根据配置处理
 *
 * @param text 要处理的文本
 * @param options 处理选项配置
 */
export function completeIncompleteLinks(
  text: string,
  options: CompleteLinksOptions = {},
): string {
  if (!text) return text;

  const {
    schemaRelative = 'https',
    ftpProtocol = 'preserve',
    httpProtocol = 'preserve',
    bareDomainProtocol = 'https',
  } = options;

  const baseHref =
    typeof window !== 'undefined' && window.location
      ? window.location.href
      : '';
  const currentProtocol =
    typeof window !== 'undefined' && window.location
      ? window.location.protocol
      : 'https:';

  const isProtocolLike = (href: string) =>
    /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href);

  const isHash = (href: string) => href.startsWith('#');

  const isSchemaRelative = (href: string) => href.startsWith('//');

  const isBareDomain = (href: string) => {
    if (/[\s"'<>]/.test(href)) return false;
    if (href.startsWith('/') || href.startsWith('.')) return false;
    return /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(?::\d+)?(\/.*)?$/.test(href);
  };

  const getProtocolForBareDomain = (): string => {
    if (bareDomainProtocol === 'current') {
      return currentProtocol;
    }
    return bareDomainProtocol === 'http' ? 'http:' : 'https:';
  };

  const resolveHref = (href: string): string => {
    const trimmed = href.trim();
    if (!trimmed) return href;

    // 锚点链接保持原样
    if (isHash(trimmed)) return trimmed;

    // 处理协议相对链接（//example.com）
    if (isSchemaRelative(trimmed)) {
      if (schemaRelative === 'preserve') return trimmed;
      if (schemaRelative === 'current') return currentProtocol + trimmed;
      if (schemaRelative === 'http') return 'http:' + trimmed;
      return 'https:' + trimmed; // 默认 https
    }

    // 处理已有协议的链接
    if (isProtocolLike(trimmed)) {
      const protocolMatch = trimmed.match(/^([a-zA-Z][a-zA-Z\d+\-.]*):/);
      if (protocolMatch) {
        const protocol = protocolMatch[1].toLowerCase();

        // 处理 FTP 协议
        if (protocol === 'ftp') {
          if (ftpProtocol === 'preserve') return trimmed;
          if (ftpProtocol === 'https') {
            return trimmed.replace(/^ftp:/i, 'https:');
          }
          if (ftpProtocol === 'remove') {
            return trimmed.replace(/^ftp:\/\//i, '');
          }
        }

        // 处理 HTTP 协议
        if (protocol === 'http') {
          if (httpProtocol === 'preserve') return trimmed;
          if (httpProtocol === 'https') {
            return trimmed.replace(/^http:/i, 'https:');
          }
        }

        // 其他协议（https, mailto, tel, data 等）保持原样
        return trimmed;
      }
    }

    // 处理裸域名
    if (isBareDomain(trimmed)) {
      const protocol = getProtocolForBareDomain();
      return `${protocol}//${trimmed}`;
    }

    // 处理相对路径、根路径、上级路径
    try {
      if (baseHref) {
        return new URL(trimmed, baseHref).toString();
      }
    } catch {
      // ignore
    }

    return trimmed;
  };

  // 处理 Markdown 图片: ![alt](url) 或 ![alt](url "title")
  // 注意：需要在处理链接之前处理图片，避免冲突
  const mdImageRe = /!\[([^\]]*)\]\((\S+?)(?:\s+["']([^"']+)["'])?\)/g;
  text = text.replace(
    mdImageRe,
    (_m, alt: string, url: string, title?: string) => {
      const completed = resolveHref(url);
      // 如果有 title，保留它
      return title
        ? `![${alt}](${completed} "${title}")`
        : `![${alt}](${completed})`;
    },
  );

  // 处理 Markdown 链接: [text](href)
  const mdRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  text = text.replace(mdRe, (_m, label: string, href: string) => {
    const completed = resolveHref(href);
    return `[${label}](${completed})`;
  });

  // 处理 HTML: <a href="..."> / <a href='...'>
  const htmlRe = /(<a\b[^>]*?\bhref=(["']))([^"']+)(\2)/gi;
  text = text.replace(
    htmlRe,
    (
      _m: string,
      pre: string,
      quote: string,
      href: string,
      postQuote: string,
    ) => {
      const completed = resolveHref(href);
      return `${pre}${completed}${postQuote}`;
    },
  );

  // 处理 HTML 标签中的 src 属性: <img src="...">, <iframe src="...">, <script src="..."> 等
  const srcRe = /(<[a-zA-Z][a-zA-Z0-9]*\b[^>]*?\bsrc=(["']))([^"']+)(\2)/gi;
  text = text.replace(
    srcRe,
    (
      _m: string,
      pre: string,
      quote: string,
      src: string,
      postQuote: string,
    ) => {
      const completed = resolveHref(src);
      return `${pre}${completed}${postQuote}`;
    },
  );

  return text;
}
