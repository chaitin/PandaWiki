import { AppDetail, HeaderSetting } from '@/api';
import DragBtn from './DragBtn';
import UploadFile from '@/components/UploadFile';
import Switch from './Switch';
import { Stack, Box, TextField } from '@mui/material';
import { Icon } from 'ct-mui';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAppPreviewData } from '@/store/slices/config';

interface CardWebHeaderProps {
  id?: string;
  data?: AppDetail | null;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  refresh: (value: HeaderSetting) => void;
}

const HeaderConfig = ({ data, setIsEdit }: CardWebHeaderProps) => {
  const { appPreviewData } = useAppSelector((state) => state.config);
  const dispatch = useAppDispatch();
  const {
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<HeaderSetting | any>({
    defaultValues: {
      title: '',
      icon: '',
      btns: [],
      header_search_placeholder: '',
    },
  });

  const btns = watch('btns');
  const title = watch('title');
  const icon = watch('icon');
  const header_search_placeholder = watch('header_search_placeholder');

  const handleAddButton = () => {
    const id = Date.now().toString();
    const newBtn = {
      id,
      url: '',
      variant: 'outlined' as const,
      showIcon: true,
      icon: '',
      text: '按钮' + (btns.length + 1),
      target: '_self' as const,
    };

    const currentBtns = appPreviewData?.settings.btns || [];
    const newBtns = [...currentBtns, newBtn];
    setValue('btns', newBtns);
    setIsEdit(true);
  };

  useEffect(() => {
    if (data?.settings) {
      setValue('title', data.settings?.title || '');
      setValue('icon', data.settings?.icon || '');
      setValue('btns', data.settings?.btns || []);
      setValue(
        'header_search_placeholder',
        data.settings.web_app_custom_style?.header_search_placeholder || ''
      );
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const previewData = {
      ...data,
      settings: {
        ...data.settings,
        title: title,
        btns: btns,
        icon: icon,
        web_app_custom_style: {
          header_search_placeholder: header_search_placeholder,
        },
      },
    };
    dispatch(setAppPreviewData(previewData));
  }, [title, btns, icon, header_search_placeholder]);

  return (
    <>
      <Stack gap={3}>
        <Stack direction={'column'} gap={2}>
          <Box
            sx={{
              fontSize: 14,
              lineHeight: '22px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              '&::before': {
                content: '""',
                display: 'inline-block',
                width: 4,
                height: 12,
                bgcolor: '#3248F2',
                borderRadius: '2px',
                mr: 1,
              },
            }}
          >
            Logo
          </Box>
          <Controller
            control={control}
            name='icon'
            render={({ field }) => (
              <UploadFile
                {...field}
                id='website_logo'
                name='website_logo'
                type='url'
                accept='image/*'
                width={80}
                onChange={(url: string) => {
                  console.log(url);
                  field.onChange(url);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </Stack>
        <Stack direction={'column'} gap={2}>
          <Box
            sx={{
              fontSize: 14,
              lineHeight: '22px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              '&::before': {
                content: '""',
                display: 'inline-block',
                width: 4,
                height: 12,
                bgcolor: '#3248F2',
                borderRadius: '2px',
                mr: 1,
              },
            }}
          >
            Logo 文字
          </Box>
          <Controller
            control={control}
            name='title'
            render={({ field }) => (
              <TextField
                fullWidth
                {...field}
                placeholder='请输入'
                error={!!errors.title}
                helperText={errors.title?.message?.toString()}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </Stack>
        <Stack direction={'column'} gap={2}>
          <Box
            sx={{
              fontSize: 14,
              lineHeight: '22px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              '&::before': {
                content: '""',
                display: 'inline-block',
                width: 4,
                height: 12,
                bgcolor: '#3248F2',
                borderRadius: '2px',
                mr: 1,
              },
            }}
          >
            搜索框提示文字
          </Box>
          <Controller
            control={control}
            name='header_search_placeholder'
            render={({ field }) => (
              <TextField
                fullWidth
                {...field}
                placeholder='请输入'
                error={!!errors.placeholder}
                helperText={errors.placeholder?.message?.toString()}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </Stack>
        <Stack direction={'column'} gap={2}>
          <Box
            sx={{
              fontSize: 14,
              lineHeight: '22px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              '&::before': {
                content: '""',
                display: 'inline-block',
                width: 4,
                height: 12,
                bgcolor: '#3248F2',
                borderRadius: '2px',
                mr: 1,
              },
            }}
          >
            按钮
            <Stack
              direction={'row'}
              sx={{
                alignItems: 'center',
                marginLeft: 'auto',
                cursor: 'pointer',
              }}
              onClick={handleAddButton}
            >
              <Icon
                type='icon-tianjia'
                sx={{ fontSize: '10px !important', color: '#5F58FE' }}
              />
              <Box sx={{ fontSize: 14, lineHeight: '22px', marginLeft: 0.5 }}>
                添加
              </Box>
            </Stack>
          </Box>
          <Box>
            <DragBtn
              data={btns}
              onChange={(btns) => {
                setValue('btns', btns);
                setIsEdit(true);
              }}
              setIsEdit={setIsEdit}
            />
          </Box>
        </Stack>
        {/* <Stack direction={'column'} gap={2}>
          <Controller
            control={control}
            name='placeholder'
            render={({ field }) => (
              <Box
                sx={{
                  fontSize: 14,
                  lineHeight: '22px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  '&::before': {
                    content: '""',
                    display: 'inline-block',
                    width: 4,
                    height: 12,
                    bgcolor: '#3248F2',
                    borderRadius: '2px',
                    mr: 1,
                  },
                }}
              >
                是否允许切换主题
                <Switch></Switch>
              </Box>
            )}
          />
        </Stack> */}
      </Stack>
    </>
  );
};

export default HeaderConfig;
