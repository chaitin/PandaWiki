'use client';

import noDocImage from '@/assets/images/no-doc.png';
import { Box, Stack } from '@mui/material';
import Image from 'next/image';

interface EmptyDocPlaceholderProps {
  mobile?: boolean;
}

const EmptyDocPlaceholder = ({ mobile = false }: EmptyDocPlaceholderProps) => (
  <Stack
    justifyContent='center'
    alignItems='center'
    gap={2}
    sx={{
      flex: 1,
      pt: '50px',
      pb: 10,
      px: mobile ? 5 : 0,
    }}
  >
    <Image src={noDocImage} alt='暂无文档' width={mobile ? 280 : 380} />
    <Box sx={{ fontSize: 14, color: 'text.tertiary' }}>
      暂无文档, 请前往管理后台创建新文档
    </Box>
  </Stack>
);

export default EmptyDocPlaceholder;
