import { useAppDispatch, useAppSelector } from '@/store';
import { setKbId } from '@/store/slices/config';
import { Box, Divider, MenuItem, Popover, Stack } from '@mui/material';
import { Icon } from 'ct-mui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const KBSwitch = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { kbList, kb_id } = useAppSelector(state => state.config);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Stack
        aria-describedby={'editor-kb-switch'}
        alignItems='center'
        justifyContent={'center'}
        sx={{
          // cursor: 'pointer',
          flexShrink: 0,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px',
          width: 36,
          height: 36,
        }}
        // onMouseEnter={handlePopoverOpen}
      >
        <Icon type='icon-zuzhi' sx={{ color: 'text.primary' }} />
      </Stack>
      <Popover
        id='editor-kb-switch'
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        onClose={handlePopoverClose}
        disableAutoFocus
      >
        <Stack sx={{ width: 200 }}>
          <Box sx={{ px: 2, pt: 1.5, pb: 1, fontWeight: 'bold', fontSize: 12 }}>
            全部知识库
          </Box>
          <Divider />
          <Stack sx={{ p: 0.5 }}>
            {kbList.map(item => (
              <MenuItem
                key={item.id}
                selected={item.id === kb_id}
                onClick={() => {
                  dispatch(setKbId(item.id));
                  handlePopoverClose();
                  navigate(`/doc/editor/space?id=${item.id}`);
                }}
              >
                {item.name}
              </MenuItem>
            ))}
          </Stack>
        </Stack>
      </Popover>
    </>
  );
};

export default KBSwitch;
