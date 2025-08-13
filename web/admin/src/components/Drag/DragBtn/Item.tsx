import { CardWebHeaderBtn } from '@/api';
import Avatar from '@/components/Avatar';
import { Box, Button, IconButton, Stack } from '@mui/material';
import { Icon } from 'ct-mui';
import { CSSProperties, forwardRef, HTMLAttributes } from 'react';

export type ItemProps = HTMLAttributes<HTMLDivElement> & {
  item: CardWebHeaderBtn;
  withOpacity?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
  selectedBtnId: string | null;
  setSelectedBtnId: (id: string | null) => void;
  handleRemove?: (id: string) => void;
};

const Item = forwardRef<HTMLDivElement, ItemProps>(
  (
    {
      item,
      withOpacity,
      isDragging,
      style,
      dragHandleProps,
      selectedBtnId,
      setSelectedBtnId,
      handleRemove,
      ...props
    },
    ref,
  ) => {
    const inlineStyles: CSSProperties = {
      opacity: withOpacity ? '0.5' : '1',
      borderRadius: '10px',
      cursor: isDragging ? 'grabbing' : 'grab',
      backgroundColor: '#ffffff',
      ...style,
    };

    return (
      <Box ref={ref} style={inlineStyles} {...props}>
        <Stack
          direction={'row'}
          alignItems={'center'}
          gap={0.5}
          sx={{
            p: selectedBtnId === item.id ? '3px' : 0.5,
            border: selectedBtnId === item.id ? '2px solid' : '1px solid',
            borderColor: selectedBtnId === item.id ? 'primary.main' : 'divider',
            borderRadius: '10px',
          }}
          onClick={() => {
            if (selectedBtnId === item.id) setSelectedBtnId(null);
            else setSelectedBtnId(item.id);
          }}
        >
          <IconButton
            size='small'
            sx={{
              cursor: 'grab',
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
            {...dragHandleProps}
          >
            <Icon type='icon-drag' />
          </IconButton>
          <Button
            variant={item.variant}
            sx={{ textTransform: 'none' }}
            startIcon={
              item.showIcon ? (
                <Avatar src={item.icon} sx={{ width: 24, height: 24 }} />
              ) : undefined
            }
          >
            {item.text}
          </Button>
          <IconButton
            size='small'
            onClick={e => {
              e.stopPropagation();
              handleRemove?.(item.id);
            }}
            sx={{ color: 'text.auxiliary', ':hover': { color: 'error.main' } }}
          >
            <Icon type='icon-icon_tool_close' />
          </IconButton>
        </Stack>
      </Box>
    );
  },
);

export default Item;
