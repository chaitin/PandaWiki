export const tableSx = {
  "& .MuiTableCell-root": {
    "&:first-of-type": {
      paddingLeft: "24px",
    },
  },
  ".cx-selection-column": {
    width: "80px",
  },
  ".MuiTableRow-root:hover #chunk_detail": {
    display: "inline-block"
  }
};

export const treeSx = (supportSelect: boolean, ui: 'select' | 'move') => ({
  cursor: 'grab',
  pl: supportSelect ? 0 : 4,
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
    top: ui === 'select' ? -4 : 0,
    height: 28,
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
  '& .dnd-sortable-tree_drag-handle': {
    cursor: 'grab',
    color: 'text.secondary',
    '&:hover': {
      color: 'primary.main',
    }
  },
  '& .dnd-sortable-tree_simple_tree-item-content': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    flex: 1,
  },
})