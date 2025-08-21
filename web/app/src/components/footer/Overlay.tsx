import React, { Dispatch, ReactNode, SetStateAction } from 'react';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface OverlayProps {
  open: boolean;
  onClose: Dispatch<SetStateAction<boolean>>;
  children: ReactNode;
}

const Overlay: React.FC<OverlayProps> = ({ open, onClose, children }) => {
  return (
    <>
      {open && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          onClick={() => onClose(false)}
        >
          <IconButton
            onClick={() => onClose(false)}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'white',
              zIndex: 1310,
            }}
          >
            <CloseIcon />
          </IconButton>
          <Box onClick={e => e.stopPropagation()}>{children}</Box>
        </Box>
      )}
    </>
  );
};

export default Overlay;
