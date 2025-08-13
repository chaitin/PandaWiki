import { addOpacityToColor } from '@/utils';
import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton, Modal, SxProps, useTheme } from '@mui/material';
import { useState } from 'react';

interface ImageProps {
  src: string;
  alt?: string;
  width: number | string;
  preview?: boolean;
  sx?: SxProps;
}

const CustomImage = ({
  src,
  alt = '',
  width,
  preview = true,
  sx,
}: ImageProps) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  const handleOpen = () => {
    if (preview) {
      setOpen(true);
    }
  };

  const handleClose = () => {
    if (preview) {
      setOpen(false);
    }
  };

  return (
    <>
      <Box
        component='img'
        src={src}
        alt={alt}
        width={width}
        onClick={handleOpen}
        sx={sx}
      />
      <Modal
        open={open}
        onClose={handleClose}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: -40,
              right: -40,
              color: 'white',
              bgcolor: addOpacityToColor(theme.palette.common.black, 0.5),
              '&:hover': {
                bgcolor: addOpacityToColor(theme.palette.common.black, 0.7),
              },
            }}
          >
            <CloseIcon />
          </IconButton>
          <Box
            component='img'
            src={src}
            alt={alt}
            sx={{
              minWidth: '1200px',
              minHeight: '80vh',
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 1,
              boxShadow: `0 8px 16px ${addOpacityToColor(theme.palette.common.black, 0.2)}`,
            }}
          />
        </Box>
      </Modal>
    </>
  );
};

export default CustomImage;
