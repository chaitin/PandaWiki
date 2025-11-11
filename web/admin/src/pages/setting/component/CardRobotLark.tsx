import ShowText from '@/components/ShowText';
import { getApiV1AppDetail, putApiV1App } from '@/request/App';
import {
  DomainAppDetailResp,
  DomainKnowledgeBaseDetail,
  DomainLarkBotSettings,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { message } from '@ctzhian/ui';
import {
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormItem, SettingCardItem } from './Common';

const CardRobotLark = ({
  kb,
  url,
}: {
  kb: DomainKnowledgeBaseDetail;
  url: string;
}) => {
  const [isEdit, setIsEdit] = useState(false);
  const [detail, setDetail] = useState<DomainAppDetailResp | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const { kb_id } = useAppSelector(state => state.config);
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DomainLarkBotSettings>({
    defaultValues: {
      is_enabled: false,
      app_id: '',
      app_secret: '',
      encrypt_key: '',
      verify_token: '',
    },
  });

  const getDetail = () => {
    getApiV1AppDetail({ kb_id: kb.id!, type: '11' }).then(res => {
      setDetail(res);
      setIsEnabled(res.settings?.lark_bot_settings?.is_enabled ?? false);
      reset({
        is_enabled: res.settings?.lark_bot_settings?.is_enabled ?? false,
        app_id: res.settings?.lark_bot_settings?.app_id ?? '',
        app_secret: res.settings?.lark_bot_settings?.app_secret ?? '',
        encrypt_key: res.settings?.lark_bot_settings?.encrypt_key ?? '',
        verify_token: res.settings?.lark_bot_settings?.verify_token ?? '',
      });
    });
  };

  const onSubmit = handleSubmit(data => {
    if (!detail) return;
    putApiV1App(
      { id: detail.id! },
      {
        kb_id,
        settings: {
          lark_bot_settings: {
            is_enabled: data.is_enabled,
            app_id: data.app_id,
            app_secret: data.app_secret,
            encrypt_key: data.encrypt_key,
            verify_token: data.verify_token,
          },
        },
      },
    ).then(() => {
      message.success('保存成功');
      setIsEdit(false);
      getDetail();
      reset();
    });
  });

  useEffect(() => {
    getDetail();
  }, [kb]);

  return (
    <SettingCardItem
      title='Lark 机器人'
      isEdit={isEdit}
      onSubmit={onSubmit}
      more={{
        type: 'link',
        href: 'https://wiki.webinfra.cloud/node/019a0131-8ad5-7653-89aa-60f75da44d14',
        target: '_blank',
        text: '使用方法',
      }}
    >
      <FormItem label='Lark 机器人'>
        <Controller
          control={control}
          name='is_enabled'
          render={({ field }) => (
            <RadioGroup
              row
              {...field}
              onChange={e => {
                field.onChange(e.target.value === 'true');
                setIsEnabled(e.target.value === 'true');
                setIsEdit(true);
              }}
            >
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
            </RadioGroup>
          )}
        />
      </FormItem>

      {isEnabled && (
        <>
          <FormItem label='回调地址'>
            <ShowText text={[`${url}/share/v1/openapi/lark/bot/${kb_id}`]} />
          </FormItem>
          <FormItem label='App ID' required>
            <Controller
              control={control}
              name='app_id'
              rules={{
                required: 'App ID',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder=''
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  error={!!errors.app_id}
                  helperText={errors.app_id?.message}
                />
              )}
            />
          </FormItem>

          <FormItem label='App Secret' required>
            <Controller
              control={control}
              name='app_secret'
              rules={{
                required: 'App Secret',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder=''
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  error={!!errors.app_secret}
                  helperText={errors.app_secret?.message}
                />
              )}
            />
          </FormItem>

          <FormItem label='Verify Token' required>
            <Controller
              control={control}
              name='verify_token'
              rules={{
                required: 'Verify Token',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder=''
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  error={!!errors.verify_token}
                  helperText={errors.verify_token?.message}
                />
              )}
            />
          </FormItem>

          <FormItem label='Encrypt Key' required>
            <Controller
              control={control}
              name='encrypt_key'
              rules={{
                required: 'Encrypt Key',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder=''
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  error={!!errors.encrypt_key}
                  helperText={errors.encrypt_key?.message}
                />
              )}
            />
          </FormItem>
        </>
      )}
    </SettingCardItem>
  );
};

export default CardRobotLark;
