'use client'

import { NodeListItem } from "@/assets/type"
import { IconArrowDown, IconNav } from "@/components/icons"
import { convertToTree, filterEmptyFolders } from '@/utils/drag'
import { Box, Stack } from "@mui/material"
import { useEffect, useState } from "react"
import CatalogFolder from './CatalogFolder'

const CatalogH5 = ({
  nodes,
}: {
  nodes: NodeListItem[]
}) => {
  const [open, setOpen] = useState(false)
  const tree = filterEmptyFolders(convertToTree(nodes))

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])


  return <Box sx={{
    position: 'fixed',
    top: '60px',
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 2,
    bgcolor: 'background.paper'
  }}>
    <Stack direction='row' alignItems='center' justifyContent='space-between'
      sx={{
        py: 3,
        px: 3,
        position: 'relative',
        zIndex: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
      onClick={() => setOpen(!open)}>
      <Stack direction='row' alignItems='center' gap={1}>
        <IconNav sx={{ fontSize: 18 }} />
        <Box sx={{
          fontSize: 20,
          fontWeight: 'bold',
          color: 'text.primary',
        }}>目录</Box>
      </Stack>
      <IconArrowDown sx={{
        fontSize: 24,
        transform: open ? 'rotate(-180deg)' : 'rotate(0deg)',
        transition: 'transform 0.3s ease-in-out',
        cursor: 'pointer',
      }} />
    </Stack>
    <Box sx={{
      px: 3,
      height: open ? 'calc(100vh - 137px)' : '0px',
      transition: 'height 0.3s ease-in-out',
      bgcolor: 'background.paper',
      overflowY: 'auto',
      overflowX: 'hidden',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
      msOverflowStyle: 'none',
      scrollbarWidth: 'none',
    }}>
      <Box sx={{ py: 3 }}>
        {tree.map((item) => <CatalogFolder key={item.id} item={item} />)}
      </Box>
    </Box>
  </Box>
}

export default CatalogH5