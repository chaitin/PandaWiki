'use client';

import React from 'react';
import { styled, Grid, Box, alpha } from '@mui/material';
import {
  StyledTopicInner,
  StyledTopicContainer,
  StyledTopicBox,
  StyledTopicTitle,
  StyledEllipsis,
} from '../component/styledCommon';
import IconWenjian from '@panda-wiki/icons/IconWenjian';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import {
  useFadeInText,
  useCardFadeInAnimation,
} from '../hooks/useGsapAnimation';

interface SimpleDocProps {
  mobile?: boolean;
  title?: string;
  bgColor?: string;
  titleColor?: string;
  items?: {
    id: string;
    name: string;
    emoji?: string;
  }[];
  basePath?: string;
  /** 若提供则替代默认链接打开文档 */
  openNode?: (nodeId: string) => void;
}

const StyledSimpleDocItem = styled('a')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(3.5, 2.5),
  borderRadius: '8px',
  boxShadow: `0px 5px 20px 0px ${alpha(theme.palette.text.primary, 0.06)}`,
  border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
  transition: 'all 0.2s ease',
  cursor: 'pointer',
  color: theme.palette.text.primary,
  '&:hover': {
    transform: 'translateY(-5px)',
    color: theme.palette.primary.main,
    boxShadow: '0px 10px 20px 0px rgba(0,0,5,0.2)',
    borderColor: theme.palette.primary.main,
  },
  opacity: 0,
}));

const StyledSimpleDocItemTitle = styled('h3')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  fontSize: 20,
  fontWeight: 700,
  width: '100%',
}));

// 单个卡片组件，带动画效果
const SimpleDocItem: React.FC<{
  item: any;
  index: number;
  basePath: string;
  size: any;
  openNode?: (nodeId: string) => void;
}> = React.memo(({ item, index, basePath, size, openNode }) => {
  const cardRef = useCardFadeInAnimation(0.2 + index * 0.1, 0.1);

  return (
    <Grid size={size} key={index}>
      <StyledSimpleDocItem
        ref={cardRef as React.Ref<HTMLAnchorElement>}
        href={openNode ? undefined : `${basePath}/node/${item.id}`}
        target={openNode ? undefined : '_blank'}
        onClick={
          openNode
            ? e => {
                e.preventDefault();
                openNode(item.id);
              }
            : undefined
        }
      >
        <StyledSimpleDocItemTitle>
          {item.emoji ? (
            <Box>{item.emoji}</Box>
          ) : (
            <IconWenjian sx={{ fontSize: 16, flexShrink: 0 }} />
          )}
          <StyledEllipsis sx={{ flex: 1 }}>{item.name}</StyledEllipsis>
          <ArrowForwardIosRoundedIcon
            sx={{ fontSize: 14, color: 'primary.main' }}
          />
        </StyledSimpleDocItemTitle>
      </StyledSimpleDocItem>
    </Grid>
  );
});

const SimpleDoc: React.FC<SimpleDocProps> = React.memo(
  ({ title, items = [], mobile, basePath = '', openNode }) => {
    const size =
      typeof mobile === 'boolean' ? (mobile ? 12 : 4) : { xs: 12, md: 4 };

    // 添加标题淡入动画
    const titleRef = useFadeInText(0.2, 0.1);

    return (
      <StyledTopicBox>
        <StyledTopicTitle ref={titleRef}>{title}</StyledTopicTitle>
        <Grid container spacing={2} sx={{ width: '100%' }}>
          {items.map((item, index) => (
            <SimpleDocItem
              key={index}
              item={item}
              index={index}
              basePath={basePath}
              size={size}
              openNode={openNode}
            />
          ))}
        </Grid>
      </StyledTopicBox>
    );
  },
);

export default SimpleDoc;
