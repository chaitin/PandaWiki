import EmptyState from '@/components/EmptyState';
import { Box } from '@mui/material';

const Space = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
      }}
    >
      <EmptyState text='暂无数据' />
    </Box>
  );
};

export default Space;
