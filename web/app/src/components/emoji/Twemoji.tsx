'use client';
import twemoji from '@twemoji/api';
import React, { useMemo } from 'react';

interface TwemojiProps {
  /** 要渲染的字符串。其中所有 emoji unicode 字符会被替换成本地 svg 图片。 */
  text: string;
  /** emoji 显示尺寸（px），默认 16。 */
  size?: number;
  /** 给外层 span 加 className 用于布局/排版。 */
  className?: string;
  /** 给外层 span 加 inline style。 */
  style?: React.CSSProperties;
  /**
   * 当 emoji unicode 字符串为空时是否仍然渲染外层 span（默认 true）。
   * 用于占位场景。
   */
  emptyAsSpan?: boolean;
}

/**
 * 把字符串中的 emoji unicode 字符替换为本地 /twemoji/svg/<codepoint>.svg 的 `<img>`。
 *
 * 解决场景：Windows 7 + Chrome 103 没有系统彩色 emoji 字体，也没有浏览器自带兜底字体，
 * 原本 unicode emoji 会变成豆腐方块或直接消失。
 *
 * 资产由 scripts/copy-twemoji.mjs 在 dev/build 之前从 @twemoji/svg 复制到 public/twemoji/svg。
 */
const Twemoji: React.FC<TwemojiProps> = ({
  text,
  size = 16,
  className,
  style,
  emptyAsSpan = true,
}) => {
  const html = useMemo(() => {
    const value = typeof text === 'string' ? text : '';
    if (!value) return '';
    return twemoji.parse(value, {
      base: '/twemoji/',
      folder: 'svg',
      ext: '.svg',
      attributes: () => ({
        loading: 'lazy',
        // vertical-align 让 emoji 跟同行文字基线对齐
        style: `height:${size}px;width:${size}px;vertical-align:-0.15em;display:inline-block;`,
      }),
    });
  }, [text, size]);

  if (!html) {
    return emptyAsSpan ? <span className={className} style={style} /> : null;
  }

  return (
    <span
      className={className}
      style={style}
      // twemoji.parse 仅做 emoji → <img> 替换，输出可信
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default Twemoji;
