import { patchApiV1NavUpdate, postApiV1NavAdd } from '@/request/Nav';
import { V1NavListResp } from '@/request/types';
import { message, Modal } from '@ctzhian/ui';
import { Box, TextField } from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

type FormValues = { name: string };

interface NavEditModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (updated?: { id: string; name: string }) => void;
  nav: V1NavListResp | null;
  kb_id: string;
}

const NavEditModal = ({
  open,
  onClose,
  onSuccess,
  nav,
  kb_id,
}: NavEditModalProps) => {
  const isEdit = !!nav;
  const text = isEdit ? '修改' : '添加';

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: nav?.name || '',
    });
  }, [open, nav, reset]);

  const submit = (value: FormValues) => {
    if (isEdit && nav?.id) {
      patchApiV1NavUpdate({
        id: nav.id,
        kb_id,
        name: value.name,
      }).then(() => {
        message.success('修改成功');
        onSuccess({ id: nav.id!, name: value.name });
      });
    } else {
      postApiV1NavAdd({
        kb_id,
        name: value.name,
      }).then(() => {
        message.success('添加成功');
        onSuccess();
      });
    }
  };

  return (
    <Modal
      title={`${text}目录`}
      open={open}
      width={400}
      okText={isEdit ? '保存' : '添加'}
      onCancel={onClose}
      onOk={handleSubmit(submit)}
    >
      <Box sx={{ fontSize: 14, lineHeight: '36px' }}>目录名称</Box>
      <Controller
        control={control}
        name='name'
        rules={{ required: '请输入目录名称' }}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            autoFocus
            size='small'
            placeholder='请输入目录名称'
            error={!!errors.name}
            helperText={errors.name?.message}
          />
        )}
      />
    </Modal>
  );
};

export default NavEditModal;
