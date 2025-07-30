'use client';
import { useMemo } from 'react';
import { IconFold, IconUnfold } from '@/components/icons';
import { useStore } from '@/provider';
import { IconSearch } from '@/components/icons';
import SearchIcon from '@mui/icons-material/Search';
import {
  addExpandState,
  convertToTree,
  filterEmptyFolders,
} from '@/utils/drag';
import { filterTreeBySearch } from '@/utils';
import { Box, IconButton, TextField } from '@mui/material';
import { useState } from 'react';
import { useDebounce } from 'ahooks';
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

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, { wait: 300 });

  const catalogSetting = kbDetail?.settings?.catalog_settings;
  const catalogFolderExpand = catalogSetting?.catalog_folder !== 2;

  // 首先转换为树形结构
  const originalTree = addExpandState(
    filterEmptyFolders(convertToTree(nodeList) || []),
    id as string,
    catalogFolderExpand
  );

  const tree = useMemo(() => {
    return filterTreeBySearch(originalTree, debouncedSearchTerm);
  }, [originalTree, debouncedSearchTerm]);

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

  if (mobile) return null;

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
          <TextField
            slotProps={{
              input: {
                endAdornment: (
                  <IconSearch sx={{ fontSize: 18, color: 'text.tertiary' }} />
                ),
              },
            }}
            size='small'
            placeholder='搜索'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              width: 'calc(100% - 16px)',
              mb: 2,
              mt: 1,
              ml: 2,
              bgcolor: 'background.default',
              borderRadius: '10px',
              overflow: 'hidden',
              '& .MuiInputBase-input': {
                lineHeight: '24px',
                height: '24px',
                fontFamily: 'Mono',
                fontSize: 14,
              },
              '& .MuiOutlinedInput-root': {
                height: 36,
                fontSize: 14,
                pr: '18px',
                '& fieldset': {
                  borderRadius: '10px',
                  borderColor: 'divider',
                  px: 2,
                },
              },
            }}
          />
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
              <CatalogFolder
                id={id}
                key={item.id}
                item={item}
                setId={setId}
                searchTerm={debouncedSearchTerm}
              />
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
