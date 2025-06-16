import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { IconButton, Popover, SxProps } from '@mui/material';
import { Icon } from 'ct-mui';
import React, { useCallback } from 'react';

interface EmojiPickerProps {
  type: 1 | 2
  readOnly?: boolean
  value?: string;
  collapsed?: boolean;
  onChange: (emoji: string) => void;
  sx?: SxProps
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  type,
  readOnly,
  value,
  onChange,
  collapsed,
  sx
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (readOnly) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = useCallback((emoji: any) => {
    onChange(emoji.native);
    handleClose();
  }, [onChange]);

  const open = Boolean(anchorEl);
  const id = open ? 'emoji-picker' : undefined;

  return (
    <>
      <IconButton size='small' aria-describedby={id} onClick={handleClick} sx={{
        cursor: 'pointer',
        height: 28,
        color: 'text.primary',
        ...sx
      }}>
        {value || <Icon type={type === 1 ? collapsed ? 'icon-wenjianjia' : 'icon-wenjianjia-kai' : 'icon-wenjian'} sx={{ fontSize: 16 }} />}
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
        <Picker
          data={data}
          set='native'
          theme='light'
          locale='zh'
          onEmojiSelect={handleSelect}
          previewPosition="none"
          searchPosition="sticky"
          skinTonePosition="none"
          perLine={9}
          emojiSize={24}
        />
      </Popover>
    </>
  );
};

export default EmojiPicker;