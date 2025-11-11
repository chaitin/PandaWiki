import ShowText from '@/components/ShowText';
import {
  DomainAppDetailResp,
  DomainKnowledgeBaseDetail,
  getApiV1AppDetail,
  putApiV1App,
} from '@/request';
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

const CardRobotWecomAIBot = ({
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
      is_enabled: false,
      token: '',
      encodingaeskey: '',
    },
  });

  const getDetail = () => {
    getApiV1AppDetail({ kb_id: kb.id!, type: '10' }).then(res => {
      setDetail(res);
      const settings = res.settings?.wecom_ai_bot_settings;
      setIsEnabled(settings?.is_enabled ?? false);
      if (settings) {
        reset({
          is_enabled: settings.is_enabled ?? false,
          token: settings.token ?? '',
          encodingaeskey: settings.encodingaeskey ?? '',
        });
      }
    });
  };

  const onSubmit = handleSubmit(data => {
    if (!detail) return;
    putApiV1App(
      { id: detail.id! },
      {
        kb_id,
        settings: {
          wecom_ai_bot_settings: {
            is_enabled: data.is_enabled,
            token: data.token,
            encodingaeskey: data.encodingaeskey,
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
      title='企业微信智能机器人'
      isEdit={isEdit}
      onSubmit={onSubmit}
      more={{
        type: 'link',
        href: 'https://wiki.webinfra.cloud/node/0199f02c-d0c2-78f0-b89d-09065e72d4e9',
        target: '_blank',
        text: '使用方法',
      }}
    >
      <FormItem label='企业微信智能机器人'>
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
            <ShowText text={[`${url}/share/v1/app/wecom/ai_bot`]} />
          </FormItem>
          <FormItem label='Token' required>
            <Controller
              control={control}
              name='token'
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
                  error={!!errors.token}
                  helperText={errors.token?.message}
                />
              )}
            />
          </FormItem>

          <FormItem label='Encoding Aes Key' required>
            <Controller
              control={control}
              name='encodingaeskey'
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
                  error={!!errors.encodingaeskey}
                  helperText={errors.encodingaeskey?.message}
                />
              )}
            />
          </FormItem>
        </>
      )}
    </SettingCardItem>
  );
};

export default CardRobotWecomAIBot;
