import Card from '@/components/Card';
import { deleteApiV1KnowledgeBaseRelease } from '@/request/KnowledgeBase';
import { useAppSelector } from '@/store';
import { message, Modal } from '@ctzhian/ui';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ErrorIcon from '@mui/icons-material/Error';
import { Box, Stack, useTheme } from '@mui/material';
import { useState } from 'react';

interface VersionDeleteProps {
  open: boolean;
  onClose: () => void;
  data: { id: string; version: string; created_at: string; remark: string };
  refresh?: () => void;
}

const VersionDelete = ({
  open,
  onClose,
  data,
  refresh,
}: VersionDeleteProps) => {
  const theme = useTheme();
  const { kb_id } = useAppSelector(state => state.config);
  const [submitting, setSubmitting] = useState(false);
  if (!data) return null;

  const submit = () => {
    if (!data?.id || !kb_id || submitting) return;
    setSubmitting(true);
    deleteApiV1KnowledgeBaseRelease({
      kb_id,
      release_id: data.id,
    })
      .then(() => {
        message.success('删除成功');
        onClose();
        refresh?.();
      })
      .catch(() => {
        // httpClient 已统一弹错误提示（如当前版本不能删除）
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <Modal
      title={
        <Stack direction='row' alignItems='center' gap={1}>
          <ErrorIcon sx={{ color: 'warning.main' }} />
          确认删除以下版本？
        </Stack>
      }
      open={open}
      width={600}
      okText='删除'
      okButtonProps={{ sx: { bgcolor: 'error.main' } }}
      onCancel={onClose}
      onOk={submit}
    >
      <Card
        sx={{
          fontSize: 14,
          p: 1,
          px: 2,
          maxHeight: 'calc(100vh - 250px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          bgcolor: 'background.paper3',
        }}
      >
        <Stack
          direction='row'
          alignItems={'center'}
          gap={2}
          sx={{
            borderBottom: '1px solid',
            borderColor: theme.palette.divider,
            py: 1,
          }}
        >
          <ArrowForwardIosIcon sx={{ fontSize: 12, mt: '4px' }} />
          <Box sx={{ width: '100%' }}>
            <Box sx={{ fontSize: 16, fontWeight: 500 }}>
              {data.version || '-'}
            </Box>
            <Box sx={{ fontSize: 12, color: 'text.tertiary' }}>
              {data.remark || '-'}
            </Box>
          </Box>
        </Stack>
      </Card>
    </Modal>
  );
};

export default VersionDelete;
