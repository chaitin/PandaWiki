import { message } from 'ct-mui';
import { ResolvingMetadata } from 'next';
import React from 'react';
import { ITreeItem } from '@/assets/type';

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

export const copyText = (text: string, callback?: () => void) => {
  const isOriginIP = /^http:\/\/(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(
    window.location.origin,
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
  parent: ResolvingMetadata,
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
  pathname: string,
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
    this.methods.forEach(method => {
      this.chain = this.chain.then(() => {
        return new Promise(resolve => {
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

/**
 * 过滤树形数据，只保留匹配搜索关键词的节点及其父节点
 */
export const filterTreeBySearch = (
  tree: ITreeItem[],
  searchTerm: string,
): ITreeItem[] => {
  if (!searchTerm.trim()) {
    return tree;
  }

  const filtered: ITreeItem[] = [];

  const filterNode = (node: ITreeItem): ITreeItem | null => {
    const nameMatches = node.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    // 递归过滤子节点
    const filteredChildren: ITreeItem[] = [];
    if (node.children) {
      for (const child of node.children) {
        const filteredChild = filterNode(child);
        if (filteredChild) {
          filteredChildren.push(filteredChild);
        }
      }
    }

    // 如果当前节点匹配或有匹配的子节点，则保留
    if (nameMatches || filteredChildren.length > 0) {
      return {
        ...node,
        children:
          filteredChildren.length > 0 ? filteredChildren : node.children,
        defaultExpand: true, // 搜索时展开所有匹配的节点
      };
    }

    return null;
  };

  for (const node of tree) {
    const filteredNode = filterNode(node);
    if (filteredNode) {
      filtered.push(filteredNode);
    }
  }

  return filtered;
};

/**
 * 高亮显示文本中的匹配部分
 */
export const highlightText = (
  text: string,
  searchTerm: string,
): React.ReactNode => {
  if (!searchTerm.trim()) {
    return text;
  }

  const regex = new RegExp(
    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi',
  );
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (regex.test(part)) {
      return React.createElement(
        'span',
        {
          key: index,
          style: {
            color: 'var(--mui-palette-primary-main)',
            fontWeight: 'bold',
          },
        },
        part,
      );
    }
    return part;
  });
};

export function base64ToFile(base64Data: string, filename: string) {
  // 分割Base64字符串（移除前缀）
  const arr = base64Data.split(',');
  const mime = arr![0].match(/:(.*?);/)?.[1]; // 提取MIME类型
  const bstr = atob(arr![1]); // 解码Base64字符串
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  // 将解码后的二进制数据存入Uint8Array
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  // 创建并返回File对象
  return new File([u8arr], filename, { type: mime });
}
