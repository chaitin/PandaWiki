import { AuthSetting } from '@/api/type';
import { ConstsSourceType } from '@/request/pro/types';
import dayjs from 'dayjs';
import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Select,
  MenuItem,
  Link,
  styled,
  Autocomplete,
  Chip,
} from '@mui/material';
import NoData from '@/assets/images/nodata.png';
import { putApiV1KnowledgeBaseDetail } from '@/request/KnowledgeBase';
import { DomainKnowledgeBaseDetail } from '@/request/types';
import { GithubComChaitinPandaWikiProApiAuthV1AuthItem } from '@/request/pro/types';
import { getApiProV1AuthGet, postApiProV1AuthSet } from '@/request/pro/Auth';
import { StyledFormLabel } from '@/components/Form';
import InfoIcon from '@mui/icons-material/Info';
import { Message, Table, Icon } from 'ct-mui';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAppSelector } from '@/store';

interface CardAuthProps {
  kb: DomainKnowledgeBaseDetail;
  refresh: (value: AuthSetting) => void;
}

const sourceTypeIcon = {
  [ConstsSourceType.SourceTypeDingTalk]: 'icon-dingdingjiqiren',
  [ConstsSourceType.SourceTypeFeishu]: 'icon-feishujiqiren',
  [ConstsSourceType.SourceTypeWeCom]: 'icon-qiyeweixinjiqiren',
};

const StyledFormItem = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  margin: theme.spacing(2, 2, 0),
}));

export const FormItem = ({
  label,
  children,
  required,
}: {
  label: string | React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
}) => {
  return (
    <StyledFormItem>
      <StyledFormLabel required={required} sx={{ width: 156, flexShrink: 0 }}>
        {label}
      </StyledFormLabel>
      {children}
    </StyledFormItem>
  );
};

const CardAuth = ({ kb, refresh }: CardAuthProps) => {
  const { license, kb_id } = useAppSelector(state => state.config);
  const [isEdit, setIsEdit] = useState(false);
  const [scopeInputValue, setScopeInputValue] = useState('');
  const [memberList, setMemberList] = useState<
    GithubComChaitinPandaWikiProApiAuthV1AuthItem[]
  >([]);
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      enabled: '1',
      password: '',
      client_id: '',
      client_secret: '',
      source_type: kb.access_settings?.source_type as ConstsSourceType,
      agent_id: '',
      token_url: '',
      authorize_url: '',
      avatar_field: '',
      scopes: [] as string[],
      user_info_url: '',
      id_field: '',
      name_field: '',
      email_field: '',
      cas_url: '',
      cas_version: '2',
      // ldap
      bind_dn: '',
      bind_password: '',
      ldap_server_url: '',
      user_base_dn: '',
      user_filter: '',
    },
  });

  const source_type = watch('source_type');
  const userInfoUrl = watch('user_info_url');
  const enabled = watch('enabled');

  const onSubmit = handleSubmit(value => {
    Promise.all([
      putApiV1KnowledgeBaseDetail({
        id: kb.id!,
        access_settings: {
          ...kb.access_settings,
          simple_auth: {
            enabled: value.enabled === '2',
            password: value.password,
          },
          enterprise_auth: {
            enabled: value.enabled === '3',
          },
          source_type: value.source_type,
        },
      }),
      value.enabled === '3' && isEnterprise
        ? postApiProV1AuthSet({
            kb_id,
            source_type: value.source_type,
            client_id: value.client_id,
            client_secret: value.client_secret,
            agent_id: value.agent_id,
            token_url: value.token_url,
            authorize_url: value.authorize_url,
            scopes: value.scopes,
            user_info_url: value.user_info_url,
            id_field: value.id_field,
            name_field: value.name_field,
            avatar_field: value.avatar_field,
            email_field: value.email_field,
            cas_url: value.cas_url,
            cas_version: value.cas_version,
            // ldap
            bind_dn: value.bind_dn,
            bind_password: value.bind_password,
            ldap_server_url: value.ldap_server_url,
            user_base_dn: value.user_base_dn,
            user_filter: value.user_filter,
          })
        : Promise.resolve(),
    ]).then(() => {
      refresh({
        enabled: value.enabled === '2',
        password: value.password,
      });
      Message.success('保存成功');
      setIsEdit(false);
    });
  });

  const isEnterprise = useMemo(() => {
    return license.edition === 2;
  }, [license]);

  useEffect(() => {
    setValue(
      'source_type',
      kb.access_settings?.source_type || ConstsSourceType.SourceTypeDingTalk,
    );
  }, [kb]);

  useEffect(() => {
    if (kb.access_settings?.simple_auth) {
      setValue('enabled', kb.access_settings.simple_auth.enabled ? '2' : '1');
      setValue('password', kb.access_settings.simple_auth.password ?? '');
    }
    if (kb.access_settings?.enterprise_auth?.enabled && isEnterprise) {
      setValue('enabled', '3');
    }
  }, [kb, isEnterprise]);

  useEffect(() => {
    if (!isEnterprise || !kb_id || enabled !== '3') return;
    getApiProV1AuthGet({
      kb_id,
      source_type: source_type,
    }).then(res => {
      setMemberList(res.auths || []);
      setValue('client_id', res.client_id!);
      setValue('client_secret', res.client_secret!);
      setValue('agent_id', res.agent_id!);
      setValue('scopes', res.scopes || []);
      setValue('token_url', res.token_url!);
      setValue('authorize_url', res.authorize_url!);
      setValue('user_info_url', res.user_info_url!);
      setValue('id_field', res.id_field!);
      setValue('name_field', res.name_field!);
      setValue('avatar_field', res.avatar_field!);
      setValue('email_field', res.email_field!);
      setValue('cas_url', res.cas_url!);
      setValue('cas_version', res.cas_version!);
      // ldap
      setValue('bind_dn', res.bind_dn!);
      setValue('bind_password', res.bind_password!);
      setValue('ldap_server_url', res.ldap_server_url!);
      setValue('user_base_dn', res.user_base_dn!);
      setValue('user_filter', res.user_filter!);
    });
  }, [kb_id, isEnterprise, source_type, enabled]);

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      render: (text: string) => {
        return (
          <Stack direction={'row'} alignItems={'center'} gap={1}>
            {sourceTypeIcon[source_type as keyof typeof sourceTypeIcon] && (
              <Icon
                type={
                  sourceTypeIcon[source_type as keyof typeof sourceTypeIcon]
                }
                sx={{ fontSize: 16 }}
              />
            )}
            {text}
          </Stack>
        );
      },
    },
    {
      title: 'created_at',
      dataIndex: 'created_at',
      render: (
        text: string,
        record: GithubComChaitinPandaWikiProApiAuthV1AuthItem,
      ) => {
        return (
          <Box sx={{ color: 'text.secondary' }}>
            {dayjs(text).fromNow()}加入，
            {dayjs(record.last_login_time).fromNow()}活跃
          </Box>
        );
      },
    },
  ];

  const oauthForm = () => {
    return (
      <>
        <FormItem label='Access Token URL' required>
          <Controller
            control={control}
            rules={{
              required: 'Access Token URL 不能为空',
            }}
            name='token_url'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.token_url}
                helperText={errors.token_url?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </FormItem>
        <FormItem label='Authorize URL' required>
          <Controller
            control={control}
            name='authorize_url'
            rules={{
              required: 'Authorize URL 不能为空',
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.authorize_url}
                helperText={errors.authorize_url?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </FormItem>
        <FormItem label='Client ID' required>
          <Controller
            control={control}
            name='client_id'
            rules={{
              required: 'Client ID 不能为空',
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.client_id}
                helperText={errors.client_id?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </FormItem>
        <FormItem label='Client Secret' required>
          <Controller
            control={control}
            name='client_secret'
            rules={{
              required: 'Client Secret 不能为空',
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.client_secret}
                helperText={errors.client_secret?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </FormItem>

        <FormItem label='Scope' required>
          <Controller
            name='scopes'
            control={control}
            rules={{
              validate: value => {
                if (value.length === 0) {
                  return 'Scope 不能为空';
                }
                return true;
              },
            }}
            render={({ field }) => (
              <Autocomplete
                multiple
                id='scopes'
                fullWidth
                options={[]}
                value={field.value}
                inputValue={scopeInputValue}
                onChange={(_, value) => {
                  setIsEdit(true);
                  field.onChange(value);
                }}
                onInputChange={(_, value) => {
                  setScopeInputValue(value);
                }}
                freeSolo
                renderTags={(value: readonly string[], getTagProps) =>
                  value.map((option: string, index: number) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    const label = `${option}`;
                    return <Chip key={key} label={label} {...tagProps} />;
                  })
                }
                renderInput={params => (
                  <TextField
                    {...params}
                    required
                    placeholder='请输入（可多个, 回车键确认）'
                    error={Boolean(errors.scopes)}
                    helperText={errors.scopes?.message as string}
                    fullWidth
                    onBlur={() => {
                      // 失去焦点时自动添加当前输入的值
                      const trimmedValue = scopeInputValue.trim();
                      if (trimmedValue && !field.value.includes(trimmedValue)) {
                        setIsEdit(true);
                        field.onChange([...field.value, trimmedValue]);
                        // 清空输入框
                        setScopeInputValue('');
                      }
                    }}
                  />
                )}
              />
            )}
          />
        </FormItem>
        <FormItem label='用户信息 URL' required>
          <Controller
            control={control}
            name='user_info_url'
            rules={{
              required: '用户信息 URL 不能为空',
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.user_info_url}
                helperText={errors.user_info_url?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </FormItem>
        {userInfoUrl && (
          <>
            <FormItem label='ID 字段' required>
              <Controller
                control={control}
                name='id_field'
                rules={{
                  required: 'ID 字段 不能为空',
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder='请输入'
                    error={!!errors.id_field}
                    helperText={errors.id_field?.message}
                    onChange={e => {
                      field.onChange(e.target.value);
                      setIsEdit(true);
                    }}
                  />
                )}
              />
            </FormItem>
            <FormItem label='用户名字段' required>
              <Controller
                control={control}
                name='name_field'
                rules={{
                  required: '用户名字段不能为空',
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder='请输入'
                    error={!!errors.name_field}
                    helperText={errors.name_field?.message}
                    onChange={e => {
                      field.onChange(e.target.value);
                      setIsEdit(true);
                    }}
                  />
                )}
              />
            </FormItem>
            <FormItem label='头像字段' required>
              <Controller
                control={control}
                name='avatar_field'
                rules={{
                  required: '头像字段不能为空',
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder='请输入'
                    error={!!errors.avatar_field}
                    helperText={errors.avatar_field?.message}
                    onChange={e => {
                      field.onChange(e.target.value);
                      setIsEdit(true);
                    }}
                  />
                )}
              />
            </FormItem>
            <FormItem label='邮箱字段' required>
              <Controller
                control={control}
                name='email_field'
                rules={{
                  required: '邮箱字段不能为空',
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder='请输入'
                    error={!!errors.email_field}
                    helperText={errors.email_field?.message}
                    onChange={e => {
                      field.onChange(e.target.value);
                      setIsEdit(true);
                    }}
                  />
                )}
              />
            </FormItem>
          </>
        )}
      </>
    );
  };

  const casForm = () => {
    return (
      <>
        <FormItem label='CAS URL' required>
          <Controller
            control={control}
            rules={{
              required: 'CAS URL 不能为空',
            }}
            name='cas_url'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.cas_url}
                helperText={errors.cas_url?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </FormItem>
        <FormItem label='CAS Version' required>
          <Controller
            control={control}
            name='cas_version'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.cas_version}
                helperText={errors.cas_version?.message}
                select
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              >
                <MenuItem value='2'>2</MenuItem>
                <MenuItem value='3'>3</MenuItem>
              </TextField>
            )}
          />
        </FormItem>
      </>
    );
  };

  const ldapForm = () => {
    return (
      <>
        <FormItem label='LDAP Server URL' required>
          <Controller
            control={control}
            rules={{
              required: 'LDAP Server URL 不能为空',
            }}
            name='ldap_server_url'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.cas_url}
                helperText={errors.ldap_server_url?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </FormItem>
        <FormItem label='Bind DN' required>
          <Controller
            control={control}
            name='bind_dn'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.bind_dn}
                helperText={errors.bind_dn?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </FormItem>
        <FormItem label='Bind Password' required>
          <Controller
            control={control}
            name='bind_password'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.bind_password}
                helperText={errors.bind_password?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </FormItem>
        <FormItem label='用户 Base DN' required>
          <Controller
            control={control}
            name='user_base_dn'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.user_base_dn}
                helperText={errors.user_base_dn?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </FormItem>
        <FormItem label='用户查询条件' required>
          <Controller
            control={control}
            name='user_filter'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.user_filter}
                helperText={errors.user_filter?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </FormItem>
      </>
    );
  };

  return (
    <>
      <Stack
        direction='row'
        alignItems={'center'}
        justifyContent={'space-between'}
        sx={{
          m: 2,
          height: 32,
          fontWeight: 'bold',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            '&::before': {
              content: '""',
              display: 'inline-block',
              width: 4,
              height: 12,
              bgcolor: 'common.black',
              borderRadius: '2px',
              mr: 1,
            },
          }}
        >
          访问认证{' '}
        </Box>
        <Box sx={{ flexGrow: 1, ml: 1 }}>
          <Link
            component='a'
            href='https://pandawiki.docs.baizhi.cloud/node/01986040-602c-736c-b99f-0b3cb9bb89e5'
            target='_blank'
            sx={{
              fontSize: 14,
              textDecoration: 'none',
              fontWeight: 'normal',
              '&:hover': {
                fontWeight: 'bold',
              },
            }}
          >
            使用方法
          </Link>
        </Box>
        {isEdit && (
          <Button variant='contained' size='small' onClick={onSubmit}>
            保存
          </Button>
        )}
      </Stack>
      <Stack direction={'row'} gap={2} sx={{ mx: 2, mb: 2 }}>
        <Box
          sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}
        >
          可访问性
        </Box>
        <Controller
          control={control}
          name='enabled'
          render={({ field }) => (
            <RadioGroup
              row
              {...field}
              value={field.value}
              onChange={e => {
                field.onChange(e.target.value);
                setIsEdit(true);
              }}
            >
              <FormControlLabel
                value={'1'}
                control={<Radio size='small' />}
                label={<Box sx={{ width: 65 }}>公开访问</Box>}
              />
              <FormControlLabel
                value={'2'}
                control={<Radio size='small' />}
                label={<Box sx={{ width: 95 }}>简单口令访问</Box>}
              />
              <FormControlLabel
                value={'3'}
                control={<Radio size='small' disabled={!isEnterprise} />}
                label={
                  <Stack
                    direction='row'
                    alignItems='center'
                    gap={0.5}
                    sx={{ width: 135 }}
                  >
                    企业级身份认证
                    {!isEnterprise && (
                      <Tooltip title='企业版可用' placement='top' arrow>
                        <InfoIcon
                          sx={{ color: 'text.secondary', fontSize: 14 }}
                        />
                      </Tooltip>
                    )}
                  </Stack>
                }
              />
            </RadioGroup>
          )}
        />
      </Stack>
      {enabled === '2' && (
        <Stack direction={'row'} gap={2} alignItems={'center'} sx={{ mx: 2 }}>
          <Box
            sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}
          >
            访问口令
          </Box>
          <Controller
            control={control}
            name='password'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
                placeholder='输入访问口令'
              />
            )}
          />
        </Stack>
      )}
      {enabled === '3' && (
        <>
          <Stack direction={'row'} gap={2} alignItems={'center'} sx={{ mx: 2 }}>
            <Box
              sx={{
                width: 156,
                fontSize: 14,
                lineHeight: '32px',
                flexShrink: 0,
              }}
            >
              登录方式
            </Box>
            <Controller
              control={control}
              name='source_type'
              render={({ field }) => (
                <Select
                  {...field}
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  fullWidth
                  sx={{ height: 53 }}
                >
                  <MenuItem value={ConstsSourceType.SourceTypeDingTalk}>
                    钉钉登录
                  </MenuItem>
                  <MenuItem value={ConstsSourceType.SourceTypeFeishu}>
                    飞书登录
                  </MenuItem>
                  <MenuItem value={ConstsSourceType.SourceTypeWeCom}>
                    企业微信登录
                  </MenuItem>
                  <MenuItem value={ConstsSourceType.SourceTypeOAuth}>
                    OAuth 登录
                  </MenuItem>
                  <MenuItem value={ConstsSourceType.SourceTypeCAS}>
                    CAS 登录
                  </MenuItem>
                  <MenuItem value={ConstsSourceType.SourceTypeLDAP}>
                    LDAP 登录
                  </MenuItem>
                </Select>
              )}
            />
          </Stack>

          {[
            ConstsSourceType.SourceTypeDingTalk,
            ConstsSourceType.SourceTypeFeishu,
            ConstsSourceType.SourceTypeWeCom,
          ].includes(source_type as ConstsSourceType) && (
            <>
              <FormItem label='Client ID' required>
                <Controller
                  control={control}
                  name='client_id'
                  rules={{
                    required: {
                      value: true,
                      message: 'Client Id 不能为空',
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      onChange={e => {
                        field.onChange(e.target.value);
                        setIsEdit(true);
                      }}
                      fullWidth
                      placeholder='请输入'
                      error={!!errors.client_id}
                      helperText={errors.client_id?.message}
                    />
                  )}
                />
              </FormItem>
              <FormItem label='Client Secret' required>
                <Controller
                  control={control}
                  name='client_secret'
                  rules={{
                    required: {
                      value: true,
                      message: ' Client Secret 不能为空',
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      onChange={e => {
                        field.onChange(e.target.value);
                        setIsEdit(true);
                      }}
                      placeholder='请输入'
                      error={!!errors.client_secret}
                      helperText={errors.client_secret?.message}
                    />
                  )}
                />
              </FormItem>
              {source_type === ConstsSourceType.SourceTypeWeCom && (
                <FormItem label='Agent ID' required>
                  <Controller
                    control={control}
                    name='agent_id'
                    rules={{
                      required: {
                        value: true,
                        message: 'Agent ID  不能为空',
                      },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        onChange={e => {
                          field.onChange(e.target.value);
                          setIsEdit(true);
                        }}
                        placeholder='请输入'
                        error={!!errors.agent_id}
                        helperText={errors.agent_id?.message}
                      />
                    )}
                  />
                </FormItem>
              )}
            </>
          )}

          {source_type === ConstsSourceType.SourceTypeOAuth && oauthForm()}
          {source_type === ConstsSourceType.SourceTypeCAS && casForm()}
          {source_type === ConstsSourceType.SourceTypeLDAP && ldapForm()}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              m: 2,
              height: 32,
              fontWeight: 'bold',
              '&::before': {
                content: '""',
                display: 'inline-block',
                width: 4,
                height: 12,
                bgcolor: 'common.black',
                borderRadius: '2px',
                mr: 1,
              },
            }}
          >
            成员{' '}
          </Box>
          <Table
            columns={columns}
            dataSource={memberList}
            showHeader={false}
            rowKey='id'
            size='small'
            sx={{
              mx: 2,
              '.MuiTableContainer-root': {
                maxHeight: 400,
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: '10px',
                borderBottom: 'none',
              },

              '.MuiTableCell-root': {
                px: '16px !important',
                height: 'auto !important',
              },
              '.MuiTableRow-root': {
                '&:hover': {
                  '.MuiTableCell-root': {
                    backgroundColor: 'transparent !important',
                  },
                },
              },
            }}
            renderEmpty={
              <Stack alignItems={'center'}>
                <img src={NoData} width={124} />
                <Box>暂无数据</Box>
              </Stack>
            }
          />
        </>
      )}
    </>
  );
};

export default CardAuth;
