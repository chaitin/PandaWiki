'use client';

import { Box, Skeleton } from '@mui/material';

interface DocSkeletonProps {
  showSummary?: boolean;
}

const DocSkeleton = ({ showSummary = false }: DocSkeletonProps) => (
  <>
    <Skeleton variant='rounded' width={'70%'} height={36} sx={{ mb: '10px' }} />
    <Skeleton variant='rounded' width={'50%'} height={20} sx={{ mb: 4 }} />
    {showSummary && (
      <Box
        sx={{
          mb: 6,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px',
          bgcolor: 'background.paper3',
          p: '20px',
          fontSize: 14,
          lineHeight: '28px',
          backdropFilter: 'blur(5px)',
        }}
      >
        <Box sx={{ fontWeight: 'bold', mb: 2, lineHeight: '22px' }}>
          内容摘要
        </Box>
        <Skeleton variant='rounded' height={16} sx={{ mb: 1 }} />
        <Skeleton variant='rounded' width={'30%'} height={16} />
      </Box>
    )}
    <Skeleton
      variant='rounded'
      width={'20%'}
      height={36}
      sx={{ m: '40px 0 20px' }}
    />
    <Skeleton variant='rounded' height={16} sx={{ mb: 1 }} />
    <Skeleton variant='rounded' height={16} sx={{ mb: 1 }} />
    <Skeleton variant='rounded' width={'70%'} height={16} sx={{ mb: 2 }} />
    <Skeleton variant='rounded' height={16} sx={{ mb: 1 }} />
    <Skeleton variant='rounded' height={16} sx={{ mb: 1 }} />
    <Skeleton variant='rounded' width={'90%'} height={16} sx={{ mb: 1 }} />
    <Skeleton
      variant='rounded'
      width={'35%'}
      height={36}
      sx={{ m: '40px 0 20px' }}
    />
    <Skeleton variant='rounded' height={16} sx={{ mb: 1 }} />
    <Skeleton variant='rounded' height={16} sx={{ mb: 1 }} />
    <Skeleton variant='rounded' height={16} sx={{ mb: 1 }} />
  </>
);

export default DocSkeleton;
