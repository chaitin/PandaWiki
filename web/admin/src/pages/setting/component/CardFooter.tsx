import { updateAppDetail } from '@/api';
import { AppDetail, FooterSetting } from '@/api/type';
import DragBrand from '@/components/Drag/DragBrand';
import UploadFile from '@/components/UploadFile';
import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material';
import { Message } from 'ct-mui';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

interface CardFooterProps {
  id: string;
  data: AppDetail;
  refresh: (value: FooterSetting) => void;
}

const CardFooter = ({ id, data, refresh }: CardFooterProps) => {
  const [isEdit, setIsEdit] = useState(false);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FooterSetting>({
    defaultValues: {
      footer_style: 'simple',
      corp_name: '',
      icp: '',
      brand_name: '',
      brand_desc: '',
      brand_logo: '',
      brand_groups: [],
    },
  });

  const footerStyle = watch('footer_style');

  const onSubmit = (value: FooterSetting) => {
    updateAppDetail(
      { id },
      {
        settings: {
          ...data.settings,
          footer_settings: {
            ...data.settings?.footer_settings,
            ...value,
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
    setValue('footer_style', data.settings?.footer_settings?.footer_style);
    setValue('corp_name', data.settings?.footer_settings?.corp_name);
    setValue('icp', data.settings?.footer_settings?.icp);
    setValue('brand_name', data.settings?.footer_settings?.brand_name);
    setValue('brand_desc', data.settings?.footer_settings?.brand_desc);
    setValue('brand_logo', data.settings?.footer_settings?.brand_logo);
    setValue(
      'brand_groups',
      data.settings?.footer_settings?.brand_groups || [],
    );
  }, [data]);

  return (
    <>
      <Stack
        direction='row'
        alignItems={'center'}
        justifyContent={'space-between'}
        sx={{
          height: 32,
          fontWeight: 'bold',
          m: 2,
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
          页脚
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
            页面模式
          </Box>
          <Controller
            control={control}
            name='footer_style'
            render={({ field }) => (
              <RadioGroup
                row
                {...field}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              >
                <FormControlLabel
                  value={'simple'}
                  control={<Radio size='small' />}
                  label={<Box sx={{ width: 100 }}>简单页脚</Box>}
                />
                <FormControlLabel
                  value={'complex'}
                  control={<Radio size='small' />}
                  label={<Box sx={{ width: 100 }}>扩展页脚</Box>}
                />
              </RadioGroup>
            )}
          />
        </Stack>
        <Stack direction={'row'} gap={2} alignItems={'center'}>
          <Box
            sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}
          >
            企业名称 / 组织名称
          </Box>
          <Controller
            control={control}
            name='corp_name'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='企业名称/组织名称'
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
                error={!!errors.corp_name}
                helperText={errors.corp_name?.message}
              />
            )}
          />
        </Stack>
        <Stack direction={'row'} gap={2} alignItems={'center'}>
          <Box
            sx={{ width: 156, fontSize: 14, lineHeight: '32px', flexShrink: 0 }}
          >
            ICP 备案编号
          </Box>
          <Controller
            control={control}
            name='icp'
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='ICP 备案编号'
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
                error={!!errors.icp}
                helperText={errors.icp?.message}
              />
            )}
          />
        </Stack>
        {footerStyle === 'complex' && (
          <>
            <Stack direction={'row'} gap={2} alignItems={'center'}>
              <Box
                sx={{
                  width: 156,
                  fontSize: 14,
                  lineHeight: '32px',
                  flexShrink: 0,
                }}
              >
                品牌名称
              </Box>
              <Controller
                control={control}
                name='brand_name'
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder='品牌名称'
                    onChange={e => {
                      field.onChange(e.target.value);
                      setIsEdit(true);
                    }}
                    error={!!errors.brand_name}
                    helperText={errors.brand_name?.message}
                  />
                )}
              />
            </Stack>
            <Stack direction={'row'} gap={2} alignItems={'center'}>
              <Box
                sx={{
                  width: 156,
                  fontSize: 14,
                  lineHeight: '32px',
                  flexShrink: 0,
                }}
              >
                品牌 Logo
              </Box>
              <Controller
                control={control}
                name='brand_logo'
                render={({ field }) => (
                  <UploadFile
                    {...field}
                    id='brand_logo'
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
            <Stack direction={'row'} gap={2} alignItems={'center'}>
              <Box
                sx={{
                  width: 156,
                  fontSize: 14,
                  lineHeight: '32px',
                  flexShrink: 0,
                }}
              >
                品牌介绍
              </Box>
              <Controller
                control={control}
                name='brand_desc'
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder='品牌介绍'
                    onChange={e => {
                      field.onChange(e.target.value);
                      setIsEdit(true);
                    }}
                    error={!!errors.brand_desc}
                    helperText={errors.brand_desc?.message}
                  />
                )}
              />
            </Stack>
            <Box>
              <Box
                sx={{
                  width: 156,
                  fontSize: 14,
                  lineHeight: '32px',
                  flexShrink: 0,
                  my: 1,
                }}
              >
                链接组
              </Box>
              {/* 使用 DragBrand 组件替换原有的品牌链接组 */}
              <DragBrand
                control={control}
                errors={errors}
                setIsEdit={setIsEdit}
              />
            </Box>
          </>
        )}
      </Stack>
    </>
  );
};

export default CardFooter;
