import {
  KnowledgeBaseFormData,
  KnowledgeBaseListItem,
  updateKnowledgeBase,
  UpdateKnowledgeBaseData,
} from '@/api';
import FileText from '@/components/UploadFile/FileText';
import { Box, Button, Checkbox, Stack, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Message } from 'ct-mui';

// 验证规则常量
const VALIDATION_RULES = {
  port: {
    required: {
      value: true,
      message: '端口不能为空',
    },
    min: {
      value: 1,
      message: '端口号不能小于1',
    },
    max: {
      value: 65535,
      message: '端口号不能大于65535',
    },
  },
  domain: {
    pattern: {
      value:
        /^(localhost|((([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)\.)+[a-zA-Z]{2,})|(\d{1,3}(?:\.\d{1,3}){3})|(\[[0-9a-fA-F:]+\]))$/,
      message: '请输入有效的域名、IP 或 localhost',
    },
  },
};

const CardListen = ({
  kb,
  refresh,
}: {
  kb: KnowledgeBaseListItem;
  refresh: () => void;
}) => {
  const [isEdit, setIsEdit] = useState<boolean>(false);

  const {
    control,
    formState: { errors },
    setValue,
    watch,
    handleSubmit,
  } = useForm<KnowledgeBaseFormData>({
    defaultValues: {
      domain: '',
      http: false,
      https: false,
      port: 80,
      ssl_port: 443,
      httpsCert: '',
      httpsKey: '',
    },
  });

  const { http, https } = watch();

  const onSubmit = (value: KnowledgeBaseFormData) => {
    const formData: Partial<UpdateKnowledgeBaseData['access_settings']> = {};
    if (!value.http && !value.https) {
      Message.error('至少需要启用一种服务');
      return;
    }
    if (value.domain) formData.hosts = [value.domain];
    if (value.http) formData.ports = [+value.port];
    if (value.https) {
      formData.ssl_ports = [+value.ssl_port];
      if (value.httpsCert) formData.public_key = value.httpsCert;
      else {
        Message.error('请上传证书文件');
        return;
      }
      if (value.httpsKey) formData.private_key = value.httpsKey;
      else {
        Message.error('请上传私钥文件');
        return;
      }
    }
    updateKnowledgeBase({
      id: kb.id,
      access_settings: {
        base_url: kb.access_settings.base_url || '',
        simple_auth: kb.access_settings.simple_auth || null,
        ...formData,
      },
    }).then(() => {
      Message.success('更新成功');
      refresh();
    });
  };

  useEffect(() => {
    setValue('domain', kb.access_settings.hosts?.[0] || '');
    setValue('http', (kb.access_settings.ports?.length || 0) > 0);
    setValue('https', (kb.access_settings.ssl_ports?.length || 0) > 0);
    setValue('port', kb.access_settings.ports?.[0] || 80);
    setValue('ssl_port', kb.access_settings.ssl_ports?.[0] || 443);
    setValue('httpsCert', kb.access_settings.public_key || '');
    setValue('httpsKey', kb.access_settings.private_key || '');
  }, [kb]);

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
          服务监听方式
        </Box>
        {isEdit && (
          <Button
            variant='contained'
            size='small'
            onClick={handleSubmit(onSubmit)}
          >
            保存
          </Button>
        )}
      </Stack>

      <Box sx={{ mx: 2 }}>
        <Stack direction={'row'} gap={2} alignItems={'center'}>
          <Box
            component={'label'}
            sx={{ width: 156, flexShrink: 0, fontSize: 14, lineHeight: '32px' }}
          >
            域名
          </Box>
          <Controller
            control={control}
            name='domain'
            rules={VALIDATION_RULES.domain}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='域名'
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
                error={!!errors.domain}
                helperText={errors.domain?.message}
              />
            )}
          />
        </Stack>
        <Stack direction={'row'} gap={2} alignItems={'center'} sx={{ mt: 2.5 }}>
          <Controller
            control={control}
            name='http'
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                id='http'
                checked={value}
                onChange={e => {
                  onChange(e.target.checked);
                  setIsEdit(true);
                }}
                size='small'
                sx={{ p: 0 }}
              />
            )}
          />
          <Box
            component={'label'}
            htmlFor='http'
            sx={{
              width: 120,
              flexShrink: 0,
              cursor: 'pointer',
              fontSize: 14,
              color: http ? 'text.primary' : 'text.auxiliary',
            }}
          >
            启用 HTTP
          </Box>
          {
            <Controller
              control={control}
              name='port'
              rules={VALIDATION_RULES.port}
              render={({ field }) => (
                <TextField
                  {...field}
                  label='HTTP 端口'
                  fullWidth
                  disabled={!http}
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  type='number'
                  value={http ? +field.value || 80 : ''}
                  error={!!errors.port}
                  helperText={errors.port?.message}
                />
              )}
            />
          }
        </Stack>

        <Stack direction={'row'} gap={2} alignItems={'center'} sx={{ mt: 1.5 }}>
          <Controller
            control={control}
            name='https'
            render={({ field: { value, onChange, ...field } }) => (
              <Checkbox
                {...field}
                id='https'
                size='small'
                checked={value}
                onChange={e => {
                  onChange(e.target.checked);
                  setIsEdit(true);
                }}
                sx={{ p: 0 }}
              />
            )}
          />
          <Box
            component={'label'}
            htmlFor='https'
            sx={{
              width: 120,
              flexShrink: 0,
              cursor: 'pointer',
              fontSize: 14,
              color: https ? 'text.primary' : 'text.auxiliary',
            }}
          >
            启用 HTTPS
          </Box>
          {
            <Controller
              control={control}
              name='ssl_port'
              rules={VALIDATION_RULES.port}
              render={({ field }) => (
                <TextField
                  {...field}
                  label='HTTPS 端口'
                  fullWidth
                  disabled={!https}
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  type='number'
                  value={https ? +field.value || 443 : ''}
                  error={!!errors.ssl_port}
                  helperText={errors.ssl_port?.message}
                />
              )}
            />
          }
          <Controller
            control={control}
            name='httpsCert'
            render={({ field }) => (
              <FileText
                {...field}
                tip={'证书文件'}
                disabled={!https}
                onChange={value => {
                  setIsEdit(true);
                  field.onChange(value);
                }}
              />
            )}
          />
          <Controller
            control={control}
            name='httpsKey'
            render={({ field }) => (
              <FileText
                {...field}
                tip={'私钥文件'}
                disabled={!https}
                onChange={value => {
                  setIsEdit(true);
                  field.onChange(value);
                }}
              />
            )}
          />
        </Stack>
      </Box>
    </>
  );
};

export default CardListen;
