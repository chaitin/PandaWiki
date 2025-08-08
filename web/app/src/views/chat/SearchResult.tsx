import { ChunkResultItem } from '@/assets/type';
import { IconArrowUp } from '@/components/icons';
import { useStore } from '@/provider';
import { Box, Skeleton, Stack } from '@mui/material';
import { Ellipsis } from 'ct-mui';
import Link from 'next/link';

const SearchResult = ({
  list,
  loading,
}: {
  list: ChunkResultItem[];
  loading: boolean;
}) => {
  const { mobile = false } = useStore();

  return (
    <Box
      sx={{
        height: 'calc(100vh - 254px)',
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        ...(mobile && {
          height: 'calc(100vh - 181px)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px',
          px: 3,
          py: 1,
        }),
      }}
    >
      {list.map(item => (
        <Box
          key={item.node_id}
          sx={{
            borderBottom: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Link href={`/node/${item.node_id}`} target='_blank' prefetch={false}>
            <Stack
              direction='row'
              alignItems='center'
              gap={3}
              justifyContent='space-between'
              sx={theme => ({
                borderRadius: '10px',
                py: '14px',
                cursor: 'pointer',
                '&:hover': {
                  '.hover-primary': {
                    color: theme.vars.palette.primary.main,
                  },
                },
              })}
            >
              <Box sx={{ width: 'calc(100% - 80px)' }}>
                <Ellipsis className='hover-primary' sx={{ lineHeight: '24px' }}>
                  {item.name}
                </Ellipsis>
                <Ellipsis
                  sx={{
                    fontSize: 12,
                    color: 'text.tertiary',
                    lineHeight: '20px',
                  }}
                >
                  {item.summary}
                </Ellipsis>
              </Box>
              <IconArrowUp
                className='hover-primary'
                sx={{
                  color: 'text.tertiary',
                  flexShrink: 0,
                  fontSize: 12,
                  transform: 'rotate(90deg)',
                }}
              />
            </Stack>
          </Link>
        </Box>
      ))}

      {loading && (
        <Box sx={{ mt: 1 }}>
          <Stack
            sx={{
              bgcolor: 'background.paper2',
              borderRadius: '10px',
              px: 2,
              py: 1,
            }}
          >
            <Skeleton variant='text' sx={{ width: '40%', height: '24px' }} />
            <Skeleton variant='text' sx={{ width: '100%', height: '20px' }} />
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default SearchResult;
