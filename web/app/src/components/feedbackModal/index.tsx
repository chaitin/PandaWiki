import { useStore } from '@/provider';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { message, Modal } from 'ct-mui';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  selectedText: string;
  screenshot?: string; // base64 截图数据
  onSubmit: (data: { correction_suggestion: string }) => void;
}

interface FeedbackFormData {
  correction_suggestion: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  open,
  onClose,
  selectedText,
  screenshot,
  onSubmit,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { themeMode } = useStore();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormData>({
    defaultValues: {
      correction_suggestion: '',
    },
  });

  const handleFormSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      reset();
      onClose();
      message.success('提交反馈成功');
    } catch (error) {
      console.error('提交反馈失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleOk = () => {
    // 手动触发表单提交
    handleSubmit(handleFormSubmit)();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={700}
      title='文档纠错'
      okText='提交反馈'
      cancelText='取消'
      onOk={handleOk}
      okButtonProps={{
        loading: isSubmitting,
      }}
    >
      <Stack gap={3}>
        {/* 选中的文本内容 */}
        <Box>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
          >
            纠错内容
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.default',
              borderRadius: '10px',
            }}
          >
            <Typography
              variant='body2'
              sx={{
                color: 'text.primary',
                lineHeight: 1.6,
                maxHeight: 120,
                overflow: 'auto',
                wordBreak: 'break-all',
              }}
            >
              {selectedText}
            </Typography>
          </Box>
        </Box>
        {/* 反馈意见 */}
        <Box>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
          >
            反馈意见
            <Box component='span' sx={{ color: 'error.main', ml: 0.5 }}>
              *
            </Box>
          </Typography>
          <Controller
            name='correction_suggestion'
            control={control}
            rules={{
              required: '请输入反馈意见',
              minLength: {
                value: 5,
                message: '反馈意见至少需要5个字符',
              },
            }}
            render={({ field }) => (
              <TextField
                value={field.value || ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                placeholder='请详细描述您遇到的问题或建议...'
                fullWidth
                multiline
                minRows={4}
                maxRows={8}
                error={!!errors.correction_suggestion}
                helperText={errors.correction_suggestion?.message}
                disabled={isSubmitting}
                sx={{
                  '.MuiInputBase-root': {
                    overflow: 'hidden',
                    transition: 'all 0.5s ease-in-out',
                    bgcolor:
                      themeMode === 'dark'
                        ? 'background.paper2'
                        : 'background.default',
                  },
                }}
              />
            )}
          />
        </Box>

        {/* 页面截图 */}
        {screenshot && (
          <Box>
            <Typography
              variant='subtitle2'
              sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}
            >
              页面截图
            </Typography>
            <Box
              sx={{
                borderRadius: '10px',
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'center',
                bgcolor: 'background.default',
              }}
            >
              <img
                src={screenshot}
                alt='页面截图'
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                }}
              />
            </Box>
          </Box>
        )}
      </Stack>
    </Modal>
  );
};

export default FeedbackModal;
