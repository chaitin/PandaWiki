import {
  AppDetail,
  getAppDetail,
  KnowledgeBaseListItem,
  updateAppDetail,
  WecomBotServiceSetting,
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

const CardRobotWecomService = ({
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
  } = useForm<WecomBotServiceSetting>({
    defaultValues: {
      wechat_service_is_enabled: false,
      wechat_service_secret: '',
      wechat_service_token: '',
      wechat_service_encodingaeskey: '',
      wechat_service_corpid: '',
    },
  });

  const getDetail = () => {
    getAppDetail({ kb_id: kb.id, type: 6 }).then(res => {
      setDetail(res);
      setIsEnabled(res.settings.wechat_service_is_enabled);
      reset({
        wechat_service_is_enabled: res.settings.wechat_service_is_enabled,
        wechat_service_secret: res.settings.wechat_service_secret,
        wechat_service_token: res.settings.wechat_service_token,
        wechat_service_encodingaeskey:
          res.settings.wechat_service_encodingaeskey,
        wechat_service_corpid: res.settings.wechat_service_corpid,
      });
    });
  };

  const onSubmit = (data: WecomBotServiceSetting) => {
    if (!detail) return;
    updateAppDetail(
      { id: detail.id },
      {
        settings: {
          wechat_service_is_enabled: data.wechat_service_is_enabled,
          wechat_service_secret: data.wechat_service_secret,
          wechat_service_token: data.wechat_service_token,
          wechat_service_encodingaeskey: data.wechat_service_encodingaeskey,
          wechat_service_corpid: data.wechat_service_corpid,
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
          企业微信客服
        </Box>
        <Box sx={{ flexGrow: 1, ml: 1 }}>
          <Link
            component='a'
            href='https://pandawiki.docs.baizhi.cloud/node/01980888-bb0c-77d6-bc45-4636249b0d96'
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
            企业微信客服
          </Box>
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
              <ShowText text={[`${url}/share/v1/app/wechat/service`]} />
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
                企业 ID
                <Box component={'span'} sx={{ color: 'red', ml: 0.5 }}>
                  *
                </Box>
              </Box>
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
                Corp Secret
                <Box component={'span'} sx={{ color: 'red', ml: 0.5 }}>
                  *
                </Box>
              </Box>
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
            </Stack>
          </>
        )}
      </Stack>
    </>
  );
};

export default CardRobotWecomService;
