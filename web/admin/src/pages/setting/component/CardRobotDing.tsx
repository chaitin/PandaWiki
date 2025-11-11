import { getApiV1AppDetail, putApiV1App } from '@/request/App';
import {
  DomainAppDetailResp,
  DomainKnowledgeBaseDetail,
} from '@/request/types';
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
import { useAppSelector } from '@/store';

const CardRobotDing = ({ kb }: { kb: DomainKnowledgeBaseDetail }) => {
  const [isEdit, setIsEdit] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false); // 是否启用钉钉机器人
  const [detail, setDetail] = useState<DomainAppDetailResp | null>(null);
  const { kb_id } = useAppSelector(state => state.config);
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      dingtalk_bot_is_enabled: false,
      dingtalk_bot_client_id: '',
      dingtalk_bot_client_secret: '',
      dingtalk_bot_welcome_str: '',
      dingtalk_bot_template_id: '',
    },
  });

  const getDetail = () => {
    getApiV1AppDetail({ kb_id: kb.id!, type: '3' }).then(res => {
      setDetail(res);
      setIsEnabled(res.settings?.dingtalk_bot_is_enabled ?? false);
      reset({
        dingtalk_bot_is_enabled: res.settings?.dingtalk_bot_is_enabled ?? false,
        dingtalk_bot_client_id: res.settings?.dingtalk_bot_client_id,
        dingtalk_bot_client_secret: res.settings?.dingtalk_bot_client_secret,
        // @ts-expect-error 类型错误
        dingtalk_bot_welcome_str: res.settings?.dingtalk_bot_welcome_str,
        dingtalk_bot_template_id: res.settings?.dingtalk_bot_template_id,
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
          dingtalk_bot_is_enabled: data.dingtalk_bot_is_enabled,
          dingtalk_bot_client_id: data.dingtalk_bot_client_id,
          dingtalk_bot_client_secret: data.dingtalk_bot_client_secret,
          // @ts-expect-error 类型错误
          dingtalk_bot_welcome_str: data.dingtalk_bot_welcome_str,
          dingtalk_bot_template_id: data.dingtalk_bot_template_id,
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
      title='钉钉机器人'
      isEdit={isEdit}
      onSubmit={onSubmit}
      more={{
        type: 'link',
        href: 'https://wiki.webinfra.cloud/node/01971b5f-258e-7c3d-b26a-42e96aea068b',
        target: '_blank',
        text: '使用方法',
      }}
    >
      <FormItem label='钉钉机器人'>
        <Controller
          control={control}
          name='dingtalk_bot_is_enabled'
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
          <FormItem label='Client ID' required>
            <Controller
              control={control}
              name='dingtalk_bot_client_id'
              rules={{
                required: 'Client ID',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder='> 钉钉开发平台 > 钉钉应用 > 凭证与基础信息 > Client ID'
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  error={!!errors.dingtalk_bot_client_id}
                  helperText={errors.dingtalk_bot_client_id?.message}
                />
              )}
            />
          </FormItem>
          <FormItem label='Client Secret' required>
            <Controller
              control={control}
              name='dingtalk_bot_client_secret'
              rules={{
                required: 'Client Secret',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder='> 钉钉开发平台 > 钉钉应用 > 凭证与基础信息 > Client Secret'
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  error={!!errors.dingtalk_bot_client_secret}
                  helperText={errors.dingtalk_bot_client_secret?.message}
                />
              )}
            />
          </FormItem>

          <FormItem label='Template ID' required>
            <Controller
              control={control}
              name='dingtalk_bot_template_id'
              rules={{
                required: 'Template ID',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder='> 钉钉开发平台 > 卡片平台 > 模板列表 > 模板 ID'
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  error={!!errors.dingtalk_bot_template_id}
                  helperText={errors.dingtalk_bot_template_id?.message}
                />
              )}
            />{' '}
          </FormItem>
        </>
      )}

      {/* <Box sx={{ fontSize: 14, lineHeight: '32px', my: 1 }}>
        用户欢迎语
      </Box>
      <Controller
        control={control}
        name="dingtalk_bot_welcome_str"
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
          error={!!errors.dingtalk_bot_welcome_str}
          helperText={errors.dingtalk_bot_welcome_str?.message}
        />}
      /> */}
    </SettingCardItem>
  );
};

export default CardRobotDing;
