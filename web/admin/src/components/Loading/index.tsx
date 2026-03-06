import { CircularProgress, SxProps, Stack } from '@mui/material';

interface LoadingProps {
  /** 提示文案 */
  text?: string;
  /** loading 圈大小，默认 24 */
  size?: number;
  sx?: SxProps;
}

const Loading = ({ text, size = 24, sx }: LoadingProps) => {
  return (
    <Stack
      alignItems='center'
      justifyContent='center'
      gap={1}
      sx={{ py: 8, ...sx }}
    >
      <CircularProgress size={size} />
      {text && (
        <Stack
          sx={{
            fontSize: 12,
            color: 'text.tertiary',
          }}
        >
          {text}
        </Stack>
      )}
    </Stack>
  );
};

export default Loading;
