import IconAnswer from '@/assets/images/answer.png';
import { Box, Stack } from "@mui/material";
import Image from "next/image";

const ChatTab = ({ showType, setShowType }: { showType: 'chat' | 'search', setShowType: (type: 'chat' | 'search') => void }) => {
  return <Stack direction='row' gap={2} alignItems='center' justifyContent='center'>
    <Box
      onClick={() => setShowType('chat')}
      sx={{
        position: 'relative',
        fontSize: '20px',
        fontWeight: '700',
        lineHeight: '28px',
        mb: 2,
        height: '28px',
        ...(showType === 'chat' && {
          color: 'primary.main',
          '&::after': {
            position: 'absolute',
            bottom: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            content: '""',
            display: 'block',
            width: '20px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'primary.main',
          }
        })
      }}
    >
      <Box sx={{ position: 'absolute', left: -30, top: -5 }}>
        <Image src={IconAnswer.src} alt='智能回答' width={24} height={24} />
      </Box>
      智能回答
    </Box>
    <Box
      onClick={() => setShowType('search')}
      sx={{
        position: 'relative',
        fontSize: '20px',
        fontWeight: '700',
        lineHeight: '28px',
        mb: 2,
        ...(showType === 'search' && {
          color: 'primary.main',
          '::after': {
            position: 'absolute',
            bottom: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            content: '""',
            display: 'block',
            width: '20px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'primary.main',
          }
        })
      }}>搜索结果</Box>
  </Stack>
}

export default ChatTab;

