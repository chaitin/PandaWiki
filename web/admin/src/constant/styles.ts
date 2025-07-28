import { Height, Opacity } from '@mui/icons-material';

export const tableSx = {
  '& .MuiTableCell-root': {
    '&:first-of-type': {
      paddingLeft: '24px',
    },
  },
  '.cx-selection-column': {
    width: '80px',
  },
  '.MuiTableRow-root:hover #chunk_detail': {
    display: 'inline-block',
  },
};

export const treeSx = (supportSelect: boolean, ui: 'select' | 'move') => ({
  cursor: 'grab',
  pl: supportSelect ? 0 : 2,
  '&:active': {
    cursor: 'grabbing',
  },
  '&:hover': {
    bgcolor: 'background.paper2',
    borderRadius: '10px',
  },
  '&:has(.MuiInputBase-root)': {
    bgcolor: 'background.paper2',
    borderRadius: '10px',
  },
  '& .dnd-sortable-tree_simple_wrapper': {
    py: 1,
  },
  '& .dnd-sortable-tree_simple_ghost': {
    py: 1,
  },
  '& .dnd-sortable-tree_simple_tree-item-collapse_button': {
    position: 'absolute',
    left: -24,
    height: 24,
    width: 20,
    cursor: 'pointer',
    background: `url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNzQ3OTIwMDk2NzMxIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjM2MjciIGlkPSJteF9uXzE3NDc5MjAwOTY3MzMiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxwYXRoIGQ9Ik0yNjcuMzM3MTQzIDM5Ni43MjY4NTdhMzguNTQ2Mjg2IDM4LjU0NjI4NiAwIDAgMSA1MS43MTItMi40ODY4NTdsMi43Nzk0MjggMi40ODY4NTcgMTkwLjY4MzQyOSAxOTAuNjgzNDI5IDE4OS40NC0xOTEuOTI2ODU3YTM4LjU0NjI4NiAzOC41NDYyODYgMCAwIDEgNTEuNzg1MTQzLTIuODUyNTcybDIuNzc5NDI4IDIuNDg2ODU3YzE0LjExNjU3MSAxMy44OTcxNDMgMTUuMzYgMzYuMzUyIDIuODUyNTcyIDUxLjc4NTE0M2wtMi40ODY4NTcgMi43MDYyODZMNTQwLjE2IDY2OS4yNTcxNDNhMzguNTQ2Mjg2IDM4LjU0NjI4NiAwIDAgMS01Mi4wNzc3MTQgMi41NmwtMi42MzMxNDMtMi40MTM3MTRMMjY3LjMzNzE0MyA0NTEuMjkxNDI5YTM4LjU0NjI4NiAzOC41NDYyODYgMCAwIDEgMC01NC41NjQ1NzJ6IiBwLWlkPSIzNjI4IiBmaWxsPSIjOGU4ZjhmIj48L3BhdGg+PC9zdmc+)`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  },
  '& .dnd-sortable-tree_simple_wrapper:focus-visible': {
    outline: 'none',
  },
  '& .dnd-sortable-tree_simple_tree-item': {
    p: 0,
    gap: 2,
    border: 'none',
  },

  '& .dnd-sortable-tree_simple_handle': {
    width: '20px',
    height: '20px',
    cursor: 'grab',
    marginRight: '10px',
    marginTop: '10px',
    background: `url("data:image/svg+xml;utf8,<svg  xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' width='12'><path d='M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z' fill='gray'></path></svg>") no-repeat center`,
    borderRadius: '4px',
    opacity: 0,
    transition: 'all 0.2s ease',
    '&:hover': {
      opacity: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
      cursor: 'grab',
    },
    '&:active': {
      cursor: 'grabbing',
      backgroundColor: 'rgba(0, 0, 0, 0.08)',
    },
  },
  '& .dnd-sortable-tree_drag-handle': {
    cursor: 'grab',
    color: 'text.secondary',
    '&:hover': {
      color: 'primary.main',
    },
  },
  '& .dnd-sortable-tree_simple_tree-item-content': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    flex: 1,
  },
});
