import { FreeSoloAutocomplete } from '@/components/FreeSoloAutocomplete';
import ShowText from '@/components/ShowText';
import { useCommitPendingInput } from '@/hooks';
import { getApiV1AppDetail, putApiV1App } from '@/request/App';
import {
  DomainAppDetailResp,
  DomainKnowledgeBaseDetail,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { Icon, message } from '@ctzhian/ui';
import {
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormItem, SettingCardItem } from './Common';

const CardRobotWecomService = ({
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
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      wechat_service_is_enabled: false,
      wechat_service_secret: '',
      wechat_service_token: '',
      wechat_service_encodingaeskey: '',
      wechat_service_corpid: '',
      wechat_service_contain_keywords: [] as string[],
      wechat_service_equal_keywords: [] as string[],
    },
  });

  const getDetail = () => {
    getApiV1AppDetail({ kb_id: kb.id!, type: '6' }).then(res => {
      setDetail(res);
      setIsEnabled(res.settings?.wechat_service_is_enabled ?? false);
      reset({
        wechat_service_is_enabled:
          res.settings?.wechat_service_is_enabled ?? false,
        wechat_service_secret: res.settings?.wechat_service_secret ?? '',
        wechat_service_token: res.settings?.wechat_service_token ?? '',
        wechat_service_encodingaeskey:
          res.settings?.wechat_service_encodingaeskey ?? '',
        wechat_service_corpid: res.settings?.wechat_service_corpid ?? '',
        wechat_service_contain_keywords:
          res.settings?.wechat_service_contain_keywords ?? ([] as string[]),
        wechat_service_equal_keywords:
          res.settings?.wechat_service_equal_keywords ?? ([] as string[]),
      });
    });
  };

  const wechat_service_contain_keywords =
    watch('wechat_service_contain_keywords') || [];
  const wechat_service_equal_keywords =
    watch('wechat_service_equal_keywords') || [];

  const containKeywordsField = useCommitPendingInput<string>({
    value: wechat_service_contain_keywords,
    setValue: value => {
      setIsEdit(true);
      setValue('wechat_service_contain_keywords', value);
    },
  });

  const equalKeywordsField = useCommitPendingInput<string>({
    value: wechat_service_equal_keywords,
    setValue: value => {
      setIsEdit(true);
      setValue('wechat_service_equal_keywords', value);
    },
  });

  const onSubmit = handleSubmit(data => {
    if (!detail) return;
    putApiV1App(
      { id: detail.id! },
      {
        kb_id,
        settings: {
          wechat_service_is_enabled: data.wechat_service_is_enabled,
          wechat_service_secret: data.wechat_service_secret,
          wechat_service_token: data.wechat_service_token,
          wechat_service_encodingaeskey: data.wechat_service_encodingaeskey,
          wechat_service_corpid: data.wechat_service_corpid,
          wechat_service_contain_keywords: data.wechat_service_contain_keywords,
          wechat_service_equal_keywords: data.wechat_service_equal_keywords,
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
      title='企业微信客服'
      isEdit={isEdit}
      onSubmit={onSubmit}
      more={{
        type: 'link',
        href: 'https://wiki.webinfra.cloud/node/01980888-bb0c-77d6-bc45-4636249b0d96',
        target: '_blank',
        text: '使用方法',
      }}
    >
      <FormItem label='企业微信客服'>
        <Controller
          control={control}
          name='wechat_service_is_enabled'
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
            <ShowText text={[`${url}/share/v1/app/wechat/service`]} />
          </FormItem>
          <FormItem label='企业 ID' required>
            <Controller
              control={control}
              name='wechat_service_corpid'
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
                  error={!!errors.wechat_service_corpid}
                  helperText={errors.wechat_service_corpid?.message}
                />
              )}
            />
          </FormItem>
          <FormItem label='Corp Secret' required>
            <Controller
              control={control}
              name='wechat_service_secret'
              rules={{
                required: 'Corp Secret',
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
                  error={!!errors.wechat_service_secret}
                  helperText={errors.wechat_service_secret?.message}
                />
              )}
            />
          </FormItem>
          <FormItem label='Token' required>
            <Controller
              control={control}
              name='wechat_service_token'
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
                  error={!!errors.wechat_service_token}
                  helperText={errors.wechat_service_token?.message}
                />
              )}
            />
          </FormItem>
          <FormItem label='Encoding Aes Key' required>
            <Controller
              control={control}
              name='wechat_service_encodingaeskey'
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
                  error={!!errors.wechat_service_encodingaeskey}
                  helperText={errors.wechat_service_encodingaeskey?.message}
                />
              )}
            />
          </FormItem>
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={1}
            sx={{ fontSize: 14, fontWeight: 600, color: 'warning.main' }}
          >
            <Icon type='icon-jinggao' sx={{ fontSize: 18 }} />
            人工客服转接配置：当用户触发以下场景时，会自动转接人工客服
          </Stack>
          <FormItem
            label={
              <Box>
                提问
                <Box component={'span'} sx={{ fontWeight: 600 }}>
                  包含特定
                </Box>
                关键词
              </Box>
            }
          >
            <FreeSoloAutocomplete
              placeholder='回车确认，填写下一个'
              {...containKeywordsField}
            />
          </FormItem>
          <FormItem
            label={
              <Box>
                提问
                <Box component={'span'} sx={{ fontWeight: 600 }}>
                  完全匹配
                </Box>
                关键词
              </Box>
            }
          >
            <FreeSoloAutocomplete
              placeholder='回车确认，填写下一个'
              {...equalKeywordsField}
            />
          </FormItem>
        </>
      )}
    </SettingCardItem>
  );
};

export default CardRobotWecomService;
