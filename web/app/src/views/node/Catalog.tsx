'use client';
import { IconMulu } from '@panda-wiki/icons';
import { useStore } from '@/provider';
import { addExpandState } from '@/utils/drag';
import { Box, Stack, SxProps, Tooltip } from '@mui/material';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import CatalogFolder from './CatalogFolder';

const Catalog = ({ sx }: { sx?: SxProps }) => {
  const params = useParams() || {};
  const id = params.id as string;
  const {
    kbDetail,
    mobile = false,
    catalogShow,
    setCatalogShow,
    catalogWidth,
    tree = [],
    setTree,
  } = useStore();

  const catalogSetting = kbDetail?.settings?.catalog_settings;
  const catalogFolderExpand = false;
  const docWidth = kbDetail?.settings?.theme_and_style?.doc_width || 'full';

  useEffect(() => {
    const { tree: originalTree } = addExpandState(
      tree || [],
      id as string,
      catalogFolderExpand,
    );
    setTree?.(originalTree);
  }, []);

  const listRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (hasScrolledRef.current) return;
    if (!id || !catalogShow) return;
    // 等待子项渲染完成后再滚动
    const scrollToActive = () => {
      const el = document.getElementById(`catalog-item-${id}`);
      const container = listRef.current;
      if (el && container) {
        // 计算目标元素相对于滚动容器的位置
        const containerRect = container.getBoundingClientRect();
        const elementRect = el.getBoundingClientRect();

        // 计算目标元素在容器中的相对位置
        const elementTop =
          elementRect.top - containerRect.top + container.scrollTop;
        const containerHeight = container.clientHeight;
        const elementHeight = el.offsetHeight;

        // 计算滚动位置，让元素居中显示
        const scrollTop = elementTop - containerHeight / 2 + elementHeight / 2;

        // 平滑滚动到目标位置
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth',
        });

        hasScrolledRef.current = true;
      }
    };
    const raf = requestAnimationFrame(scrollToActive);
    return () => cancelAnimationFrame(raf);
  }, [id, catalogShow]);

  if (mobile) return null;

  return (
    <Stack
      flexShrink={0}
      alignItems={docWidth === 'full' ? 'flex-start' : 'flex-end'}
      sx={{
        position: 'sticky',
        top: 114,
        maxHeight: 'calc(100vh - 164px)',
        zIndex: 9,
        fontSize: 14,
        width: catalogWidth,
        maxWidth: catalogWidth,
        minWidth: 24,
        overflow: 'hidden',
        transition: 'width 0.3s ease-in-out',
        ...(!catalogShow &&
          docWidth === 'full' && {
            width: 24,
          }),
        ...sx,
      }}
    >
      {!catalogShow ? (
        <Stack
          direction={'row'}
          justifyContent={'flex-end'}
          sx={{
            height: '22px',
            mb: 2,
            ...(docWidth === 'full' ? { ml: 1 } : { mr: 1 }),
          }}
        >
          <Tooltip title={catalogShow ? null : '展开目录'} arrow>
            <IconMulu
              sx={{
                fontSize: 16,
                cursor: 'pointer',
                mr: 1,
                height: 22,
                lineHeight: '22px',
              }}
              onClick={() => setCatalogShow?.(!catalogShow)}
            />
          </Tooltip>
        </Stack>
      ) : (
        <Stack
          direction={'row'}
          alignItems={'center'}
          justifyContent={'space-between'}
          gap={1}
          sx={{
            width: '100%',
            mb: 2,
            pl: 2,
            pr: 1,
            height: '22px',
          }}
        >
          <Box
            sx={{
              fontWeight: 'bold',
              width: '30px',
              wordBreak: 'keep-all',
            }}
          >
            目录
          </Box>
          <IconMulu
            sx={{ fontSize: 16, cursor: 'pointer' }}
            onClick={() => setCatalogShow?.(!catalogShow)}
          />
        </Stack>
      )}
      <Stack
        gap={0.5}
        sx={{
          maxHeight: 'calc(100vh - 202px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          width: '100%',
          transition: 'width 0.3s ease-in-out',
          ...(!catalogShow && {
            width: 0,
          }),
        }}
        ref={listRef}
      >
        {tree.map(item => (
          <CatalogFolder key={item.id} item={item} />
        ))}
      </Stack>
    </Stack>
  );
};

export default Catalog;
