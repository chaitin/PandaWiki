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

const CardRobotWecom = ({
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
  } = useForm({
    defaultValues: {
      wechat_app_is_enabled: false,
      wechat_app_agent_id: '',
      wechat_app_secret: '',
      wechat_app_token: '',
      wechat_app_encodingaeskey: '',
      wechat_app_corpid: '',
    },
  });

  const getDetail = () => {
    getApiV1AppDetail({ kb_id: kb.id!, type: '5' }).then(res => {
      setDetail(res);
      setIsEnabled(res.settings?.wechat_app_is_enabled ?? false);
      reset({
        wechat_app_is_enabled: res.settings?.wechat_app_is_enabled ?? false,
        wechat_app_agent_id: res.settings?.wechat_app_agent_id ?? '',
        wechat_app_secret: res.settings?.wechat_app_secret ?? '',
        wechat_app_token: res.settings?.wechat_app_token ?? '',
        wechat_app_encodingaeskey:
          res.settings?.wechat_app_encodingaeskey ?? '',
        wechat_app_corpid: res.settings?.wechat_app_corpid ?? '',
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
          wechat_app_is_enabled: data.wechat_app_is_enabled,
          wechat_app_agent_id: data.wechat_app_agent_id,
          wechat_app_secret: data.wechat_app_secret,
          wechat_app_token: data.wechat_app_token,
          wechat_app_encodingaeskey: data.wechat_app_encodingaeskey,
          wechat_app_corpid: data.wechat_app_corpid,
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
      title='企业微信机器人'
      isEdit={isEdit}
      onSubmit={onSubmit}
      more={{
        type: 'link',
        href: 'https://wiki.webinfra.cloud/node/01971b5f-67e1-73c8-8582-82ccac49cc96',
        target: '_blank',
        text: '使用方法',
      }}
    >
      <FormItem label='企业微信机器人'>
        <Controller
          control={control}
          name='wechat_app_is_enabled'
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
            <ShowText text={[`${url}/share/v1/app/wechat/app`]} />
          </FormItem>

          <FormItem label='Agent ID' required>
            <Controller
              control={control}
              name='wechat_app_agent_id'
              rules={{
                required: 'Agent ID',
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
                  error={!!errors.wechat_app_agent_id}
                  helperText={errors.wechat_app_agent_id?.message}
                />
              )}
            />
          </FormItem>

          <FormItem label='企业 ID' required>
            <Controller
              control={control}
              name='wechat_app_corpid'
              rules={{
                required: '企业 ID',
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
                  error={!!errors.wechat_app_corpid}
                  helperText={errors.wechat_app_corpid?.message}
                />
              )}
            />
          </FormItem>

          <FormItem label='Secret' required>
            <Controller
              control={control}
              name='wechat_app_secret'
              rules={{
                required: 'Secret',
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
                  error={!!errors.wechat_app_secret}
                  helperText={errors.wechat_app_secret?.message}
                />
              )}
            />
          </FormItem>

          <FormItem label='Token' required>
            <Controller
              control={control}
              name='wechat_app_token'
              rules={{
                required: 'Suite Token',
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
                  error={!!errors.wechat_app_token}
                  helperText={errors.wechat_app_token?.message}
                />
              )}
            />
          </FormItem>

          <FormItem label='Encoding Aes Key' required>
            <Controller
              control={control}
              name='wechat_app_encodingaeskey'
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
                  error={!!errors.wechat_app_encodingaeskey}
                  helperText={errors.wechat_app_encodingaeskey?.message}
                />
              )}
            />
          </FormItem>
        </>
      )}
    </SettingCardItem>
  );
};

export default CardRobotWecom;
