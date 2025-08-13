import {
  AppDetail,
  getAppDetail,
  KnowledgeBaseListItem,
  updateAppDetail,
  WechatOfficeAccountSetting,
} from '@/api';
import ShowText from '@/components/ShowText';
import {
  Box,
  Button,
  FormControlLabel,
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material';
import { Message } from 'ct-mui';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

const CardRobotWechatOfficeAccount = ({
  kb,
  url,
}: {
  kb: KnowledgeBaseListItem;
  url: string;
}) => {
  const [isEdit, setIsEdit] = useState(false);
  const [detail, setDetail] = useState<AppDetail | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

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
    getAppDetail({ kb_id: kb.id, type: 8 }).then(res => {
      setDetail(res);
      setIsEnabled(res.settings.wechat_official_account_is_enabled);
      reset({
        wechat_official_account_is_enabled:
          res.settings.wechat_official_account_is_enabled,
        wechat_official_account_app_id:
          res.settings.wechat_official_account_app_id,
        wechat_official_account_app_secret:
          res.settings.wechat_official_account_app_secret,
        wechat_official_account_token:
          res.settings.wechat_official_account_token,
        wechat_official_account_encodingaeskey:
          res.settings.wechat_official_account_encodingaeskey,
      });
    });
  };

  const onSubmit = (data: WechatOfficeAccountSetting) => {
    if (!detail) return;
    updateAppDetail(
      { id: detail.id },
      {
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
      Message.success('保存成功');
      setIsEdit(false);
      getDetail();
      reset();
    });
  };

  useEffect(() => {
    getDetail();
  }, [kb]);

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
          微信公众号
        </Box>
        <Box sx={{ flexGrow: 1, ml: 1 }}>
          <Link
            component='a'
            href='https://pandawiki.docs.baizhi.cloud/node/01983a6a-62f2-7ecf-b7c9-606d88683f9e'
            target='_blank'
            sx={{
              fontSize: 14,
              textDecoration: 'none',
              fontWeight: 'normal',
              '&:hover': {
                fontWeight: 'bold',
              },
            }}
          >
            使用方法
          </Link>
        </Box>
        {isEdit && (
          <Button
            variant='contained'
            size='small'
            onClick={handleSubmit(onSubmit)}
          >
            保存
          </Button>
        )}
      </Stack>
      <Stack gap={2} sx={{ m: 2 }}>
        <Stack direction={'row'} alignItems={'center'} gap={2}>
          <Box sx={{ width: 156, fontSize: 14, lineHeight: '32px' }}>
            微信公众号
          </Box>
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
        </Stack>
        {isEnabled && (
          <>
            <Stack
              direction='row'
              gap={2}
              alignItems={'center'}
              justifyContent={'space-between'}
            >
              <Box
                sx={{
                  width: 156,
                  fontSize: 14,
                  lineHeight: '32px',
                  flexShrink: 0,
                }}
              >
                回调地址
              </Box>
              <ShowText
                text={[`${url}/share/v1/app/wechat/official_account`]}
              />
            </Stack>
            <Stack
              direction='row'
              gap={2}
              alignItems={'center'}
              justifyContent={'space-between'}
            >
              <Box
                sx={{
                  width: 156,
                  fontSize: 14,
                  lineHeight: '32px',
                  flexShrink: 0,
                }}
              >
                App ID
                <Box component={'span'} sx={{ color: 'red', ml: 0.5 }}>
                  *
                </Box>
              </Box>
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
            </Stack>
            <Stack
              direction='row'
              gap={2}
              alignItems={'center'}
              justifyContent={'space-between'}
            >
              <Box
                sx={{
                  width: 156,
                  fontSize: 14,
                  lineHeight: '32px',
                  flexShrink: 0,
                }}
              >
                App Secret
                <Box component={'span'} sx={{ color: 'red', ml: 0.5 }}>
                  *
                </Box>
              </Box>
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
            </Stack>
            <Stack
              direction='row'
              gap={2}
              alignItems={'center'}
              justifyContent={'space-between'}
            >
              <Box
                sx={{
                  width: 156,
                  fontSize: 14,
                  lineHeight: '32px',
                  flexShrink: 0,
                }}
              >
                Token
                <Box component={'span'} sx={{ color: 'red', ml: 0.5 }}>
                  *
                </Box>
              </Box>
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
            </Stack>
            <Stack
              direction='row'
              gap={2}
              alignItems={'center'}
              justifyContent={'space-between'}
            >
              <Box
                sx={{
                  width: 156,
                  fontSize: 14,
                  lineHeight: '32px',
                  flexShrink: 0,
                }}
              >
                Encoding Aes Key
                <Box component={'span'} sx={{ color: 'red', ml: 0.5 }}>
                  *
                </Box>
              </Box>
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
            </Stack>
          </>
        )}
      </Stack>
    </>
  );
};

export default CardRobotWechatOfficeAccount;
