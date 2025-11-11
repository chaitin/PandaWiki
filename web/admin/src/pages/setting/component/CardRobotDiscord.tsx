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

const CardRobotDiscord = ({ kb }: { kb: DomainKnowledgeBaseDetail }) => {
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
      discord_bot_is_enabled: false,
      discord_bot_token: '',
    },
  });

  const getDetail = () => {
    getApiV1AppDetail({ kb_id: kb.id!, type: '7' }).then(res => {
      setDetail(res);
      setIsEnabled(res.settings?.discord_bot_is_enabled ?? false);
      reset({
        discord_bot_is_enabled: res.settings?.discord_bot_is_enabled ?? false,
        discord_bot_token: res.settings?.discord_bot_token ?? '',
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
          discord_bot_is_enabled: data.discord_bot_is_enabled,
          discord_bot_token: data.discord_bot_token,
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
      title='Discord 机器人'
      isEdit={isEdit}
      onSubmit={onSubmit}
      more={{
        type: 'link',
        href: 'https://wiki.webinfra.cloud/node/0197d4e2-b5d9-7903-b12b-66e12cf2f715',
        target: '_blank',
        text: '使用方法',
      }}
    >
      <FormItem label='Discord 机器人'>
        <Controller
          control={control}
          name='discord_bot_is_enabled'
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
        <FormItem label='Token' required>
          <Controller
            control={control}
            name='discord_bot_token'
            rules={{
              required: 'Token',
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='在 Discord 中创建机器人，并获取 Token'
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
                error={!!errors.discord_bot_token}
                helperText={errors.discord_bot_token?.message}
              />
            )}
          />{' '}
        </FormItem>
      )}
    </SettingCardItem>
  );
};

export default CardRobotDiscord;
