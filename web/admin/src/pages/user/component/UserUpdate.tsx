import { generatePassword } from '@/utils';
import { Box, Button, Stack, TextField, Autocomplete } from '@mui/material';
import { FormItem } from '@/components/Form';
import { Modal, message } from '@ctzhian/ui';
import { V1UserListItemResp } from '@/request/types';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  putApiV1UserGuestId,
  getApiV1UserGroups,
  putApiV1UserGroups,
  getApiV1UserAuthGroupList,
} from '@/request/User';
import { useAppSelector } from '@/store';

type UserUpdateProps = {
  user: V1UserListItemResp;
  refresh: () => void;
  onClose: () => void;
};

interface AuthGroupOption {
  id: number;
  name: string;
  path: string;
}

const UserUpdate = ({ user, refresh, onClose }: UserUpdateProps) => {
  const { kbList } = useAppSelector(state => state.config);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allGroups, setAllGroups] = useState<AuthGroupOption[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [initialGroups, setInitialGroups] = useState<AuthGroupOption[]>([]);
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      password: '',
      groups: [] as AuthGroupOption[],
    },
  });

  useEffect(() => {
    setUpdateOpen(true);
    if (user.id) {
      loadUserGroups();
      loadAllGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAllGroups = () => {
    if (!kbList || kbList.length === 0) return;
    setLoadingGroups(true);
    // 获取所有知识库的用户组
    const promises = kbList.map(kb =>
      getApiV1UserAuthGroupList({ kb_id: kb.id })
        .then(
          (data: {
            data?: {
              groups?: Array<{ id: number; name: string; path?: string }>;
            };
            groups?: Array<{ id: number; name: string; path?: string }>;
          }) => {
            const groups = data?.data?.groups || data?.groups || [];
            return groups.map(g => ({
              id: g.id,
              name: g.name,
              path: g.path || g.name,
            }));
          },
        )
        .catch(() => []),
    );
    Promise.all(promises).then(results => {
      const allGroupsList = results.flat();
      setAllGroups(allGroupsList);
      setLoadingGroups(false);
    });
  };

  const loadUserGroups = () => {
    if (!user.id) return;
    setLoadingGroups(true);
    getApiV1UserGroups({ user_id: user.id })
      .then(
        (data: {
          data?: {
            groups?: Array<{ id: number; name: string; path?: string }>;
          };
        }) => {
          const groups = data?.data?.groups || [];
          const groupOptions = groups.map(g => ({
            id: g.id,
            name: g.name,
            path: g.path || g.name,
          }));
          setValue('groups', groupOptions);
          setInitialGroups(groupOptions); // 保存初始用户组，用于比较变化
        },
      )
      .catch((err: Error) => {
        console.error('获取用户组失败:', err);
        setValue('groups', []);
        setInitialGroups([]);
      })
      .finally(() => {
        setLoadingGroups(false);
      });
  };

  const onSubmit = handleSubmit(data => {
    if (!user.id) {
      message.error('用户ID不存在');
      return;
    }

    // 检查是否有实际变化
    const hasPasswordChange = !!data.password;
    const currentGroupIds = (data.groups || []).map(g => g.id).sort();
    const initialGroupIds = initialGroups.map(g => g.id).sort();
    const hasGroupChange =
      JSON.stringify(currentGroupIds) !== JSON.stringify(initialGroupIds);

    if (!hasPasswordChange && !hasGroupChange) {
      message.warning('请至少修改密码或用户组');
      return;
    }

    setLoading(true);

    const promises: Promise<unknown>[] = [];

    // 如果修改了密码，更新密码
    if (hasPasswordChange) {
      promises.push(
        putApiV1UserGuestId({
          id: user.id,
          body: {
            account: user.account || '',
            password: data.password,
            role: 'guest',
          } as unknown as import('@/request/types').V1CreateUserReq,
        }),
      );
    }

    // 如果修改了用户组，更新用户组（允许空数组来清除所有用户组）
    if (hasGroupChange) {
      const groupIds = data.groups?.map(g => g.id) || [];
      promises.push(
        putApiV1UserGroups({ user_id: user.id, group_ids: groupIds }),
      );
    }

    Promise.all(promises)
      .then(() => {
        message.success('更新成功');
        setUpdateOpen(false);
        refresh();
        onClose();
      })
      .catch((err: Error) => {
        message.error(err?.message || '更新失败');
      })
      .finally(() => {
        setLoading(false);
      });
  });

  return (
    <Modal
      title='编辑用户'
      open={updateOpen}
      onCancel={() => {
        setUpdateOpen(false);
        reset();
        onClose();
      }}
      onOk={onSubmit}
      okButtonProps={{
        loading,
      }}
    >
      <Box sx={{ fontSize: 14, lineHeight: '32px' }}>用户名</Box>
      <Box
        sx={{
          lineHeight: '36px',
          bgcolor: 'background.paper3',
          px: '14px',
          borderRadius: '10px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'not-allowed',
          mb: 2,
        }}
      >
        {user.account}
      </Box>
      <FormItem label='新密码'>
        <Stack direction={'row'} alignItems={'center'} gap={2}>
          <Controller
            control={control}
            name='password'
            rules={{
              minLength: {
                value: 8,
                message: '密码长度至少 8 位',
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                autoFocus
                size='small'
                placeholder='留空则不修改密码'
                error={!!errors.password}
                helperText={errors.password?.message || '留空则不修改密码'}
              />
            )}
          />
          <Button
            size='small'
            variant='outlined'
            onClick={() => setValue('password', generatePassword())}
          >
            生成
          </Button>
        </Stack>
      </FormItem>
      <FormItem label='用户组' sx={{ mt: 2 }}>
        <Controller
          control={control}
          name='groups'
          render={({ field }) => (
            <Autocomplete
              {...field}
              multiple
              options={allGroups}
              getOptionLabel={option => option.path}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={loadingGroups}
              onChange={(_, value) => {
                field.onChange(value);
              }}
              renderInput={params => (
                <TextField
                  {...params}
                  size='small'
                  placeholder='选择用户组'
                  helperText='选择该用户所属的用户组'
                />
              )}
            />
          )}
        />
      </FormItem>
    </Modal>
  );
};

export default UserUpdate;
