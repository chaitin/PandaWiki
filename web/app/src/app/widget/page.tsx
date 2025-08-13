import Widget from '@/views/widget';
import { Box } from '@mui/material';

const Page = () => {
  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
      }}
    >
      <Widget />
    </Box>
  );
};

export default Page;
