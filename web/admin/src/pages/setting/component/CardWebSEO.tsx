import { AppDetail, SEOSetting, updateAppDetail } from '@/api';
import { Box, Button, Checkbox, Stack, TextField } from '@mui/material';
import { Message } from 'ct-mui';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

interface CardWebSEOProps {
  id: string;
  data: AppDetail;
  refresh: (value: SEOSetting) => void;
}

const CardWebSEO = ({ data, id, refresh }: CardWebSEOProps) => {
  const [isEdit, setIsEdit] = useState(false);
  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<SEOSetting>({
    defaultValues: {
      desc: '',
      keyword: '',
      auto_sitemap: false,
    },
  });

  const onSubmit = (value: SEOSetting) => {
    updateAppDetail({ id }, { settings: { ...data.settings, ...value } }).then(
      () => {
        Message.success('保存成功');
        refresh(value);
        setIsEdit(false);
      },
    );
  };

  useEffect(() => {
    setValue('desc', data.settings?.desc || '');
    setValue('keyword', data.settings?.keyword || '');
    setValue('auto_sitemap', data.settings?.auto_sitemap ?? false);
  }, [data]);

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
          SEO
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
        <Stack direction={'row'} gap={2} alignItems={'center'}>
          <Box
            sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}
          >
            网站描述
          </Box>
          <Controller
            control={control}
            name='desc'
            render={({ field }) => (
              <TextField
                fullWidth
                {...field}
                placeholder='输入网站描述'
                error={!!errors.desc}
                helperText={errors.desc?.message}
                onChange={event => {
                  setIsEdit(true);
                  field.onChange(event);
                }}
              />
            )}
          />
        </Stack>
        <Stack direction={'row'} gap={2} alignItems={'center'}>
          <Box
            sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}
          >
            关键词
          </Box>
          <Controller
            control={control}
            name='keyword'
            render={({ field }) => (
              <TextField
                fullWidth
                {...field}
                placeholder='输入关键词'
                error={!!errors.keyword}
                helperText={errors.keyword?.message}
                onChange={event => {
                  setIsEdit(true);
                  field.onChange(event);
                }}
              />
            )}
          />
        </Stack>
        <Controller
          control={control}
          name='auto_sitemap'
          render={({ field }) => (
            <Stack direction='row' alignItems={'center'} gap={2} sx={{ mt: 1 }}>
              <Checkbox
                {...field}
                checked={field.value}
                size='small'
                sx={{ p: 0, m: 0 }}
                onChange={event => {
                  setIsEdit(true);
                  field.onChange(event);
                }}
              />
              <Box sx={{ fontSize: 14, lineHeight: '32px' }}>
                自动生成 Sitemap
              </Box>
            </Stack>
          )}
        />
      </Stack>
    </>
  );
};
export default CardWebSEO;
