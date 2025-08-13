import { updateAppDetail } from '@/api';
import { AppDetail, ThemeAndStyleSetting, ThemeMode } from '@/api/type';
import UploadFile from '@/components/UploadFile';
import { Box, Button, MenuItem, Select, Stack } from '@mui/material';
import { Message } from 'ct-mui';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

interface CardStyleProps {
  id: string;
  data: AppDetail;
  refresh: (value: ThemeMode & ThemeAndStyleSetting) => void;
}

const CardStyle = ({ id, data, refresh }: CardStyleProps) => {
  const [isEdit, setIsEdit] = useState(false);
  const { control, handleSubmit, setValue } = useForm<
    ThemeMode & ThemeAndStyleSetting
  >({
    defaultValues: {
      theme_mode: 'light',
      bg_image: '',
    },
  });

  const onSubmit = (value: ThemeMode & ThemeAndStyleSetting) => {
    updateAppDetail(
      { id },
      {
        settings: {
          ...data.settings,
          theme_mode: value.theme_mode,
          theme_and_style: {
            ...data.settings?.theme_and_style,
            bg_image: value.bg_image,
          },
        },
      },
    ).then(() => {
      refresh(value);
      Message.success('保存成功');
      setIsEdit(false);
    });
  };

  useEffect(() => {
    setValue('theme_mode', data.settings?.theme_mode);
    setValue('bg_image', data.settings?.theme_and_style?.bg_image);
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
          样式与风格
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
      <Stack gap={2} sx={{ mx: 2 }}>
        <Stack direction={'row'} gap={2} alignItems={'center'}>
          <Box
            sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}
          >
            配色方案
          </Box>
          <Controller
            control={control}
            name='theme_mode'
            render={({ field }) => (
              <Select
                {...field}
                sx={{ width: '100%', height: 52 }}
                onChange={e => {
                  field.onChange(e.target.value as 'light' | 'dark');
                  setIsEdit(true);
                }}
              >
                <MenuItem value='light'>浅色模式</MenuItem>
                <MenuItem value='dark'>深色模式</MenuItem>
              </Select>
            )}
          />
        </Stack>
        <Stack direction={'row'} gap={2}>
          <Box
            sx={{ width: 156, fontSize: 14, lineHeight: '52px', flexShrink: 0 }}
          >
            背景图片
          </Box>
          <Controller
            control={control}
            name='bg_image'
            render={({ field }) => (
              <UploadFile
                {...field}
                id='bg_image'
                type='url'
                accept='image/*'
                width={80}
                onChange={url => {
                  field.onChange(url);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </Stack>
      </Stack>
    </>
  );
};

export default CardStyle;
