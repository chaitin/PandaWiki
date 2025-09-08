import { Box, Drawer, IconButton, Stack } from '@mui/material';
import {
  H1Icon,
  H2Icon,
  H3Icon,
  H4Icon,
  H5Icon,
  H6Icon,
  TocList,
} from '@yu-cq/tiptap';
import { Ellipsis, Icon } from 'ct-mui';
import { useState } from 'react';

interface TocProps {
  headings: TocList;
  fixed: boolean;
  setFixed: (fixed: boolean) => void;
  setShowSummary: (showSummary: boolean) => void;
}

const HeadingIcon = [
  <H1Icon sx={{ fontSize: 12 }} />,
  <H2Icon sx={{ fontSize: 12 }} />,
  <H3Icon sx={{ fontSize: 12 }} />,
  <H4Icon sx={{ fontSize: 12 }} />,
  <H5Icon sx={{ fontSize: 12 }} />,
  <H6Icon sx={{ fontSize: 12 }} />,
];

const HeadingSx = [
  { fontSize: 14, fontWeight: 700, color: 'text.secondary' },
  { fontSize: 14, fontWeight: 400, color: 'text.auxiliary' },
  { fontSize: 14, fontWeight: 400, color: 'text.disabled' },
];

const Toc = ({ headings, fixed, setFixed }: TocProps) => {
  const [open, setOpen] = useState(false);
  const levels = Array.from(
    new Set(headings.map(it => it.originalLevel).sort((a, b) => a - b)),
  ).slice(0, 3);

  return (
    <>
      {!open && (
        <Stack
          sx={{
            position: 'fixed',
            top: 110,
            right: 0,
            width: 56,
            pr: 1,
          }}
        >
          <Stack
            gap={1.5}
            alignItems={'flex-end'}
            sx={{ mt: 10 }}
            onMouseEnter={() => setOpen(true)}
          >
            {headings
              .filter(it => levels.includes(it.originalLevel))
              .map(it => {
                return (
                  <Box
                    key={it.id}
                    sx={{
                      width: 25 - (it.level - 1) * 5,
                      height: 4,
                      borderRadius: '2px',
                      bgcolor: it.isActive
                        ? 'action.active'
                        : it.isScrolledOver
                          ? 'action.selected'
                          : 'action.hover',
                    }}
                  />
                );
              })}
          </Stack>
        </Stack>
      )}
      <Drawer
        variant={'persistent'}
        open={open}
        onClose={() => setOpen(false)}
        onMouseLeave={() => {
          if (!fixed) setOpen(false);
        }}
        anchor='right'
        sx={{
          position: 'sticky',
          zIndex: 2,
          top: 110,
          width: 292,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            p: 1,
            boxShadow: 'none !important',
            mt: '102px',
            bgcolor: 'background.default',
            width: 292,
            boxSizing: 'border-box',
          },
        }}
      >
        <Stack
          direction={'row'}
          justifyContent={'space-between'}
          alignItems={'center'}
          sx={{
            fontSize: 14,
            fontWeight: 'bold',
            color: 'text.auxiliary',
            mb: 1,
            p: 1,
            pb: 0,
          }}
        >
          <Box>
            内容大纲
          </Box>
          <IconButton
            size='small'
            onClick={() => {
              if (fixed) {
                setOpen(false);
              }
              setFixed(!fixed);
            }}
          >
            <Icon
              type={!fixed ? 'icon-dingzi' : 'icon-icon_tool_close'}
              sx={{ fontSize: 18 }}
            />
          </IconButton>
        </Stack>
        <Stack
          gap={1}
          sx={{
            height: 'calc(100% - 146px)',
            overflowY: 'auto',
            p: 1,
            pt: 0,
          }}
        >
          {headings
            .filter(it => levels.includes(it.originalLevel))
            .map(it => {
              const idx = levels.indexOf(it.originalLevel);
              return (
                <Stack
                  key={it.id}
                  direction={'row'}
                  alignItems={'center'}
                  gap={1}
                  sx={{
                    cursor: 'pointer',
                    ':hover': {
                      color: 'primary.main',
                    },
                    ml: idx * 2,
                    ...HeadingSx[it.level - 1],
                    color: it.isActive
                      ? 'primary.main'
                      : (HeadingSx[it.level - 1]?.color ?? 'inherit'),
                  }}
                  onClick={() => {
                    const element = document.getElementById(it.id);
                    if (element) {
                      const offset = 100;
                      const elementPosition =
                        element.getBoundingClientRect().top;
                      const offsetPosition =
                        elementPosition + window.pageYOffset - offset;
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth',
                      });
                    }
                  }}
                >
                  <Box
                    sx={{
                      color: 'text.disabled',
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    {HeadingIcon[it.originalLevel - 1]}
                  </Box>
                  <Ellipsis arrow sx={{ flex: 1, width: 0 }}>
                    {it.textContent}
                  </Ellipsis>
                </Stack>
              );
            })}
        </Stack>
      </Drawer >
    </>
  );
};

export default Toc;
