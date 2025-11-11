import { FeishuBotSetting } from '@/api';
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
import { FormItem, SettingCardItem } from './Common';
import {
  DomainKnowledgeBaseDetail,
  DomainAppDetailResp,
} from '@/request/types';
import { getApiV1AppDetail, putApiV1App } from '@/request/App';
import { useAppSelector } from '@/store';

const CardRobotFeishu = ({ kb }: { kb: DomainKnowledgeBaseDetail }) => {
  const [isEdit, setIsEdit] = useState(false);
  const [detail, setDetail] = useState<DomainAppDetailResp | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const { kb_id } = useAppSelector(state => state.config);
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FeishuBotSetting>({
    defaultValues: {
      feishu_bot_is_enabled: false,
      feishu_bot_app_id: '',
      feishu_bot_app_secret: '',
      feishu_bot_welcome_str: '',
    },
  });

  const getDetail = () => {
    getApiV1AppDetail({ kb_id: kb.id!, type: '4' }).then(res => {
      setDetail(res);
      setIsEnabled(res.settings?.feishu_bot_is_enabled ?? false);
      reset({
        feishu_bot_is_enabled: res.settings?.feishu_bot_is_enabled ?? false,
        feishu_bot_app_id: res.settings?.feishu_bot_app_id ?? '',
        feishu_bot_app_secret: res.settings?.feishu_bot_app_secret ?? '',
        // @ts-expect-error 类型错误
        feishu_bot_welcome_str: res.settings?.feishu_bot_welcome_str ?? '',
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
          feishu_bot_is_enabled: data.feishu_bot_is_enabled,
          feishu_bot_app_id: data.feishu_bot_app_id,
          feishu_bot_app_secret: data.feishu_bot_app_secret,
          // @ts-expect-error 类型错误
          feishu_bot_welcome_str: data.feishu_bot_welcome_str,
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
      title='飞书机器人'
      isEdit={isEdit}
      onSubmit={onSubmit}
      more={{
        type: 'link',
        href: 'https://wiki.webinfra.cloud/node/01971b5f-4520-7c4b-8b4e-683ec5235adc',
        target: '_blank',
        text: '使用方法',
      }}
    >
      <FormItem label='飞书机器人' required>
        <Controller
          control={control}
          name='feishu_bot_is_enabled'
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
          <FormItem label='App ID' required>
            <Controller
              control={control}
              name='feishu_bot_app_id'
              rules={{
                required: 'App ID',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder='> 飞书开放平台 > 凭证与基础信息 > 应用凭证 > App ID'
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  error={!!errors.feishu_bot_app_id}
                  helperText={errors.feishu_bot_app_id?.message}
                />
              )}
            />
          </FormItem>

          <FormItem label='App Secret' required>
            <Controller
              control={control}
              name='feishu_bot_app_secret'
              rules={{
                required: 'App Secret',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder='> 飞书开放平台 > 凭证与基础信息 > 应用凭证 > App Secret'
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  error={!!errors.feishu_bot_app_secret}
                  helperText={errors.feishu_bot_app_secret?.message}
                />
              )}
            />
          </FormItem>
        </>
      )}

      {/* <Box sx={{ fontSize: 14, lineHeight: '32px', my: 1 }}>
        用户欢迎语
      </Box>
      <Controller
        control={control}
        name="feishu_bot_welcome_str"
        render={({ field }) => <TextField
          {...field}
          multiline
          rows={4}
          fullWidth
          size="small"
          placeholder={`欢迎使用网站监测 AI 助手，我将回答您关于网站监测的问题，如:\n 1. 网站监测的监控节点 IP 是什么 \n 2. 网站监测大模型落地案例`}
          onChange={(e) => {
            field.onChange(e.target.value)
            setIsEdit(true)
          }}
          error={!!errors.feishu_bot_welcome_str}
          helperText={errors.feishu_bot_welcome_str?.message}
        />}
      /> */}
    </SettingCardItem>
  );
};

export default CardRobotFeishu;
