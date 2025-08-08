'use client';

import { addOpacityToColor } from '@/utils';
import { IconButton, useTheme } from '@mui/material';
import { Icon } from 'ct-mui';
import React, { useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

// ==================== 类型定义 ====================
interface ThinkingComponentProps {
  content: string;
  showThink: boolean;
  onToggle: () => void;
  loading?: boolean;
}

// ==================== Thinking 组件 ====================
const ThinkingComponent: React.FC<ThinkingComponentProps> = ({
  content,
  showThink,
  onToggle,
  loading = false,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className='think-content'
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '16px',
        fontSize: '12px',
        color: theme.palette.text.secondary,
        marginBottom: '40px',
        lineHeight: '20px',
        backgroundColor: theme.palette.background.paper2,
        padding: '16px',
        cursor: 'pointer',
        borderRadius: '10px',
      }}
    >
      <div
        className={`think-inner ${!showThink ? 'three-ellipsis' : ''}`}
        style={{
          transition: 'height 0.3s',
          overflow: 'hidden',
          height: showThink ? 'auto' : '60px',
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      {!loading && (
        <IconButton
          size='small'
          onClick={onToggle}
          sx={{
            bgcolor: 'background.paper2',
            ':hover': {
              bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            },
          }}
        >
          <Icon
            type='icon-xiajiantou'
            sx={{
              fontSize: 18,
              flexShrink: 0,
              transition: 'transform 0.3s',
              transform: showThink ? 'rotate(-180deg)' : 'rotate(0deg)',
            }}
          />
        </IconButton>
      )}
    </div>
  );
};

// ==================== Thinking 渲染器 ====================
export interface ThinkingRendererOptions {
  showThink: boolean;
  onToggle: () => void;
  loading?: boolean;
}

export const useThinkingRenderer = (options: ThinkingRendererOptions) => {
  const { showThink, onToggle, loading } = options;

  return useCallback(
    (content: string) => {
      const container = document.createElement('div');
      const root = createRoot(container);

      // 使用flushSync强制同步渲染
      flushSync(() => {
        root.render(
          <ThinkingComponent
            content={content}
            showThink={showThink}
            onToggle={onToggle}
            loading={loading}
          />,
        );
      });

      const html = container.innerHTML;
      return html;
    },
    [showThink, onToggle, loading],
  );
};

// ==================== 工具函数 ====================
/**
 * 处理thinking标签的内容预处理
 */
export const processThinkingContent = (content: string): string => {
  // 确保thinking标签格式正确
  if (!content.includes('\n\n</think>')) {
    const idx = content.indexOf('\n</think>');
    if (idx !== -1) {
      return content.slice(0, idx) + '\n\n</think>' + content.slice(idx + 9);
    }
  }
  return content;
};
