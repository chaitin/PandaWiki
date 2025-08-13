import {
  createModel,
  getModelNameList,
  ModelListItem,
  testModel,
  updateModel,
} from '@/api';
import Card from '@/components/Card';
import { ModelProvider } from '@/constant/enums';
import { addOpacityToColor } from '@/utils';
import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  useTheme,
} from '@mui/material';
import { Icon, Message, Modal } from 'ct-mui';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
interface AddModelProps {
  open: boolean;
  data: ModelListItem | null;
  type: 'chat' | 'embedding' | 'rerank';
  onClose: () => void;
  refresh: () => void;
}

interface AddModelForm {
  provider: keyof typeof ModelProvider;
  model: string;
  base_url: string;
  api_version: string;
  api_key: string;
  api_header_key: string;
  api_header_value: string;
  type: 'chat' | 'embedding' | 'rerank';
}

const titleMap = {
  chat: 'Chat 模型',
  embedding: 'Embedding 模型',
  rerank: 'Rerank 模型',
};

const ModelAdd = ({
  open,
  onClose,
  refresh,
  data,
  type = 'chat',
}: AddModelProps) => {
  const theme = useTheme();

  let providers: Record<string, any> = ModelProvider;
  if (type === 'embedding' || type === 'rerank') {
    providers = {
      BaiZhiCloud: ModelProvider.BaiZhiCloud,
      Other: ModelProvider.Other,
    };
  }

  const {
    formState: { errors },
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
  } = useForm<AddModelForm>({
    defaultValues: {
      type,
      provider: 'BaiZhiCloud',
      base_url: providers.BaiZhiCloud.defaultBaseUrl,
      model: '',
      api_version: '',
      api_key: '',
      api_header_key: '',
      api_header_value: '',
    },
  });

  const providerBrand = watch('provider');

  const [modelUserList, setModelUserList] = useState<{ model: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = () => {
    onClose();
    reset({
      type,
      provider: 'BaiZhiCloud',
      model: '',
      base_url: '',
      api_key: '',
      api_version: '',
      api_header_key: '',
      api_header_value: '',
    });
    setModelUserList([]);
    setSuccess(false);
    setLoading(false);
    setModelLoading(false);
    setError('');
    refresh();
  };

  const getModel = (value: AddModelForm) => {
    let header = '';
    if (value.api_header_key && value.api_header_value) {
      header = value.api_header_key + '=' + value.api_header_value;
    }
    setModelLoading(true);
    getModelNameList({
      type,
      api_key: value.api_key,
      base_url: value.base_url,
      provider: value.provider,
      api_header: header,
    })
      .then(res => {
        setModelUserList(
          (res.models || []).sort((a, b) => a.model.localeCompare(b.model)),
        );
        if (data && (res.models || []).find(it => it.model === data.model)) {
          setValue('model', data.model);
        } else {
          setValue('model', res.models?.[0]?.model || '');
        }
        setSuccess(true);
      })
      .finally(() => {
        setModelLoading(false);
      });
  };

  const onSubmit = (value: AddModelForm) => {
    let header = '';
    if (value.api_header_key && value.api_header_value) {
      header = value.api_header_key + '=' + value.api_header_value;
    }
    setError('');
    setLoading(true);
    testModel({
      type,
      api_key: value.api_key,
      base_url: value.base_url,
      api_version: value.api_version,
      provider: value.provider,
      model: value.model,
      api_header: header,
    })
      .then(res => {
        if (res.error) {
          setError(res.error);
          setLoading(false);
        } else {
          if (data) {
            updateModel({
              type,
              api_key: value.api_key,
              base_url: value.base_url,
              model: value.model,
              api_header: header,
              api_version: value.api_version,
              id: data.id,
              provider: value.provider,
            })
              .then(() => {
                Message.success('修改成功');
                handleReset();
              })
              .finally(() => {
                setLoading(false);
              });
          } else {
            createModel({
              type,
              api_key: value.api_key,
              base_url: value.base_url,
              model: value.model,
              api_header: header,
              provider: value.provider,
            })
              .then(() => {
                Message.success('添加成功');
                handleReset();
              })
              .finally(() => {
                setLoading(false);
              });
          }
        }
      })
      .catch(() => {
        setLoading(false);
      });
  };

  const resetCurData = (value: ModelListItem) => {
    if (value.provider && value.provider !== 'Other') {
      getModel({
        api_key: value.api_key || '',
        base_url: value.base_url || '',
        model: value.model || '',
        provider: value.provider || '',
        api_version: value.api_version || '',
        api_header_key: value.api_header?.split('=')[0] || '',
        api_header_value: value.api_header?.split('=')[1] || '',
        type,
      });
    }
    reset({
      type,
      provider: value.provider || 'Other',
      model: value.model || '',
      base_url: value.base_url || '',
      api_key: value.api_key || '',
      api_version: value.api_version || '',
      api_header_key: value.api_header?.split('=')[0] || '',
      api_header_value: value.api_header?.split('=')[1] || '',
    });
  };

  useEffect(() => {
    if (open) {
      if (data) {
        resetCurData(data);
      } else {
        reset({
          type,
          provider: 'BaiZhiCloud',
          model: '',
          base_url: providers.BaiZhiCloud.defaultBaseUrl,
          api_key: '',
          api_version: '',
          api_header_key: '',
          api_header_value: '',
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, open]);

  return (
    <Modal
      title={data ? `修改 ${titleMap[type]}` : `添加 ${titleMap[type]}`}
      open={open}
      width={800}
      onCancel={handleReset}
      okText='保存'
      onOk={handleSubmit(onSubmit)}
      okButtonProps={{
        loading,
        disabled: !success && providerBrand !== 'Other',
      }}
    >
      <Stack direction={'row'} alignItems={'stretch'} gap={3}>
        <Stack
          gap={1}
          sx={{
            width: 200,
            flexShrink: 0,
            bgcolor: 'background.paper2',
            borderRadius: '10px',
            p: 1,
          }}
        >
          <Box
            sx={{ fontSize: 14, lineHeight: '24px', fontWeight: 'bold', p: 1 }}
          >
            模型供应商
          </Box>
          {Object.values(providers).map(it => (
            <Stack
              direction={'row'}
              alignItems={'center'}
              gap={1.5}
              key={it.label}
              sx={{
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: '24px',
                p: 1,
                borderRadius: '10px',
                fontWeight: 'bold',
                fontFamily: 'Gbold',
                ...(providerBrand === it.label && {
                  bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                }),
                '&:hover': {
                  color: 'primary.main',
                },
              }}
              onClick={() => {
                if (data && data.provider === it.label) {
                  resetCurData(data);
                } else {
                  setModelUserList([]);
                  setError('');
                  setModelLoading(false);
                  setSuccess(false);
                  reset({
                    provider: it.label as keyof typeof ModelProvider,
                    base_url:
                      it.label === 'AzureOpenAI' ? '' : it.defaultBaseUrl,
                    model: '',
                    api_version: '',
                    api_key: '',
                    api_header_key: '',
                    api_header_value: '',
                  });
                }
              }}
            >
              <Icon type={it.icon} sx={{ fontSize: 18 }} />
              {it.cn || it.label || '其他'}
            </Stack>
          ))}
        </Stack>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ fontSize: 14, lineHeight: '32px' }}>
            API 地址{' '}
            <Box component={'span'} sx={{ color: 'red' }}>
              *
            </Box>
          </Box>
          <Controller
            control={control}
            name='base_url'
            rules={{
              required: {
                value: true,
                message: 'URL 不能为空',
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                disabled={!providers[providerBrand].urlWrite}
                size='small'
                placeholder={providers[providerBrand].defaultBaseUrl}
                error={!!errors.base_url}
                helperText={errors.base_url?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setModelUserList([]);
                  setValue('model', '');
                  setSuccess(false);
                }}
              />
            )}
          />
          <Stack
            direction={'row'}
            alignItems={'center'}
            justifyContent={'space-between'}
            sx={{ fontSize: 14, lineHeight: '32px', mt: 2 }}
          >
            <Box>
              API Secret
              {providers[providerBrand].secretRequired && (
                <Box component={'span'} sx={{ color: 'red' }}>
                  {' '}
                  *
                </Box>
              )}
            </Box>
            {providers[providerBrand].modelDocumentUrl && (
              <Box
                component={'span'}
                sx={{
                  color: 'primary.main',
                  cursor: 'pointer',
                  ml: 1,
                  textAlign: 'right',
                }}
                onClick={() =>
                  window.open(
                    providers[providerBrand].modelDocumentUrl,
                    '_blank',
                  )
                }
              >
                查看文档
              </Box>
            )}
          </Stack>
          <Controller
            control={control}
            name='api_key'
            rules={{
              required: {
                value: providers[providerBrand].secretRequired,
                message: 'API Secret 不能为空',
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size='small'
                placeholder=''
                error={!!errors.api_key}
                helperText={errors.api_key?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setModelUserList([]);
                  setValue('model', '');
                  setSuccess(false);
                }}
              />
            )}
          />
          {providerBrand === 'AzureOpenAI' && (
            <>
              <Box sx={{ fontSize: 14, lineHeight: '32px', mt: 2 }}>
                API Version
              </Box>
              <Controller
                control={control}
                name='api_version'
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    size='small'
                    placeholder='2024-10-21'
                    error={!!errors.api_version}
                    helperText={errors.api_version?.message}
                    onChange={e => {
                      field.onChange(e.target.value);
                      setModelUserList([]);
                      setValue('model', '');
                      setSuccess(false);
                    }}
                  />
                )}
              />
            </>
          )}
          {providerBrand === 'Other' ? (
            <>
              <Box sx={{ fontSize: 14, lineHeight: '32px', mt: 2 }}>
                模型名称{' '}
                <Box component={'span'} sx={{ color: 'red' }}>
                  *
                </Box>
              </Box>
              <Controller
                control={control}
                name='model'
                rules={{
                  required: '模型名称不能为空',
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    size='small'
                    placeholder=''
                    error={!!errors.model}
                    helperText={errors.model?.message}
                  />
                )}
              />
              <Box sx={{ fontSize: 12, color: 'error.main', mt: 1 }}>
                需要与模型供应商提供的名称完全一致，不要随便填写
              </Box>
            </>
          ) : modelUserList.length === 0 ? (
            <Button
              fullWidth
              variant='outlined'
              loading={modelLoading}
              sx={{ mt: 4 }}
              onClick={handleSubmit(getModel)}
            >
              获取模型列表
            </Button>
          ) : (
            <>
              <Box sx={{ fontSize: 14, lineHeight: '32px', mt: 2 }}>
                模型名称{' '}
                <Box component={'span'} sx={{ color: 'red' }}>
                  *
                </Box>
              </Box>
              <Controller
                control={control}
                name='model'
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    select
                    size='small'
                    placeholder=''
                    error={!!errors.model}
                    helperText={errors.model?.message}
                  >
                    {modelUserList.map(it => (
                      <MenuItem key={it.model} value={it.model}>
                        {it.model}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              {providers[providerBrand].customHeader && (
                <>
                  <Box sx={{ fontSize: 14, lineHeight: '32px', mt: 2 }}>
                    Header
                  </Box>
                  <Stack direction={'row'} gap={1}>
                    <Controller
                      control={control}
                      name='api_header_key'
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          size='small'
                          placeholder='key'
                          error={!!errors.api_header_key}
                          helperText={errors.api_header_key?.message}
                        />
                      )}
                    />
                    <Box sx={{ fontSize: 14, lineHeight: '36px' }}>=</Box>
                    <Controller
                      control={control}
                      name='api_header_value'
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          size='small'
                          placeholder='value'
                          error={!!errors.api_header_value}
                          helperText={errors.api_header_value?.message}
                        />
                      )}
                    />
                  </Stack>
                </>
              )}
            </>
          )}
          {error && (
            <Card
              sx={{
                color: 'error.main',
                mt: 2,
                fontSize: 12,
                p: 2,
                bgcolor: 'background.paper2',
                border: '1px solid',
                borderColor: 'error.main',
              }}
            >
              {error}
            </Card>
          )}
        </Box>
      </Stack>
    </Modal>
  );
};

export default ModelAdd;
