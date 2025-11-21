import { DomainKnowledgeBaseDetail } from '@/request/types';
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Stack,
} from '@mui/material';
import { SettingCardItem, FormItem } from './Common';
import ShowText from '@/components/ShowText';
import { Controller, useForm } from 'react-hook-form';
import { useMemo, useState, useEffect } from 'react';
import { message } from '@ctzhian/ui';
import { getApiV1AppDetail, putApiV1App } from '@/request/App';
import { DomainAppDetailResp, ConstsLicenseEdition } from '@/request/types';

interface CardMCPProps {
  kb: DomainKnowledgeBaseDetail;
}

const CardMCP = ({ kb }: CardMCPProps) => {
  const [isEdit, setIsEdit] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      is_enabled: false,
      access: 'open' as 'open' | 'auth',
      token: '',
      tool_name: '',
      tool_desc: '',
    },
  });

  const isEnabled = watch('is_enabled');
  const access = watch('access');
  const [detail, setDetail] = useState<DomainAppDetailResp | null>(null);

  const mcpUrl = useMemo(() => {
    const hostRaw = kb?.access_settings?.hosts?.[0] || window.location.hostname;
    const host = hostRaw === '*' ? window.location.hostname : hostRaw;
    const sslPorts = kb?.access_settings?.ssl_ports || [];
    const httpPorts = kb?.access_settings?.ports || [];
    const isHttps = sslPorts.length > 0;
    const protocol = isHttps ? 'https' : 'http';
    if (!host) {
      return `${protocol}://${window.location.hostname}${isHttps ? '' : `:${window.location.port}`}/mcp`;
    }
    if (isHttps) {
      return `${protocol}://${host}/mcp`;
    }
    const port = httpPorts[0];
    if (!port) return `${protocol}://${host}/mcp`;
    return `${protocol}://${host}:${port}/mcp`;
  }, [kb]);

  const onSubmit = handleSubmit(() => {
    if (!kb || !detail) return;
    const payload: any = {
      kb_id: kb.id!,
      settings: {
        mcp_server_settings: {
          is_enabled: isEnabled,
          get_docs_tool_settings: {
            name: watch('tool_name'),
            desc: watch('tool_desc'),
          },
          sample_auth: {
            enabled: access === 'auth',
            password: access === 'auth' ? watch('token') : '',
          },
        },
      },
    };
    putApiV1App({ id: detail.id! }, payload).then(() => {
      message.success('保存成功');
      setIsEdit(false);
      getDetail();
    });
  });

  const getDetail = () => {
    getApiV1AppDetail({ kb_id: kb.id!, type: '12' }).then(res => {
      setDetail(res);
      const is_enabled =
        (res.settings as any)?.mcp_server_settings?.is_enabled ?? false;
      const auth =
        (res.settings as any)?.mcp_server_settings?.sample_auth ?? {};
      const accessVal = auth.enabled ? 'auth' : 'open';
      const tokenVal = auth.password ?? '';
      const toolName =
        (res.settings as any)?.mcp_server_settings?.get_docs_tool_settings
          ?.name ?? '';
      const toolDesc =
        (res.settings as any)?.mcp_server_settings?.get_docs_tool_settings
          ?.desc ?? '';
      setValue('is_enabled', is_enabled);
      setValue('access', accessVal);
      setValue('token', tokenVal);
      setValue('tool_name', toolName);
      setValue('tool_desc', toolDesc);
    });
  };

  useEffect(() => {
    if (!kb) return;
    getDetail();
  }, [kb]);

  return (
    <Box sx={{ width: 1000, margin: 'auto', pb: 4 }}>
      <SettingCardItem
        title='MCP 设置'
        isEdit={isEdit}
        onSubmit={onSubmit}
        permission={[
          ConstsLicenseEdition.LicenseEditionBusiness,
          ConstsLicenseEdition.LicenseEditionEnterprise,
        ]}
        more={{
          type: 'link',
          href: 'https://pandawiki.docs.baizhi.cloud/node/019aa45c-90c1-7e6f-b17a-74ab1b200153',
          target: '_blank',
          text: '使用方法',
        }}
      >
        <FormItem label='MCP Server'>
          <FormControl>
            <Controller
              control={control}
              name='is_enabled'
              render={({ field }) => (
                <RadioGroup
                  {...field}
                  onChange={e => {
                    field.onChange(e.target.value === 'true');
                    setIsEdit(true);
                  }}
                >
                  <Stack direction={'row'}>
                    <FormControlLabel
                      value={true}
                      control={<Radio size='small' />}
                      label={<Box sx={{ width: 100 }}>启用</Box>}
                    />
                    <FormControlLabel
                      value={false}
                      control={<Radio size='small' />}
                      label={<Box sx={{ width: 100 }}>禁用</Box>}
                    />
                  </Stack>
                </RadioGroup>
              )}
            />
          </FormControl>
        </FormItem>

        {isEnabled && (
          <>
            <FormItem label='MCP URL'>
              <ShowText
                text={[mcpUrl]}
                copyable={true}
                noEllipsis={true}
                forceCopy={true}
              />
            </FormItem>

            <FormItem label='MCP Tool名称'>
              <Controller
                control={control}
                name='tool_name'
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder='自定义检索文档MCP Tool名称'
                    onChange={e => {
                      field.onChange(e.target.value);
                      setIsEdit(true);
                    }}
                  />
                )}
              />
            </FormItem>

            <FormItem label='MCP Tool描述'>
              <Controller
                control={control}
                name='tool_desc'
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder='自定义检索文档MCP Tool描述'
                    onChange={e => {
                      field.onChange(e.target.value);
                      setIsEdit(true);
                    }}
                  />
                )}
              />
            </FormItem>

            <FormItem label='访问控制'>
              <FormControl>
                <Controller
                  control={control}
                  name='access'
                  render={({ field }) => (
                    <RadioGroup
                      {...field}
                      onChange={e => {
                        field.onChange(e.target.value);
                        setIsEdit(true);
                      }}
                    >
                      <Stack direction={'row'}>
                        <FormControlLabel
                          value={'open'}
                          control={<Radio size='small' />}
                          label={<Box sx={{ width: 100 }}>完全公开</Box>}
                        />
                        <FormControlLabel
                          value={'auth'}
                          control={<Radio size='small' />}
                          label={<Box sx={{ width: 100 }}>需要认证</Box>}
                        />
                      </Stack>
                    </RadioGroup>
                  )}
                />
              </FormControl>
            </FormItem>

            {access === 'auth' && (
              <FormItem label='访问口令' required>
                <Controller
                  control={control}
                  name='token'
                  rules={{ required: '访问口令不能为空' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      placeholder='访问口令'
                      onChange={e => {
                        field.onChange(e.target.value);
                        setIsEdit(true);
                      }}
                      error={!!errors.token}
                      helperText={errors.token?.message}
                    />
                  )}
                />
              </FormItem>
            )}
          </>
        )}
      </SettingCardItem>
    </Box>
  );
};

export default CardMCP;
