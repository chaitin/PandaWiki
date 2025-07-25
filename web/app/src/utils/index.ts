import { message } from 'ct-mui';
import { ResolvingMetadata } from 'next';

export function addOpacityToColor(color: string, opacity: number) {
  let red, green, blue;

  if (color.startsWith('#')) {
    red = parseInt(color.slice(1, 3), 16);
    green = parseInt(color.slice(3, 5), 16);
    blue = parseInt(color.slice(5, 7), 16);
  } else if (color.startsWith('rgb')) {
    const matches = color.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)/
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

export const copyText = (text: string, callback?: () => void) => {
  const isOriginIP = /^http:\/\/(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(
    window.location.origin
  );

  if (isOriginIP) {
    message.error('http 协议下不支持复制，请使用 https 协议');
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      message.success('复制成功');
      callback?.();
    } else {
      const textArea = document.createElement('textarea');
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          message.success('复制成功');
          callback?.();
        } else {
          message.error('复制失败，请手动复制');
        }
      } catch (err) {
        console.error(err);
        message.error('复制失败，请手动复制');
      }
      document.body.removeChild(textArea);
    }
  } catch (err) {
    console.error(err);
    message.error('复制失败，请手动复制');
  }
};

export const formatMeta = async (
  {
    title,
    description,
    keywords,
  }: { title?: string; description?: string; keywords?: string | string[] },
  parent: ResolvingMetadata
) => {
  const keywordsIsEmpty =
    !keywords || (Array.isArray(keywords) && !keywords.length);
  const {
    title: parentTitle,
    description: parentDescription,
    keywords: parentKeywords,
  } = await parent;

  return {
    title: title ? `${parentTitle?.absolute} - ${title}` : parentTitle,
    description: description || parentDescription,
    keywords: keywordsIsEmpty ? parentKeywords : keywords,
  };
};

export const parsePathname = (
  pathname: string
): { page: string; id: string; hash: string; search: string } => {
  const [filterSearch, search] = pathname.split('?');
  const [path, hash] = filterSearch.split('#');
  const [page, id] = path.split('/').filter(Boolean);
  return {
    page,
    id,
    hash,
    search,
  };
};

export class AsyncChain {
  private methods: any[];
  private chain: Promise<any>;

  constructor(methods: any[] = []) {
    this.methods = methods;
    this.chain = Promise.resolve();
  }

  // 添加一个方法到链中
  add(method: any) {
    this.methods.push(method);
    return this; // 支持链式调用
  }

  // 执行链式调用，每一帧执行一个方法
  execute() {
    this.methods.forEach((method) => {
      this.chain = this.chain.then(() => {
        return new Promise((resolve) => {
          // 使用 requestAnimationFrame 确保在下一帧执行
          requestAnimationFrame(() => {
            Promise.resolve(method()).then(resolve).catch(resolve);
          });
        });
      });
    });

    return this.chain;
  }
}
