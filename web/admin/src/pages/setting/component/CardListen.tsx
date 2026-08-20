import { updateKnowledgeBase, UpdateKnowledgeBaseData } from '@/api';
import { DomainKnowledgeBaseDetail } from '@/request/types';
import { message } from '@ctzhian/ui';
import { TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormItem, SettingCardItem } from './Common';

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
        /^(localhost|((([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\.)+[a-zA-Z]{2,})|(\d{1,3}(?:\.\d{1,3}){3})|(\[[0-9a-fA-F:]+\]))$/,
      message: '请输入有效的域名、IP 或 localhost',
    },
  },
};

const CardListen = ({
  kb,
  refresh,
}: {
  kb: DomainKnowledgeBaseDetail;
  refresh: () => void;
}) => {
  const [isEdit, setIsEdit] = useState<boolean>(false);

  const {
    control,
    formState: { errors },
    setValue,
    handleSubmit,
  } = useForm({
    defaultValues: {
      domain: '',
      port: 80,
    },
  });

  const onSubmit = handleSubmit(value => {
    const formData: Partial<UpdateKnowledgeBaseData['access_settings']> = {};
    if (value.domain) formData.hosts = [value.domain];
    formData.ports = [+value.port];
    updateKnowledgeBase({
      id: kb.id!,
      access_settings: {
        base_url: kb.access_settings?.base_url || '',
        simple_auth: kb.access_settings?.simple_auth || null,
        ...formData,
      },
    }).then(() => {
      message.success('更新成功');
      setIsEdit(false);
      refresh();
    });
  });

  useEffect(() => {
    setValue('domain', kb.access_settings?.hosts?.[0] || '');
    setValue('port', kb.access_settings?.ports?.[0] || 80);
  }, [kb]);

  return (
    <SettingCardItem title='服务监听方式' isEdit={isEdit} onSubmit={onSubmit}>
      <FormItem label='域名或 IP'>
        <Controller
          control={control}
          name='domain'
          rules={VALIDATION_RULES.domain}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label='域名或 IP'
              onChange={e => {
                field.onChange(e.target.value);
                setIsEdit(true);
              }}
              error={!!errors.domain}
              helperText={errors.domain?.message}
            />
          )}
        />
      </FormItem>

      <FormItem label='HTTP 端口'>
        <Controller
          control={control}
          name='port'
          rules={VALIDATION_RULES.port}
          render={({ field }) => (
            <TextField
              {...field}
              label='HTTP 端口'
              fullWidth
              onChange={e => {
                field.onChange(e.target.value);
                setIsEdit(true);
              }}
              type='number'
              error={!!errors.port}
              helperText={errors.port?.message}
            />
          )}
        />
      </FormItem>
    </SettingCardItem>
  );
};

export default CardListen;
