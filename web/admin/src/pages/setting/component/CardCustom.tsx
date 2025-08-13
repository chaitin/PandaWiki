import { KnowledgeBaseListItem, updateKnowledgeBase } from '@/api';
import { validateUrl } from '@/utils';
import { Box, Button, Stack, TextField } from '@mui/material';
import { Message } from 'ct-mui';
import { useEffect, useState } from 'react';
import CustomModal from '@/components/CustomModal';

const CardCustom = () => {
  const [customModalOpen, setCustomModalOpen] = useState(false);

  return (
    <>
      <Stack
        direction='row'
        alignItems={'center'}
        justifyContent={'space-between'}
        sx={{
          m: 2,
          height: 32,
          fontWeight: 'bold',
        }}
      >
        <Box
          sx={{
            '&::before': {
              content: '""',
              display: 'inline-block',
              width: 4,
              height: 12,
              bgcolor: 'common.black',
              borderRadius: '2px',
              mr: 1,
            },
          }}
        >
          前台网站样式个性化
        </Box>
        <Button
          size='small'
          variant='outlined'
          onClick={() => {
            setCustomModalOpen(true);
          }}
        >
          定制页面
        </Button>
      </Stack>
      <CustomModal
        open={customModalOpen}
        onCancel={() => setCustomModalOpen(false)}
      ></CustomModal>
    </>
  );
};

export default CardCustom;
