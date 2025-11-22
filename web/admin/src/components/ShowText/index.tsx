import { copyText } from '@/utils';
import { Box, Stack } from '@mui/material';
import { Ellipsis } from '@ctzhian/ui';
import { IconFuzhi } from '@panda-wiki/icons';
import { message } from '@ctzhian/ui';

interface ShowTextProps {
  text: string[];
  copyable?: boolean;
  showIcon?: boolean;
  noEllipsis?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  forceCopy?: boolean;
}

const ShowText = ({
  text,
  copyable = true,
  showIcon = true,
  icon = (
    <IconFuzhi sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
  ),
  onClick,
  noEllipsis = false,
  forceCopy = false,
}: ShowTextProps) => {
  return (
    <Stack
      direction={'row'}
      alignItems={'flex-start'}
      justifyContent={'space-between'}
      gap={1}
      sx={{
        width: '100%',
        fontSize: 12,
        px: 2,
        py: 2,
        lineHeight: '20px',
        fontFamily: 'monospace',
        bgcolor: 'background.paper3',
        borderRadius: '10px',
        cursor: copyable ? 'pointer' : 'default',
        '&:hover': {
          color: 'primary.main',
          svg: {
            color: 'primary.main',
          },
        },
      }}
      onClick={
        copyable
          ? () => {
              const content = text.join('\n');
              if (forceCopy) {
                try {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(content);
                    message.success('复制成功');
                  } else {
                    const ta = document.createElement('textarea');
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    ta.style.left = '-9999px';
                    ta.style.top = '-9999px';
                    ta.value = content;
                    document.body.appendChild(ta);
                    ta.focus();
                    ta.select();
                    const ok = document.execCommand('copy');
                    if (ok) message.success('复制成功');
                    document.body.removeChild(ta);
                  }
                } catch (e) {}
                onClick?.();
              } else {
                copyText(content);
                onClick?.();
              }
            }
          : onClick
      }
    >
      <Stack sx={{ flex: 1, width: 0, lineHeight: '20px' }} gap={0.25}>
        {text.map(it =>
          !noEllipsis ? (
            <Ellipsis key={it}>{it}</Ellipsis>
          ) : (
            <Box key={it} sx={{ wordBreak: 'break-all', minHeight: '20px' }}>
              {it}
            </Box>
          ),
        )}
      </Stack>
      {showIcon && icon}
    </Stack>
  );
};

export default ShowText;
