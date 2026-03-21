import { postApiV1UserCreate } from '@/request/User';
import { postApiV1KnowledgeBaseUserInvite } from '@/request/KnowledgeBase';
import Card from '@/components/Card';
import { copyText, generatePassword } from '@/utils';
import { CheckCircle } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { FormItem } from '@/components/Form';
import { Modal, message } from '@ctzhian/ui';
import { useState, useMemo, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAppSelector } from '@/store';
import { PROFESSION_VERSION_PERMISSION } from '@/constant/version';
import { VersionCanUse } from '@/components/VersionMask';
import { ConstsUserKBPermission } from '@/request/types';
import { ConstsLicenseEdition } from '@/request/pro/types';

type Role = 'admin' | 'user';

const PERM_OPTIONS = [
  {
    value: ConstsUserKBPermission.UserKBPermissionFullControl,
    label: '完全控制',
    description: '拥有所有权限',
    proOnly: false,
  },
  {
    value: ConstsUserKBPermission.UserKBPermissionDocManage,
    label: '文档管理',
    description: '创建编辑文档，但无法发布',
    proOnly: true,
  },
  {
    value: ConstsUserKBPermission.UserKBPermissionAuditManage,
    label: '审核管理',
    description: '无法编辑创建文档，但可以发布文档',
    proOnly: true,
  },
  {
    value: ConstsUserKBPermission.UserKBPermissionUserManage,
    label: '用户管理',
    description: '管理用户和管理员',
    proOnly: true,
  },
];

const VERSION_MAP = {
  [ConstsLicenseEdition.LicenseEditionFree]: {
    message: '开源版只支持 1 个管理员',
    max: 99999,
  },
  [ConstsLicenseEdition.LicenseEditionProfession]: {
    message: '专业版最多支持 20 个管理员',
    max: 20,
  },
  [ConstsLicenseEdition.LicenseEditionBusiness]: {
    message: '商业版最多支持 50 个管理员',
    max: 50,
  },
};

const MemberAdd = ({
  refresh,
  userLen,
}: {
  refresh: () => void;
  userLen: number;
}) => {
  const [addMember, setAddMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const { kbList, license, refreshAdminRequest } = useAppSelector(
    state => state.config,
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      account: '',
      role: 'user' as Role,
      kb_id: '',
      perms: [ConstsUserKBPermission.UserKBPermissionFullControl] as string[],
    },
  });

  const account = watch('account');
  const watchRole = watch('role');
  const watchKbId = watch('kb_id');
  const watchPerms = watch('perms');

  useEffect(() => {
    if (watchKbId) {
      setValue('perms', [ConstsUserKBPermission.UserKBPermissionFullControl]);
    }
  }, [watchKbId]);

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

  const onSubmit = handleSubmit(data => {
    setLoading(true);
    const password = generatePassword();
    const onSuccess = () => {
      setPassword(password);
      setAddMember(false);
      refresh();
    };
    postApiV1UserCreate({ account: data.account, password, role: data.role })
      .then(res => {
        if (data.kb_id && data.role === 'user') {
          postApiV1KnowledgeBaseUserInvite({
            kb_id: data.kb_id,
            // @ts-expect-error 类型错误
            user_id: res.id,
            perms: data.perms,
          }).then(() => {
            onSuccess();
            if (location.pathname.startsWith('/setting')) {
              refreshAdminRequest();
            }
          });
        }
        onSuccess();
      })
      .finally(() => {
        setLoading(false);
      });
  });

  const isPro = useMemo(() => {
    return PROFESSION_VERSION_PERMISSION.includes(license.edition!);
  }, [license.edition]);

  return (
    <>
      <Button
        size='small'
        variant='outlined'
        onClick={() => {
          const versionLimit =
            VERSION_MAP[license.edition as keyof typeof VERSION_MAP];
          if (versionLimit && userLen >= versionLimit.max) {
            message.error(versionLimit.message);
            return;
          }
          setAddMember(true);
        }}
      >
        添加新管理员
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
        <Card sx={{ p: 2, fontSize: 14, bgcolor: 'background.paper3' }}>
          <Stack direction={'row'}>
            <Box sx={{ width: 80 }}>用户名</Box>
            <Box sx={{ fontWeight: 700 }}>{account}</Box>
          </Stack>
          <Stack direction={'row'} sx={{ mt: 1 }}>
            <Box sx={{ width: 80 }}>密码</Box>
            <Box sx={{ fontWeight: 700 }}>{password}</Box>
          </Stack>
        </Card>
      </Modal>
      <Modal
        title='添加新管理员'
        open={addMember}
        onCancel={() => {
          setAddMember(false);
          reset();
        }}
        onOk={onSubmit}
        okButtonProps={{
          loading,
        }}
      >
        <FormItem label='用户名' required>
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
                placeholder='输入用户名'
                error={!!errors.account}
                helperText={errors.account?.message}
              />
            )}
          />
        </FormItem>

        <FormItem label='角色' required sx={{ mt: 2 }}>
          <Controller
            control={control}
            name='role'
            render={({ field }) => (
              <TextField {...field} fullWidth select>
                <MenuItem value='user'>普通管理员</MenuItem>
                <MenuItem value='admin'>超级管理员</MenuItem>
              </TextField>
            )}
          />
        </FormItem>

        {watchRole === 'user' && (
          <>
            <FormItem label='wiki 站' sx={{ mt: 2 }}>
              <Controller
                control={control}
                name='kb_id'
                render={({ field }) => (
                  <Select
                    {...field}
                    fullWidth
                    displayEmpty
                    renderValue={(value: string) =>
                      value ? (
                        kbList?.find(i => i.id === value)?.name || value
                      ) : (
                        <Box sx={{ color: '#9e9fa3' }}>请选择</Box>
                      )
                    }
                    sx={{ height: 52 }}
                  >
                    {kbList?.map(item => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormItem>
            <FormItem label='权限' sx={{ mt: 2 }}>
              <Controller
                control={control}
                name='perms'
                render={({ field }) => {
                  const isFullControl = field.value.includes(
                    ConstsUserKBPermission.UserKBPermissionFullControl,
                  );
                  const handleToggle = (permValue: string) => {
                    if (
                      permValue ===
                      ConstsUserKBPermission.UserKBPermissionFullControl
                    ) {
                      field.onChange([permValue]);
                      return;
                    }
                    let next = field.value.filter(
                      (v: string) =>
                        v !==
                        ConstsUserKBPermission.UserKBPermissionFullControl,
                    );
                    if (next.includes(permValue)) {
                      next = next.filter((v: string) => v !== permValue);
                    } else {
                      next = [...next, permValue];
                    }
                    if (next.length === 0) {
                      next = [
                        ConstsUserKBPermission.UserKBPermissionFullControl,
                      ];
                    }
                    field.onChange(next);
                  };
                  return (
                    <Stack gap={0.5}>
                      {PERM_OPTIONS.map(opt => (
                        <FormControlLabel
                          key={opt.value}
                          disabled={opt.proOnly && !isPro}
                          control={
                            <Checkbox
                              size='small'
                              checked={
                                isFullControl
                                  ? opt.value ===
                                    ConstsUserKBPermission.UserKBPermissionFullControl
                                  : field.value.includes(opt.value)
                              }
                              onChange={() => handleToggle(opt.value)}
                            />
                          }
                          label={
                            <Stack direction='row' alignItems='center' gap={1}>
                              <Box sx={{ fontSize: 14 }}>{opt.label}</Box>
                              <Box
                                sx={{
                                  fontSize: 12,
                                  color: 'text.tertiary',
                                }}
                              >
                                {opt.description}
                              </Box>
                              {opt.proOnly && !isPro && (
                                <VersionCanUse
                                  permission={PROFESSION_VERSION_PERMISSION}
                                />
                              )}
                            </Stack>
                          }
                        />
                      ))}
                    </Stack>
                  );
                }}
              />
            </FormItem>
          </>
        )}
      </Modal>
    </>
  );
};

export default MemberAdd;
