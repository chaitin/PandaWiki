import { useStore } from '@/provider';
import { Box, Stack } from '@mui/material';
import { useRouter } from 'next/navigation';

const QuestionList = () => {
  const { kbDetail, themeMode = 'light', mobile = false } = useStore();
  const router = useRouter();

  if (!kbDetail?.settings?.recommend_questions) return null;

  const handleQuestionClick = (question: string) => {
    sessionStorage.setItem('chat_search_query', question);
    router.push('/chat');
  };

  return (
    <Stack
      direction='row'
      alignItems={'center'}
      justifyContent={'center'}
      flexWrap='wrap'
      gap={2}
      sx={{
        mt: 3,
        px: 10,
        ...(mobile && {
          px: 0,
        }),
      }}
    >
      {kbDetail?.settings?.recommend_questions?.map(item => (
        <Box
          key={item}
          onClick={() => handleQuestionClick(item)}
          sx={{
            border: '1px solid',
            borderRadius: '16px',
            fontSize: 14,
            color: 'text.secondary',
            lineHeight: '32px',
            height: '32px',
            borderColor: 'divider',
            px: 2,
            cursor: 'pointer',
            bgcolor:
              themeMode === 'dark' ? 'background.paper' : 'background.default',
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main',
            },
          }}
        >
          {item}
        </Box>
      ))}
    </Stack>
  );
};

export default QuestionList;
