'use client';

import { DOC_ANCHOR_WIDTH } from '@/constant';
import useScroll from '@/hooks/useScroll';
import { TocItem, TocList } from '@ctzhian/tiptap';
import { Box, Stack } from '@mui/material';
import { useEffect, useMemo, useRef } from 'react';

interface DocAnchorProps {
  headings: TocList;
}

interface TreeHeading extends TocItem {
  children: TreeHeading[];
}

const HeadingSx = [
  { fontWeight: 400, color: 'text.primary' },
  { fontWeight: 400, color: 'text.secondary' },
  { fontWeight: 400, color: 'text.tertiary' },
];

const DocAnchor = ({ headings }: DocAnchorProps) => {
  const { activeHeading, scrollToElement } = useScroll(
    headings,
    'scroll-container',
  );
  const activeId = activeHeading?.id;
  const listRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const levels = Array.from(
    new Set(headings?.map(it => it.level).sort((a, b) => a - b)),
  ).slice(0, 3);

  const treeHeadings = useMemo(() => {
    // 首先筛选出前三级标题
    const filteredHeadings = headings.filter(heading =>
      levels.includes(heading.level),
    );

    // 构建树结构的函数
    const buildTree = (items: TocItem[]): TreeHeading[] => {
      const result: TreeHeading[] = [];
      const stack: TreeHeading[] = [];

      for (const item of items) {
        const treeItem: TreeHeading = {
          ...item,
          children: [],
        };

        // 找到正确的父级位置
        while (
          stack.length > 0 &&
          stack[stack.length - 1].level >= treeItem.level
        ) {
          stack.pop();
        }

        if (stack.length === 0) {
          // 顶级标题
          result.push(treeItem);
        } else {
          // 作为子标题添加到父级
          stack[stack.length - 1].children.push(treeItem);
        }

        stack.push(treeItem);
      }

      return result;
    };

    return buildTree(filteredHeadings);
  }, [headings, levels]);

  useEffect(() => {
    if (hasScrolledRef.current) return;
    if (!activeId) return;
    const container = listRef.current;
    if (!container) return;
    const el = document.getElementById(`doc-anchor-item-${activeId}`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      hasScrolledRef.current = true;
    }
  }, [activeId, headings.length]);

  // 递归渲染树结构的函数
  const renderTreeHeadings = (items: TreeHeading[]): React.ReactNode => {
    return (
      <>
        {items.map(heading => {
          const levelIndex = levels.indexOf(heading.level);

          return (
            <Stack gap={'8px'} key={heading.id}>
              <Box
                id={`doc-anchor-item-${heading.id}`}
                sx={{
                  cursor: 'pointer',
                  ...HeadingSx[levelIndex],
                  color:
                    activeHeading?.id === heading.id
                      ? 'primary.main'
                      : 'inherit',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  ':hover': {
                    color:
                      activeHeading?.id === heading.id
                        ? 'primary.main'
                        : 'text.primary',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
                onClick={e => handleClick(e, heading)}
              >
                {heading.textContent}
              </Box>
              {heading.children.length > 0 && (
                <Stack
                  gap={'8px'}
                  sx={{
                    borderLeft: '1px solid',
                    borderColor: 'rgba(115,112,118,0.05)',
                    pl: 3,
                  }}
                >
                  {renderTreeHeadings(heading.children) as any}
                </Stack>
              )}
            </Stack>
          );
        })}
      </>
    );
  };

  const handleClick = (
    e: React.MouseEvent<HTMLDivElement>,
    heading: TocItem,
  ) => {
    e.preventDefault();
    if (scrollToElement) {
      scrollToElement(heading.id, 80);
    } else {
      const element = document.getElementById(heading.id);
      if (element) {
        const offset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
        setTimeout(() => {
          location.hash = encodeURIComponent(heading.textContent);
        }, 0);
      }
    }
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        zIndex: 5,
        top: 160,
        flexShrink: 0,
        width: DOC_ANCHOR_WIDTH,
      }}
    >
      {headings.length > 0 && (
        <Stack
          gap={'8px'}
          sx={{
            maxHeight: 'calc(100vh - 164px - 44px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            fontSize: 14,
            color: 'text.tertiary',
            lineHeight: '24px',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
          ref={listRef}
        >
          {renderTreeHeadings(treeHeadings) as any}
        </Stack>
      )}
    </Box>
  );
};

export default DocAnchor;
