import { AuthSetting } from '@/api/type';
import { ConstsSourceType } from '@/request/pro/types';
import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Select,
  MenuItem,
} from '@mui/material';
import { putApiV1KnowledgeBaseDetail } from '@/request/KnowledgeBase';
import { DomainKnowledgeBaseDetail } from '@/request/types';
import { getApiProV1AuthGet, postApiProV1AuthSet } from '@/request/pro/Auth';
import InfoIcon from '@mui/icons-material/Info';
import { Message } from 'ct-mui';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAppSelector } from '@/store';

interface CardAuthProps {
  kb: DomainKnowledgeBaseDetail;
  refresh: (value: AuthSetting) => void;
}

const CardAuth = ({ kb, refresh }: CardAuthProps) => {
  const { license, kb_id } = useAppSelector((state) => state.config);
  const [isEdit, setIsEdit] = useState(false);
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      enabled: '1',
      password: '',
      client_id: '',
      client_secret: '',
      source_type: ConstsSourceType.SourceTypeDingTalk,
    },
  });

  const enabled = watch('enabled');

  const onSubmit = handleSubmit((value) => {
    Promise.all([
      putApiV1KnowledgeBaseDetail({
        id: kb.id!,
        access_settings: {
          ...kb.access_settings,
          simple_auth: {
            enabled: value.enabled === '2',
            password: value.password,
          },
          enterprise_auth: {
            enabled: value.enabled === '3',
          },
        },
      }),
      value.enabled === '3' && isPro
        ? postApiProV1AuthSet({
            kb_id,
            sourceType: value.source_type,
            clientID: value.client_id,
            clientSecret: value.client_secret,
          })
        : Promise.resolve(),
    ]).then(() => {
      refresh({
        enabled: value.enabled === '2',
        password: value.password,
      });
      Message.success('保存成功');
      setIsEdit(false);
    });
  });

  const isPro = useMemo(() => {
    return license.edition === 1 || license.edition === 2;
  }, [license]);

  useEffect(() => {
    if (kb.access_settings?.simple_auth) {
      setValue('enabled', kb.access_settings.simple_auth.enabled ? '2' : '1');
      setValue('password', kb.access_settings.simple_auth.password ?? '');
    }
    if (kb.access_settings?.enterprise_auth?.enabled && isPro) {
      setValue('enabled', '3');
    }
  }, [kb, isPro]);

  useEffect(() => {
    if (!isPro || !kb_id) return;
    getApiProV1AuthGet({
      kb_id,
      source_type: 'dingtalk',
    }).then((res) => {
      setValue('client_id', res.client_id!);
      setValue('client_secret', res.client_secret!);
    });
  }, [kb_id, isPro]);

  return (
    <>
      <Stack
        direction='row'
        alignItems={'center'}
        justifyContent={'space-between'}
        sx={{
          m: 2,
          height: 32,
          fontWeight: 'bold',
        }}
      >
        <Box
          sx={{
            '&::before': {
              content: '""',
              display: 'inline-block',
              width: 4,
              height: 12,
              bgcolor: 'common.black',
              borderRadius: '2px',
              mr: 1,
            },
          }}
        >
          访问认证
        </Box>
        {isEdit && (
          <Button variant='contained' size='small' onClick={onSubmit}>
            保存
          </Button>
        )}
      </Stack>
      <Stack direction={'row'} gap={2} sx={{ mx: 2, mb: 2 }}>
        <Box
          sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}
        >
          可访问性
        </Box>
        <Controller
          control={control}
          name='enabled'
          render={({ field }) => (
            <RadioGroup
              row
              {...field}
              value={field.value}
              onChange={(e) => {
                field.onChange(e.target.value);
                setIsEdit(true);
              }}
            >
              <FormControlLabel
                value={'1'}
                control={<Radio size='small' />}
                label={<Box sx={{ width: 65 }}>公开访问</Box>}
              />
              <FormControlLabel
                value={'2'}
                control={<Radio size='small' />}
                label={<Box sx={{ width: 95 }}>简单口令访问</Box>}
              />
              <FormControlLabel
                value={'3'}
                control={<Radio size='small' disabled={!isPro} />}
                label={
                  <Stack
                    direction='row'
                    alignItems='center'
                    gap={0.5}
                    sx={{ width: 135 }}
                  >
                    企业级身份认证
                    {!isPro && (
                      <Tooltip title='联创版和企业版可用' placement='top' arrow>
                        <InfoIcon
                          sx={{ color: 'text.secondary', fontSize: 14 }}
                        />
                      </Tooltip>
                    )}
                  </Stack>
                }
              />
            </RadioGroup>
          )}
        />
      </Stack>
      {enabled === '2' && (
        <Stack direction={'row'} gap={2} alignItems={'center'} sx={{ mx: 2 }}>
          <Box
            sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}
          >
            访问口令
          </Box>
          <Controller
            control={control}
            name='password'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
                placeholder='输入访问口令'
              />
            )}
          />
        </Stack>
      )}
      {enabled === '3' && (
        <>
          <Stack direction={'row'} gap={2} alignItems={'center'} sx={{ mx: 2 }}>
            <Box
              sx={{
                width: 156,
                fontSize: 14,
                lineHeight: '32px',
                flexShrink: 0,
              }}
            >
              登录方式
            </Box>
            <Controller
              control={control}
              name='source_type'
              render={({ field }) => (
                <Select {...field} fullWidth sx={{ height: 53 }}>
                  <MenuItem value={ConstsSourceType.SourceTypeDingTalk}>
                    钉钉登录
                  </MenuItem>
                  <MenuItem value='2' disabled>
                    企业微信登录
                  </MenuItem>
                  <MenuItem value='3' disabled>
                    飞书登录
                  </MenuItem>
                </Select>
              )}
            />
          </Stack>

          <Stack
            direction={'row'}
            gap={2}
            alignItems={'center'}
            sx={{ mx: 2, mt: 2 }}
          >
            <Box
              sx={{
                width: 156,
                fontSize: 14,
                lineHeight: '32px',
                flexShrink: 0,
              }}
            >
              Client ID
            </Box>
            <Controller
              control={control}
              name='client_id'
              rules={{
                required: {
                  value: true,
                  message: 'Client Id 不能为空',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  fullWidth
                  placeholder='请输入'
                  error={!!errors.client_id}
                  helperText={errors.client_id?.message}
                />
              )}
            />
          </Stack>
          <Stack
            direction={'row'}
            gap={2}
            alignItems={'center'}
            sx={{ mx: 2, mt: 2 }}
          >
            <Box
              sx={{
                width: 156,
                fontSize: 14,
                lineHeight: '32px',
                flexShrink: 0,
              }}
            >
              Client Secret
            </Box>
            <Controller
              control={control}
              name='client_secret'
              rules={{
                required: {
                  value: true,
                  message: ' Client Secret 不能为空',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  placeholder='请输入'
                  error={!!errors.client_secret}
                  helperText={errors.client_secret?.message}
                />
              )}
            />
          </Stack>
        </>
      )}
    </>
  );
};

export default CardAuth;
