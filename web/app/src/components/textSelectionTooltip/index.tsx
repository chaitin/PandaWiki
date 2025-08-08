import { IconErrorCorrection } from '@/components/icons';
import { alpha, Box, Button, Popover, Tooltip } from '@mui/material';
import React from 'react';

interface TextSelectionTooltipProps {
  open: boolean;
  selectedText: string;
  anchorPosition: { x: number; y: number } | null;
  onFeedbackClick: () => void;
  isCapturingScreenshot?: boolean;
  className?: string;
}

export const TextSelectionTooltip: React.FC<TextSelectionTooltipProps> = ({
  open,
  selectedText,
  anchorPosition,
  onFeedbackClick,
  isCapturingScreenshot = false,
  className = 'text-selection-tooltip',
}) => {
  return (
    <Popover
      open={open && !!anchorPosition}
      anchorReference='anchorPosition'
      anchorPosition={
        anchorPosition
          ? { top: anchorPosition.y, left: anchorPosition.x }
          : undefined
      }
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      disableRestoreFocus
      sx={{
        pointerEvents: 'none',
        '& .MuiPopover-paper': {
          pointerEvents: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'visible',
        },
      }}
      className={className}
    >
      <Box
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper2',
        }}
      >
        <Tooltip title='文档纠错'>
          <Button
            size='small'
            variant='text'
            onClick={onFeedbackClick}
            loading={isCapturingScreenshot}
            sx={theme => ({
              fontSize: 12,
              px: 0,
              py: 0.5,
              width: 24,
              height: 24,
              textTransform: 'none',
              minWidth: 'auto',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: alpha(theme.palette.text.disabled, 0.1),
              },
            })}
          >
            {!isCapturingScreenshot && (
              <IconErrorCorrection
                sx={{ fontSize: 16, color: 'text.primary' }}
              />
            )}
          </Button>
        </Tooltip>
      </Box>
    </Popover>
  );
};

export default TextSelectionTooltip;
