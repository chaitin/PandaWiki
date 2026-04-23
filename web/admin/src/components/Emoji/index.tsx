import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import {
  Box,
  IconButton,
  Popover,
  Stack,
  SxProps,
  Typography,
} from '@mui/material';
import React, { useCallback } from 'react';
import {
  IconWenjianjia,
  IconWenjian,
  IconWenjianjiaKai,
} from '@panda-wiki/icons';
import zh from '../../assets/emoji-data/zh.json';

/** 后台文档图标：仅文档（默认）/ 图片 / 视频 */
const DOC_ICON_IMAGE = '🖼️';
const DOC_ICON_VIDEO = '🎬';

interface EmojiPickerProps {
  type: 1 | 2;
  readOnly?: boolean;
  value?: string;
  collapsed?: boolean;
  onChange?: (emoji: string) => void;
  sx?: SxProps;
  iconSx?: SxProps;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  type,
  readOnly,
  value,
  onChange,
  collapsed,
  sx,
  iconSx,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null,
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (readOnly) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = useCallback(
    (emoji: { native: string }) => {
      onChange?.(emoji.native);
      handleClose();
    },
    [onChange],
  );

  const handleDocIconPreset = useCallback(
    (next: string) => {
      onChange?.(next);
      handleClose();
    },
    [onChange],
  );

  const open = Boolean(anchorEl);
  const id = open ? 'emoji-picker' : undefined;

  const docIconTrigger = () => {
    if (!value) {
      return <IconWenjian sx={{ fontSize: 16, ...iconSx }} />;
    }
    if (value === DOC_ICON_IMAGE) {
      return (
        <Box component='span' sx={{ fontSize: 14, lineHeight: 1, ...iconSx }}>
          {DOC_ICON_IMAGE}
        </Box>
      );
    }
    if (value === DOC_ICON_VIDEO) {
      return (
        <Box component='span' sx={{ fontSize: 14, lineHeight: 1, ...iconSx }}>
          {DOC_ICON_VIDEO}
        </Box>
      );
    }
    return (
      <Box component='span' sx={{ fontSize: 14, ...iconSx }}>
        {value}
      </Box>
    );
  };

  return (
    <>
      <IconButton
        size='small'
        aria-describedby={id}
        onClick={handleClick}
        sx={{
          cursor: 'pointer',
          height: 28,
          color: 'text.primary',
          ...sx,
        }}
      >
        {type === 1 ? (
          value ? (
            <Box component='span' sx={{ fontSize: 14, ...iconSx }}>
              {value}
            </Box>
          ) : collapsed ? (
            <IconWenjianjia sx={{ fontSize: 16, ...iconSx }} />
          ) : (
            <IconWenjianjiaKai sx={{ fontSize: 16, ...iconSx }} />
          )
        ) : (
          docIconTrigger()
        )}
      </IconButton>
      <Popover
        id={id}
        open={open}
        onClose={handleClose}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {type === 2 ? (
          <Stack direction='row' spacing={1} sx={{ p: 1.5 }}>
            {(
              [
                {
                  key: 'doc',
                  label: '文档',
                  stored: '',
                  node: <IconWenjian sx={{ fontSize: 22 }} />,
                },
                {
                  key: 'image',
                  label: '图片',
                  stored: DOC_ICON_IMAGE,
                  node: (
                    <Box sx={{ fontSize: 22, lineHeight: 1 }}>
                      {DOC_ICON_IMAGE}
                    </Box>
                  ),
                },
                {
                  key: 'video',
                  label: '视频',
                  stored: DOC_ICON_VIDEO,
                  node: (
                    <Box sx={{ fontSize: 20, lineHeight: 1 }}>
                      {DOC_ICON_VIDEO}
                    </Box>
                  ),
                },
              ] as const
            ).map(opt => {
              const selected =
                opt.stored === '' ? !value : value === opt.stored;
              return (
                <Box
                  key={opt.key}
                  onClick={() => handleDocIconPreset(opt.stored)}
                  sx={{
                    flex: 1,
                    minWidth: 72,
                    py: 1,
                    px: 0.5,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    bgcolor: selected ? 'action.selected' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'center',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack alignItems='center' spacing={0.5}>
                    {opt.node}
                    <Typography variant='caption' color='text.secondary'>
                      {opt.label}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Picker
            data={data}
            set='native'
            theme='light'
            locale='zh'
            i18n={zh}
            onEmojiSelect={handleSelect}
            previewPosition='none'
            searchPosition='sticky'
            skinTonePosition='none'
            perLine={9}
            emojiSize={24}
          />
        )}
      </Popover>
    </>
  );
};

export default EmojiPicker;
