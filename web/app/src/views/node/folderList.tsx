'use client';

import { IconWenjianjia, IconWenjian } from '@panda-wiki/icons';
import { DomainShareNodeDetailItem } from '@/request/types';
import { ITreeItem } from '@/assets/type';
import { useStore } from '@/provider';
import { useBasePath } from '@/hooks';
import { findParentPath } from '@/utils/tree';
import Link from 'next/link';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  alpha,
  styled,
} from '@mui/material';
import React, { useMemo, useState, useEffect } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

// Styled Components
const StyledAccordion = styled(Accordion)({
  backgroundColor: 'transparent',
  backgroundImage: 'none',
  padding: 0,
  border: 'none',
  boxShadow: 'none',
  '&:before': {
    display: 'none',
  },
  '&.Mui-expanded': {
    margin: 0,
  },
});

const StyledAccordionSummary = styled(AccordionSummary)({
  cursor: 'auto !important',
  minHeight: 'auto',
  paddingTop: 12,
  paddingBottom: 12,
  paddingLeft: 0,
  paddingRight: 0,
  '&.Mui-expanded': {
    minHeight: 'auto',
  },
  '& .MuiAccordionSummary-content': {
    margin: 0,
    alignItems: 'flex-start',
    '&.Mui-expanded': {
      margin: 0,
    },
  },
  pointerEvents: 'none',
  '& > *': {
    pointerEvents: 'auto',
  },
});

interface StyledStackProps {
  depth: number;
}

const StyledStack = styled(Stack)<StyledStackProps>(({ depth }) => ({
  width: '100%',
  paddingLeft: depth * 36,
  minWidth: 0,
}));

const StyledExpandIconBox = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginRight: 8,
  width: 14,
  flexShrink: 0,
  cursor: 'pointer',
});

const StyledPlaceholderBox = styled(Box)({
  width: 14,
  marginRight: 8,
  flexShrink: 0,
});

const StyledIconBox = styled(Box)({
  fontSize: 16,
  flexShrink: 0,
  marginRight: 12,
  lineHeight: 1,
});

const StyledIconFolder = styled(IconWenjianjia)({
  flexShrink: 0,
  marginRight: 12,
  fontSize: 16,
});

const StyledIconFile = styled(IconWenjian)({
  flexShrink: 0,
  marginRight: 12,
  fontSize: 16,
});

interface StyledExpandIconProps {
  isExpanded: boolean;
}

const StyledExpandIcon = styled(PlayArrowIcon)<StyledExpandIconProps>(
  ({ isExpanded }) => ({
    fontSize: 14,
    color: 'inherit',
    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s',
  }),
);

const StyledContentBox = styled(Box)({
  flex: 1,
  minWidth: 0,
  width: 0,
  lineHeight: 1,
});

const StyledLink = styled(Link)(({ theme }) => ({
  fontSize: 16,
  fontWeight: 700,
  color: theme.palette.text.primary,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  '&:hover': {
    color: theme.palette.primary.main,
  },
}));

const StyledSummaryBox = styled(Box)(({ theme }) => ({
  fontSize: 13,
  lineHeight: 1.6,
  color: alpha(theme.palette.text.primary, 0.7),
  paddingLeft: 0,
  marginTop: theme.spacing(1),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
  cursor: 'text',
}));

const StyledAccordionDetails = styled(AccordionDetails)({
  paddingLeft: 0,
  paddingRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  border: 'none',
});

const StyledContainerBox = styled(Box)({
  marginBottom: 32,
});

interface FolderListProps {
  list?: DomainShareNodeDetailItem[];
}

const FolderList: React.FC<FolderListProps> = ({ list = [] }) => {
  const { tree, setTree } = useStore();
  const basePath = useBasePath();

  const handleCatalogExpand = (item: DomainShareNodeDetailItem) => {
    if (!tree || !setTree || !item.id) return;

    const parentPath = findParentPath(tree, item.id) || [];
    if (parentPath.length === 0) return;

    const parentSet = new Set(parentPath);

    // 更新 tree，设置父节点的 expanded 为 true
    setTree(prevTree => {
      if (!prevTree) return prevTree;

      const updateExpand = (nodes: ITreeItem[]): ITreeItem[] => {
        return nodes.map(node => {
          if (node.children && node.children.length > 0) {
            return {
              ...node,
              expanded: parentSet.has(node.id) ? true : node.expanded,
              children: updateExpand(node.children),
            };
          }
          return node;
        });
      };

      return updateExpand(prevTree);
    });
  };

  // 递归排序函数
  const sortTree = (
    items: DomainShareNodeDetailItem[],
  ): DomainShareNodeDetailItem[] => {
    // 先对当前层级排序
    const sorted = [...items].sort(
      (a, b) => (a.position || 0) - (b.position || 0),
    );

    // 递归排序子节点
    return sorted.map(item => ({
      ...item,
      children: item.children ? sortTree(item.children) : undefined,
    }));
  };

  const treeList = useMemo(() => {
    if (!list || list.length === 0) return [];
    return sortTree(list);
  }, [list]);

  // 收集所有文件夹的 id
  const getAllFolderIds = (items: DomainShareNodeDetailItem[]): string[] => {
    const ids: string[] = [];
    items.forEach(item => {
      if (item.type === 1 && item.id) {
        ids.push(item.id);
        if (item.children && item.children.length > 0) {
          ids.push(...getAllFolderIds(item.children));
        }
      }
    });
    return ids;
  };

  // 这样在首次渲染时就会计算好展开项，避免闪烁
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const folderIds = getAllFolderIds(treeList);
    return new Set(folderIds);
  });

  const handleToggle = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderIcon = (item: DomainShareNodeDetailItem) => {
    if (item.emoji) {
      return <StyledIconBox>{item.emoji}</StyledIconBox>;
    }
    // type === 1 是文件夹，type === 2 是文件
    return item.type === 1 ? <StyledIconFolder /> : <StyledIconFile />;
  };

  const renderItem = (item: DomainShareNodeDetailItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id || '');
    const itemId = item.id || '';
    const summary = item.meta?.summary;

    return (
      <StyledAccordion key={itemId} expanded={isExpanded}>
        <StyledAccordionSummary expandIcon={null}>
          <StyledStack
            direction='row'
            alignItems='flex-start'
            gap={1}
            depth={depth}
          >
            {hasChildren ? (
              <StyledExpandIconBox
                onClick={e => {
                  e.stopPropagation();
                  handleToggle(itemId);
                }}
              >
                <StyledExpandIcon isExpanded={isExpanded} />
              </StyledExpandIconBox>
            ) : (
              <StyledPlaceholderBox />
            )}
            {renderIcon(item)}
            <StyledContentBox>
              <StyledLink
                href={`${basePath}/node/${item.id}`}
                prefetch={false}
                onClick={() => handleCatalogExpand(item)}
              >
                {item.name || '未命名'}
              </StyledLink>
              {item.type === 2 && (
                <StyledSummaryBox>{summary || '暂无摘要'}</StyledSummaryBox>
              )}
            </StyledContentBox>
          </StyledStack>
        </StyledAccordionSummary>
        {hasChildren && (
          <StyledAccordionDetails>
            <Box>
              {item.children!.map(child => renderItem(child, depth + 1))}
            </Box>
          </StyledAccordionDetails>
        )}
      </StyledAccordion>
    );
  };

  if (!list || list.length === 0) {
    return null;
  }

  return (
    <StyledContainerBox>
      {treeList.map(item => renderItem(item, 0))}
    </StyledContainerBox>
  );
};

export default FolderList;
