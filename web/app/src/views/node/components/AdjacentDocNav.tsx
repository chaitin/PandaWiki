'use client';

import { IconMianbaoxie } from '@panda-wiki/icons';
import { Box, Stack } from '@mui/material';
import Link from 'next/link';
import type { ITreeItem } from '@/assets/type';

interface AdjacentDocNavProps {
  prev?: ITreeItem;
  next?: ITreeItem;
  basePath: string;
  hasCommentSection?: boolean;
}

const AdjacentDocNav = ({
  prev,
  next,
  basePath,
  hasCommentSection = false,
}: AdjacentDocNavProps) => {
  if (!prev && !next) return null;

  return (
    <Stack
      direction='row'
      justifyContent='space-between'
      alignItems='center'
      sx={{
        mt: 4,
        mb: hasCommentSection ? 0 : 2,
        gap: 2,
      }}
    >
      {prev ? (
        <Box
          component={Link}
          href={`${basePath}/node/${prev.id}`}
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'text.tertiary',
            textDecoration: 'none',
            maxWidth: '48%',
            '&:hover': { color: 'text.primary' },
            transition: 'color 0.2s ease-in-out',
          }}
        >
          <IconMianbaoxie
            sx={{ flexShrink: 0, fontSize: 14, transform: 'rotate(180deg)' }}
          />
          <Box
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'left',
            }}
          >
            上一篇：{prev.name}
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1 }} />
      )}
      {next ? (
        <Box
          component={Link}
          href={`${basePath}/node/${next.id}`}
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
            color: 'text.tertiary',
            textDecoration: 'none',
            maxWidth: '48%',
            '&:hover': { color: 'text.primary' },
            transition: 'color 0.2s ease-in-out',
          }}
        >
          <Box
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'right',
            }}
          >
            下一篇：{next.name}
          </Box>
          <IconMianbaoxie sx={{ flexShrink: 0, fontSize: 14 }} />
        </Box>
      ) : (
        <Box sx={{ flex: 1 }} />
      )}
    </Stack>
  );
};

export default AdjacentDocNav;
