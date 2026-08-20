import React, { useImperativeHandle, Ref, useEffect } from 'react';
import { TextField } from '@mui/material';
import {
  getApiV1KnowledgeBaseList,
  getApiV1KnowledgeBaseDetail,
  postApiV1KnowledgeBase,
} from '@/request/KnowledgeBase';
import { DomainCreateKnowledgeBaseReq } from '@/request/types';
import { setKbId, setKbList, setKbDetail } from '@/store/slices/config';
import { SettingCardItem, FormItem } from '@/pages/setting/component/Common';
import { Controller, useForm } from 'react-hook-form';
import { message } from '@ctzhian/ui';
import { useAppDispatch } from '@/store';

const VALIDATION_RULES = {
  name: {
    required: {
      value: true,
      message: 'Wiki 站名称不能为空',
    },
  },
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

interface Step2ConfigProps {
  ref: Ref<{ onSubmit: () => Promise<unknown> }>;
}

const Step2Config: React.FC<Step2ConfigProps> = ({ ref }) => {
  const {
    control,
    formState: { errors },
    trigger,
    reset,
    getValues,
  } = useForm({
    defaultValues: {
      name: '',
      domain: window.location.hostname,
      port: 3010,
    },
  });

  useEffect(() => {
    return () => {
      reset();
    };
  }, []);

  const dispatch = useAppDispatch();

  const getKb = (id?: string) => {
    const kb_id = id || localStorage.getItem('kb_id') || '';
    return Promise.all([
      getApiV1KnowledgeBaseList().then(res => {
        dispatch(setKbList(res));
        if (res.find(item => item.id === kb_id)) {
          dispatch(setKbId(kb_id));
        } else {
          dispatch(setKbId(res[0]?.id || ''));
        }
      }),
      getApiV1KnowledgeBaseDetail({ id: kb_id }).then(res => {
        dispatch(setKbDetail(res));
      }),
    ]);
  };

  const onSubmit = async () => {
    const isRHFValid = await trigger();
    if (!isRHFValid) {
      return Promise.reject();
    } else {
      const value = getValues();
      const formData: DomainCreateKnowledgeBaseReq = { name: value.name };
      if (value.domain) formData.hosts = [value.domain];
      formData.ports = [+value.port];

      return (
        postApiV1KnowledgeBase(formData)
          // @ts-expect-error 类型错误
          .then(({ id }) => {
            return getKb(id).then(() => {
              // message.success('创建成功');
            });
          })
      );
    }
  };

  useImperativeHandle(ref, () => ({
    onSubmit,
  }));

  return (
    <>
      <SettingCardItem title='WIKI 站'>
        {/* Knowledge Base Name Section */}
        <FormItem
          label='名称'
          required
          labelWidth={100}
          sx={{ alignItems: 'flex-start' }}
          labelSx={{ height: 52 }}
        >
          <Controller
            control={control}
            name='name'
            rules={VALIDATION_RULES.name}
            render={({ field }) => (
              <TextField
                {...field}
                autoFocus
                placeholder='请输入'
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />
        </FormItem>
      </SettingCardItem>
      <SettingCardItem title='服务监听方式'>
        <FormItem
          label='域名或 IP'
          labelWidth={100}
          sx={{ alignItems: 'flex-start' }}
          labelSx={{ height: 52 }}
        >
          <Controller
            control={control}
            name='domain'
            rules={VALIDATION_RULES.domain}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='请输入'
                error={!!errors.domain}
                helperText={errors.domain?.message}
              />
            )}
          />
        </FormItem>
        <FormItem
          label='HTTP 端口'
          labelWidth={100}
          sx={{ alignItems: 'flex-start' }}
          labelSx={{ height: 52 }}
        >
          <Controller
            control={control}
            name='port'
            rules={VALIDATION_RULES.port}
            render={({ field }) => (
              <TextField
                {...field}
                placeholder='HTTP 端口'
                fullWidth
                error={!!errors.port}
                helperText={errors.port?.message}
              />
            )}
          />
        </FormItem>
      </SettingCardItem>
    </>
  );
};

export default Step2Config;
