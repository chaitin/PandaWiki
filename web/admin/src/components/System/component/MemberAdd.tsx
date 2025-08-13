import { createUser } from '@/api';
import Card from '@/components/Card';
import { copyText, generatePassword } from '@/utils';
import { CheckCircle } from '@mui/icons-material';
import { Box, Button, Stack, TextField } from '@mui/material';
import { Modal } from 'ct-mui';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

const MemberAdd = ({ refresh }: { refresh: () => void }) => {
  const [addMember, setAddMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    defaultValues: {
      account: '',
    },
  });

  const account = watch('account');

  const copyUserInfo = ({
    account,
    password,
  }: {
    account: string;
    password: string;
  }) => {
    copyText(`用户名: ${account}\n密码: ${password}`, () => {
      setPassword('');
      reset();
    });
  };

  const onSumbit = ({ account }: { account: string }) => {
    setLoading(true);
    const password = generatePassword();
    createUser({ account, password })
      .then(() => {
        setPassword(password);
        setAddMember(false);
        refresh();
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <Button
        size='small'
        variant='outlined'
        onClick={() => setAddMember(true)}
      >
        添加新用户
      </Button>
      <Modal
        title={
          <Stack direction='row' alignItems='center' gap={1}>
            <CheckCircle sx={{ color: 'success.main' }} />
            新用户创建成功
          </Stack>
        }
        open={!!password}
        closable={false}
        cancelText='关闭'
        onCancel={() => {
          setPassword('');
          reset();
        }}
        okText='复制用户信息'
        okButtonProps={{
          sx: { minWidth: '120px' },
        }}
        onOk={() => copyUserInfo({ account, password })}
      >
        <Card sx={{ p: 2, fontSize: 14, bgcolor: 'background.paper2' }}>
          <Stack direction={'row'}>
            <Box sx={{ width: 80 }}>用户名</Box>
            <Box sx={{ fontFamily: 'Gbold' }}>{account}</Box>
          </Stack>
          <Stack direction={'row'} sx={{ mt: 1 }}>
            <Box sx={{ width: 80 }}>密码</Box>
            <Box sx={{ fontFamily: 'Gbold' }}>{password}</Box>
          </Stack>
        </Card>
      </Modal>
      <Modal
        title='添加新用户'
        open={addMember}
        onCancel={() => {
          setAddMember(false);
          reset();
        }}
        onOk={handleSubmit(onSumbit)}
        okButtonProps={{
          loading,
        }}
      >
        <Box sx={{ fontSize: 14, lineHeight: '32px', mb: 1 }}>
          用户名{' '}
          <Box component={'span'} sx={{ color: 'red' }}>
            *
          </Box>
        </Box>
        <Controller
          control={control}
          name='account'
          rules={{
            required: {
              value: true,
              message: '用户名不能为空',
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              autoFocus
              size='small'
              placeholder='输入用户名'
              error={!!errors.account}
              helperText={errors.account?.message}
            />
          )}
        />
      </Modal>
    </>
  );
};

export default MemberAdd;
