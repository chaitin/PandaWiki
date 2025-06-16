import { ITreeItem } from "@/api"
import { addOpacityToColor } from "@/utils"
import { Box, IconButton, Stack, useTheme } from "@mui/material"
import { Icon, MenuSelect } from "ct-mui"

export type TreeMenuItem = {
  key: string
  label: string
  onClick?: () => void
  disabled?: boolean
  children?: {
    key: string
    label: string
    disabled?: boolean
    onClick?: () => void
  }[]
}

export type TreeMenuOptions = {
  item: ITreeItem
  createItem: (type: 1 | 2) => void
  renameItem: () => void
  isEditting: boolean
  removeItem: (id: string) => void
}

const TreeMenu = ({ menu }: { menu: TreeMenuItem[] }) => {
  const theme = useTheme()

  return <MenuSelect
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    childrenProps={{
      anchorOrigin: { vertical: 'top', horizontal: 'left' },
      transformOrigin: { vertical: 'top', horizontal: 'right' }
    }}
    list={menu?.map(value => ({
      key: value.key,
      children: value.children?.map(it => ({
        key: it.key,
        onClick: it?.disabled ? undefined : it.onClick,
        label: <Box key={it.key}>
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={1}
            sx={{
              fontSize: 14, px: 2, lineHeight: '40px', height: 40, width: 180,
              borderRadius: '5px',
              cursor: 'pointer', ':hover': { bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1) }
            }}
          >
            {it.label}
          </Stack>
        </Box>
      })),
      label: <Box key={value.key}>
        <Stack
          direction={'row'}
          alignItems={'center'}
          justifyContent={'space-between'}
          gap={1}
          sx={{
            fontSize: 14, pl: 2, pr: 1, lineHeight: '40px', height: 40, width: 180,
            borderRadius: '5px',
            color: value?.disabled ? 'text.disabled' : 'text.primary',
            cursor: value?.disabled ? 'not-allowed' : 'pointer',
            ':hover': { bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1) }
          }}
          onClick={value?.disabled ? undefined : value.onClick}
        >
          {value.label}
          {value.children && <Icon type='icon-xiala' sx={{ fontSize: 20, transform: 'rotate(-90deg)' }} />}
        </Stack>
        {value.key === 'third' && <Box
          sx={{
            width: 145,
            borderBottom: '1px dashed',
            borderColor: 'divider',
            my: 0.5,
            mx: 'auto'
          }} />}
      </Box>
    }))}
    context={<IconButton size="small">
      <Icon type='icon-gengduo' />
    </IconButton>}
  />
}

export default TreeMenu