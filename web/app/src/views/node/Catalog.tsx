'use client';

import { IconFold, IconUnfold } from '@/components/icons';
import { useStore } from '@/provider';
import {
  addExpandState,
  convertToTree,
  filterEmptyFolders,
} from '@/utils/drag';
import { Box, IconButton } from '@mui/material';
import CatalogFolder from './CatalogFolder';

const Catalog = ({
  id,
  setId,
}: {
  id?: string;
  setId?: (id: string) => void;
}) => {
  const {
    kbDetail,
    nodeList = [],
    mobile = false,
    catalogShow,
    setCatalogShow,
    catalogWidth,
    setCatalogWidth,
  } = useStore();
  if (mobile) return null;
  const catalogSetting = kbDetail?.settings?.catalog_settings;
  const catalogFolderExpand = catalogSetting?.catalog_folder !== 2;
  const tree = addExpandState(
    filterEmptyFolders(convertToTree(nodeList) || []),
    id as string,
    catalogFolderExpand
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = catalogWidth!;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, startWidth + (moveEvent.clientX - startX)); // 最小宽度180
      setCatalogWidth?.(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      <Box
        style={{
          left: catalogShow ? catalogWidth! - 16 : 0,
        }}
        sx={{
          color: 'text.primary',
          position: 'fixed',
          zIndex: 11,
          top: 18,
        }}
      >
        <IconButton
          size='small'
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '50%',
            width: 32,
            height: 32,
            color: 'text.primary',
            bgcolor: 'background.paper',
            '&:hover': {
              bgcolor: 'background.paper',
              borderColor: 'divider',
            },
          }}
          onClick={() => setCatalogShow?.(!catalogShow)}
        >
          {catalogShow ? <IconFold /> : <IconUnfold />}
        </IconButton>
      </Box>
      {!catalogShow ? (
        <Box
          sx={{
            width: 16,
            height: '100vh',
            borderRight: '1px solid',
            borderColor: 'divider',
            position: 'fixed',
            zIndex: 5,
          }}
        ></Box>
      ) : (
        <Box
          style={{
            width: catalogWidth,
          }}
          sx={{
            px: 2,
            py: 3,
            fontSize: 14,
            position: 'fixed',
            zIndex: 5,
            lineHeight: '22px',
            color: 'text.primary',
          }}
        >
          <Box
            sx={{
              px: 2,
              pb: 1,
              lineHeight: '22px',
              fontWeight: 'bold',
            }}
          >
            目录
          </Box>
          <Box
            sx={{
              height: 'calc(100vh - 78px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            {tree.map((item) => (
              <CatalogFolder id={id} key={item.id} item={item} setId={setId} />
            ))}
          </Box>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '1px',
              bgcolor: 'divider',
              cursor: 'col-resize',
            }}
            onMouseDown={handleMouseDown}
          />
        </Box>
      )}
    </>
  );
};

export default Catalog;
