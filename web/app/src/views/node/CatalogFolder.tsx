import { ITreeItem } from '@/assets/type';
import { IconArrowDown, IconFile, IconFolder } from '@/components/icons';
import { useStore } from '@/provider';
import { highlightText } from '@/utils';
import { Box, Stack } from '@mui/material';
import { Ellipsis } from 'ct-mui';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CatalogFolderProps {
  id?: string;
  item: ITreeItem;
  depth?: number;
  setId?: (id: string) => void;
  searchTerm?: string;
}

const CatalogFolder = ({
  id: activeId,
  item,
  depth = 1,
  setId,
  searchTerm = '',
}: CatalogFolderProps) => {
  const [isExpanded, setIsExpanded] = useState(item.defaultExpand ?? true);
  const { themeMode = 'light' } = useStore();

  useEffect(() => {
    setIsExpanded(item.defaultExpand ?? true);
  }, [item]);

  return (
    <Box key={item.id}>
      <Box
        sx={{
          position: 'relative',
          lineHeight: '36px',
          cursor: 'pointer',
          borderRadius: '10px',
          color: activeId === item.id ? 'primary.main' : 'inherit',
          '&:hover': {
            bgcolor: themeMode === 'dark' ? '#394052' : 'background.paper',
          },
        }}
        onClick={() => {
          if (item.type === 1) {
            setIsExpanded(!isExpanded);
            return;
          }
          if (item.type === 2 && setId) {
            setId(item.id);
            window.history.pushState(null, '', `/node/${item.id}`);
            return;
          }
        }}
      >
        {item.type === 1 && (
          <Box
            sx={{
              position: 'absolute',
              left: (2 * depth - 1) * 8,
              top: 4,
              color: 'text.disabled',
            }}
          >
            <IconArrowDown
              sx={{
                fontSize: 16,
                transform: isExpanded ? 'none' : 'rotate(-90deg)',
                transition: 'transform 0.2s',
              }}
            />
          </Box>
        )}
        {item.type === 2 && setId && (
          <Link
            href={`/node/${item.id}`}
            prefetch={false}
            style={{ display: 'none' }}
          >
            {highlightText(item.name, searchTerm)}
          </Link>
        )}
        {!setId && item.type === 2 ? (
          <Link href={`/node/${item.id}`} prefetch={false}>
            <Box sx={{ pl: (depth + 0.5) * 2 }}>
              <Stack direction='row' alignItems='center' gap={0.5}>
                {item.emoji ? (
                  <Box sx={{ flexShrink: 0, fontSize: 12 }}>{item.emoji}</Box>
                ) : (
                  <IconFile sx={{ flexShrink: 0, fontSize: 12 }} />
                )}
                <Ellipsis sx={{ flex: 1, width: 0, pr: 1 }}>
                  {highlightText(item.name, searchTerm)}
                </Ellipsis>
              </Stack>
            </Box>
          </Link>
        ) : (
          <Box sx={{ pl: (depth + 0.5) * 2 }}>
            <Stack direction='row' alignItems='center' gap={0.5}>
              {item.emoji ? (
                <Box sx={{ flexShrink: 0, fontSize: 12 }}>{item.emoji}</Box>
              ) : item.type === 1 ? (
                <IconFolder sx={{ flexShrink: 0, fontSize: 12 }} />
              ) : (
                <IconFile sx={{ flexShrink: 0, fontSize: 12 }} />
              )}
              <Ellipsis sx={{ flex: 1, width: 0, pr: 1 }}>
                {highlightText(item.name, searchTerm)}
              </Ellipsis>
            </Stack>
          </Box>
        )}
      </Box>
      {item.children && item.children.length > 0 && isExpanded && (
        <>
          {item.children.map(child => (
            <CatalogFolder
              id={activeId}
              key={child.id}
              depth={depth + 1}
              item={child}
              setId={setId}
              searchTerm={searchTerm}
            />
          ))}
        </>
      )}
    </Box>
  );
};

export default CatalogFolder;
