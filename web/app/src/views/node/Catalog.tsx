'use client'

import { IconFold, IconUnfold } from "@/components/icons";
import { useStore } from "@/provider";
import { addExpandState, convertToTree, filterEmptyFolders } from "@/utils/drag";
import { Box, IconButton } from "@mui/material";
import { useParams } from "next/navigation";
import CatalogFolder from "./CatalogFolder";

const Catalog = () => {
  const { kbDetail, nodeList = [], mobile = false, catalogShow, setCatalogShow } = useStore()
  const { id = '' }: { id: string } = useParams()
  if (mobile) return null
  const catalogSetting = kbDetail?.settings?.catalog_settings
  const catalogFolderExpand = catalogSetting?.catalog_folder !== 2
  const tree = addExpandState(filterEmptyFolders(convertToTree(nodeList) || []), id as string, catalogFolderExpand)

  return <>
    <Box sx={{
      color: 'text.primary',
      position: 'fixed',
      zIndex: 11,
      top: 18,
      left: catalogShow ? ((catalogSetting?.catalog_width ?? 260) - 16) : 0,
    }}>
      <IconButton size='small' sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '50%',
        width: 32,
        height: 32,
        color: 'text.primary',
        bgcolor: 'background.paper',
        '&:hover': {
          bgcolor: 'background.paper',
          borderColor: 'divider',
        }
      }} onClick={() => setCatalogShow(!catalogShow)}>
        {catalogShow ? <IconFold /> : <IconUnfold />}
      </IconButton>
    </Box>
    {!catalogShow ? <Box sx={{
      width: 16,
      height: '100vh',
      bgcolor: 'background.paper',
      borderRight: '1px solid',
      borderColor: 'divider',
      position: 'fixed',
      zIndex: 5,
    }}></Box> : <Box sx={{
      width: catalogSetting?.catalog_width ?? 260,
      px: 2,
      py: 3,
      fontSize: 14,
      position: 'fixed',
      zIndex: 5,
      borderRight: '1px solid',
      borderColor: 'divider',
      lineHeight: '22px',
      color: 'text.primary',
      bgcolor: 'background.paper',
    }}>
      <Box sx={{
        px: 2,
        pb: 1,
        lineHeight: '22px',
        fontWeight: 'bold',
      }}>目录</Box>
      <Box sx={{
        height: 'calc(100vh - 78px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}>
        {tree.map((item) => <CatalogFolder key={item.id} item={item} activeId={id} />)}
      </Box>
    </Box>}
  </>
};

export default Catalog;