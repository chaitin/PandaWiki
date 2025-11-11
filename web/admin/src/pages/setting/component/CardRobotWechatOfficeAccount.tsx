import { WechatOfficeAccountSetting } from '@/api';
import ShowText from '@/components/ShowText';
import {
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { message } from '@ctzhian/ui';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  DomainKnowledgeBaseDetail,
  DomainAppDetailResp,
} from '@/request/types';
import { getApiV1AppDetail, putApiV1App } from '@/request/App';
import { FormItem, SettingCardItem } from './Common';
import { useAppSelector } from '@/store';
const CardRobotWechatOfficeAccount = ({
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
  } = useForm<WechatOfficeAccountSetting>({
    defaultValues: {
      wechat_official_account_is_enabled: false,
      wechat_official_account_app_id: '',
      wechat_official_account_app_secret: '',
      wechat_official_account_token: '',
      wechat_official_account_encodingaeskey: '',
    },
  });

  const getDetail = () => {
    getApiV1AppDetail({ kb_id: kb.id!, type: '8' }).then(res => {
      setDetail(res);
      setIsEnabled(res.settings?.wechat_official_account_is_enabled ?? false);
      reset({
        wechat_official_account_is_enabled:
          res.settings?.wechat_official_account_is_enabled ?? false,
        wechat_official_account_app_id:
          res.settings?.wechat_official_account_app_id ?? '',
        wechat_official_account_app_secret:
          res.settings?.wechat_official_account_app_secret ?? '',
        wechat_official_account_token:
          res.settings?.wechat_official_account_token ?? '',
        wechat_official_account_encodingaeskey:
          res.settings?.wechat_official_account_encodingaeskey ?? '',
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
          wechat_official_account_is_enabled:
            data.wechat_official_account_is_enabled,
          wechat_official_account_app_id: data.wechat_official_account_app_id,
          wechat_official_account_app_secret:
            data.wechat_official_account_app_secret,
          wechat_official_account_token: data.wechat_official_account_token,
          wechat_official_account_encodingaeskey:
            data.wechat_official_account_encodingaeskey,
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
      title='微信公众号'
      isEdit={isEdit}
      onSubmit={onSubmit}
      more={{
        type: 'link',
        href: 'https://wiki.webinfra.cloud/node/01983a6a-62f2-7ecf-b7c9-606d88683f9e',
        target: '_blank',
        text: '使用方法',
      }}
    >
      <FormItem label='微信公众号'>
        <Controller
          control={control}
          name='wechat_official_account_is_enabled'
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
            <ShowText text={[`${url}/share/v1/app/wechat/official_account`]} />
          </FormItem>
          <FormItem label='App ID' required>
            <Controller
              control={control}
              name='wechat_official_account_app_id'
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
                  error={!!errors.wechat_official_account_app_id}
                  helperText={errors.wechat_official_account_app_id?.message}
                />
              )}
            />
          </FormItem>

          <FormItem label='App Secret' required>
            <Controller
              control={control}
              name='wechat_official_account_app_secret'
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
                  error={!!errors.wechat_official_account_app_secret}
                  helperText={
                    errors.wechat_official_account_app_secret?.message
                  }
                />
              )}
            />
          </FormItem>

          <FormItem label='Token' required>
            <Controller
              control={control}
              name='wechat_official_account_token'
              rules={{
                required: 'Token',
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
                  error={!!errors.wechat_official_account_token}
                  helperText={errors.wechat_official_account_token?.message}
                />
              )}
            />
          </FormItem>

          <FormItem label='Encoding Aes Key' required>
            <Controller
              control={control}
              name='wechat_official_account_encodingaeskey'
              rules={{
                required: 'Suite Encoding Aes Key',
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
                  error={!!errors.wechat_official_account_encodingaeskey}
                  helperText={
                    errors.wechat_official_account_encodingaeskey?.message
                  }
                />
              )}
            />
          </FormItem>
        </>
      )}
    </SettingCardItem>
  );
};

export default CardRobotWechatOfficeAccount;
