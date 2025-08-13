import LoadingIcon from '@/assets/images/loading.png';
import { Box, Stack } from '@mui/material';
import Image from 'next/image';
import { AnswerStatus } from './constant';

interface ChatLoadingProps {
  thinking: keyof typeof AnswerStatus;
  onClick?: () => void;
}

const ChatLoading = ({ thinking, onClick }: ChatLoadingProps) => {
  return (
    <Stack
      direction={onClick ? 'row-reverse' : 'row'}
      alignItems={'center'}
      gap={1}
      sx={{
        color: 'text.tertiary',
        fontSize: 12,
      }}
      onClick={() => onClick?.()}
    >
      <Stack
        direction={onClick ? 'row-reverse' : 'row'}
        alignItems={'center'}
        sx={{ position: 'relative' }}
      >
        <Image
          src={LoadingIcon.src}
          alt='loading'
          width={20}
          height={20}
          style={{ animation: 'loadingRotate 1s linear infinite' }}
        />
        <Box
          sx={{
            width: 6,
            height: 6,
            bgcolor: 'primary.main',
            borderRadius: '1px',
            position: 'absolute',
            top: 7,
            left: 7,
          }}
        ></Box>
      </Stack>
      <Box sx={{ lineHeight: 1 }}>{AnswerStatus[thinking]}</Box>
    </Stack>
  );
};

export default ChatLoading;
