'use client';

import { NodeListItem } from '@/assets/type';
import { IconArrowDown, IconNav } from '@/components/icons';
import { convertToTree, filterEmptyFolders } from '@/utils/drag';
import { filterTreeBySearch } from '@/utils';
import { Box, Stack, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useState, useMemo } from 'react';
import { useDebounce } from 'ahooks';
import CatalogFolder from './CatalogFolder';

const CatalogH5 = ({ nodes }: { nodes: NodeListItem[] }) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, { wait: 300 });

  const originalTree = filterEmptyFolders(convertToTree(nodes));

  const tree = useMemo(() => {
    return filterTreeBySearch(originalTree, debouncedSearchTerm);
  }, [originalTree, debouncedSearchTerm]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: '60px',
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        sx={{
          py: 3,
          px: 3,
          position: 'relative',
          zIndex: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
        onClick={() => setOpen(!open)}
      >
        <Stack direction='row' alignItems='center' gap={1}>
          <IconNav sx={{ fontSize: 18 }} />
          <Box
            sx={{
              fontSize: 20,
              fontWeight: 'bold',
              color: 'text.primary',
            }}
          >
            目录
          </Box>
        </Stack>
        <IconArrowDown
          sx={{
            fontSize: 24,
            transform: open ? 'rotate(-180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease-in-out',
            cursor: 'pointer',
          }}
        />
      </Stack>
      <Box
        sx={{
          '--fallback-height': 'calc(100vh - 131px)',
          '--dynamic-height': 'calc(100dvh - 131px)',
          px: 3,
          height: open
            ? 'var(--dynamic-height, var(--fallback-height))'
            : '0px',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transition: 'height 0.3s ease-in-out',
          bgcolor: 'background.paper',
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        <TextField
          slotProps={{
            input: {
              endAdornment: <SearchIcon sx={{ fontSize: 20 }} />,
            },
          }}
          size='small'
          placeholder='搜索'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            width: '100%',
            mt: 2,
            mb: 1,
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
        <Box sx={{ py: 3 }}>
          {tree.map((item) => (
            <CatalogFolder
              key={item.id}
              item={item}
              searchTerm={debouncedSearchTerm}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default CatalogH5;
