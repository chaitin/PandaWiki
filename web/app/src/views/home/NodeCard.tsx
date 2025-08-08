import { RecommendNode } from '@/assets/type';
import { IconFile, IconFolder } from '@/components/icons';
import { useStore } from '@/provider';
import { Box, Stack } from '@mui/material';
import { Ellipsis } from 'ct-mui';
import Link from 'next/link';

const NodeFolder = ({ node }: { node: RecommendNode }) => {
  const children =
    node.recommend_nodes?.sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    ) || [];
  return (
    <Stack
      direction='column'
      justifyContent='space-between'
      sx={{ cursor: 'pointer', height: '100%' }}
    >
      <Stack
        direction='row'
        spacing={2}
        alignItems='center'
        sx={{ mb: 2, flexShrink: 0 }}
      >
        {node.emoji ? (
          <Box sx={{ flexShrink: 0, fontSize: 14 }}>{node.emoji}</Box>
        ) : (
          <IconFolder sx={{ flexShrink: 0 }} />
        )}
        <Ellipsis
          sx={{ fontSize: '18px', lineHeight: '26px', fontWeight: '500' }}
        >
          {node.name}
        </Ellipsis>
      </Stack>
      <Box sx={{ flex: 1 }}>
        {children.slice(0, 4).map(it => (
          <Box
            key={it.id}
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <Link href={`/node/${it.id}`} prefetch={false}>
              <Stack
                direction='row'
                alignItems={'center'}
                gap={1}
                sx={{ fontSize: 14, lineHeight: '26px' }}
              >
                {it.emoji ? (
                  <Box
                    sx={{ flexShrink: 0, color: 'text.primary', fontSize: 12 }}
                  >
                    {it.emoji}
                  </Box>
                ) : (
                  <IconFile sx={{ mt: '-2px' }} />
                )}
                <Ellipsis sx={{ letterSpacing: '0.25px' }}>{it.name}</Ellipsis>
              </Stack>
            </Link>
          </Box>
        ))}
      </Box>
      <Stack
        direction='row'
        gap={2}
        justifyContent='flex-end'
        sx={{ mt: 2, flexShrink: 0 }}
      >
        <Link href={`/node/${children[0]?.id || node.id}`} prefetch={false}>
          <Box
            sx={{
              color: 'primary.main',
              fontSize: 14,
            }}
          >
            查看更多
          </Box>
        </Link>
      </Stack>
    </Stack>
  );
};

const NodeFile = ({ node }: { node: RecommendNode }) => {
  return (
    <Link href={`/node/${node.id}`} prefetch={false}>
      <Stack
        direction='column'
        justifyContent='space-between'
        sx={{ cursor: 'pointer', height: '100%' }}
      >
        <Stack
          direction='row'
          spacing={2}
          alignItems='center'
          sx={{ mb: 2, flexShrink: 0 }}
        >
          {node.emoji ? (
            <Box sx={{ flexShrink: 0, fontSize: 14 }}>{node.emoji}</Box>
          ) : (
            <IconFile sx={{ flexShrink: 0 }} />
          )}
          <Ellipsis
            sx={{ fontSize: '18px', lineHeight: '26px', fontWeight: '500' }}
          >
            {node.name}
          </Ellipsis>
        </Stack>
        <Box sx={{ flex: 1 }}>
          {node.summary ? (
            <Box
              className='ellipsis-4'
              sx={{
                color: 'text.secondary',
                fontSize: 14,
                lineHeight: '26px',
                letterSpacing: '0.25px',
              }}
            >
              {node.summary}
            </Box>
          ) : (
            <Box sx={{ color: 'text.disabled', fontSize: 14 }}>暂无摘要</Box>
          )}
        </Box>
        <Stack
          direction='row'
          gap={2}
          justifyContent='flex-end'
          sx={{ mt: 2, flexShrink: 0 }}
        >
          <Box
            sx={{
              color: 'primary.main',
              fontSize: 14,
            }}
          >
            查看详情
          </Box>
        </Stack>
      </Stack>
    </Link>
  );
};

const DocCard = ({ node }: { node: RecommendNode }) => {
  const { mobile = false } = useStore();
  return (
    <Box
      sx={{
        border: `1px solid`,
        borderColor: 'divider',
        borderRadius: '10px',
        padding: '24px',
        width: mobile ? 'calc(100% - 48px)' : 'calc((100% - 32px) / 3)',
        transition: 'all 0.3s ease',
        color: 'text.primary',
        bgcolor: 'background.paper',
        ':hover': {
          borderColor: 'text.primary',
        },
      }}
    >
      {node.type === 2 ? <NodeFile node={node} /> : <NodeFolder node={node} />}
    </Box>
  );
};

export default DocCard;