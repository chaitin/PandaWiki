import { NodeDetail } from '@/api';
import { Box, Button, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import Summary from './Summary';

interface EditorSummaryProps {
  kb_id: string;
  readonly?: boolean;
  id: string;
  name: string;
  summary: string;
  detail?: NodeDetail | null;
  setDetail?: (data: NodeDetail) => void;
  resetTimer?: () => void;
  cancelTimer?: () => void;
}

const EditorSummary = ({
  kb_id,
  id,
  name,
  summary: defaultSummary,
  detail,
  setDetail,
  resetTimer,
  cancelTimer,
  readonly = false,
}: EditorSummaryProps) => {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(defaultSummary || '');

  useEffect(() => {
    setSummary(defaultSummary || '');
  }, [defaultSummary]);

  return (
    <>
      <Stack
        sx={{
          width: 292,
          borderRadius: '6px',
          bgcolor: 'background.paper',
        }}
      >
        <Stack
          direction={'row'}
          alignItems={'center'}
          justifyContent={'space-between'}
          sx={{
            p: 2,
            px: 3,
            borderBottom: '2px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              fontSize: 16,
              fontWeight: 'bold',
            }}
          >
            内容摘要
          </Box>
          {!!summary && !readonly && (
            <Button
              sx={{ minWidth: 0, p: 0, height: 24 }}
              onClick={() => {
                cancelTimer?.();
                setOpen(true);
              }}
            >
              修改
            </Button>
          )}
        </Stack>
        <Stack
          gap={1}
          sx={{
            py: 2,
            px: 3,
            fontSize: 14,
          }}
        >
          {readonly ? (
            <Stack
              direction={'row'}
              alignItems={'center'}
              justifyContent={'center'}
              sx={{ fontSize: 12, color: 'text.auxiliary' }}
            >
              暂无摘要
            </Stack>
          ) : !summary ? (
            <Stack
              direction={'row'}
              alignItems={'center'}
              justifyContent={'center'}
              sx={{ fontSize: 12, color: 'text.auxiliary' }}
            >
              暂无摘要，
              <Button
                sx={{ minWidth: 0, p: 0, fontSize: 12 }}
                onClick={() => {
                  cancelTimer?.();
                  setOpen(true);
                }}
              >
                去生成
              </Button>
            </Stack>
          ) : (
            <Box
              sx={{
                fontSize: 14,
                color: 'text.secondary',
                wordBreak: 'break-all',
                maxHeight: '210px',
                overflowY: 'auto',
                overflowX: 'hidden',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
              }}
            >
              {summary}
            </Box>
          )}
        </Stack>
      </Stack>
      {!readonly && (
        <Summary
          open={open}
          kb_id={kb_id}
          data={{ id, name, summary }}
          onClose={() => {
            setOpen(false);
            resetTimer?.();
          }}
          refresh={value => {
            setSummary(value || '');
            if (detail) {
              setDetail?.({
                ...detail,
                status: 1,
                meta: { ...detail.meta, summary: value || '' },
              });
            }
          }}
        />
      )}
    </>
  );
};

export default EditorSummary;
