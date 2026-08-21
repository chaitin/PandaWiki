import { AppDetail, HeaderSetting } from '@/api';
import UploadFile from '@/components/UploadFile';
import { Stack, Box, TextField, SvgIconProps } from '@mui/material';
import DragBrand from '../basicComponents/DragBrand';
import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAppPreviewData } from '@/store/slices/config';
import { DomainSocialMediaAccount } from '@/request/types';
import Switch from '../basicComponents/Switch';
import DragSocialInfo from '../basicComponents/DragSocialInfo';
import VersionMask from '@/components/VersionMask';
import { PROFESSION_VERSION_PERMISSION } from '@/constant/version';
import { IconTianjia } from '@panda-wiki/icons';
import {
  IconWeixingongzhonghao,
  IconDianhua,
  IconWeixingongzhonghaoDaiyanse,
  IconDianhua1,
} from '@panda-wiki/icons';

interface FooterConfigProps {
  data?: AppDetail | null;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  isEdit: boolean;
}
export interface Option {
  key: string;
  value: string;
  type: React.ComponentType<SvgIconProps>;
  config_type?: React.ComponentType<SvgIconProps>;
  text_placeholder?: string;
  text_label?: string;
}
export const options: Option[] = [
  {
    key: 'wechat_oa',
    value: '微信公众号',
    type: IconWeixingongzhonghao,
    config_type: IconWeixingongzhonghaoDaiyanse,
    text_placeholder: '请输入公众号名称',
    text_label: '公众号名称',
  },
  {
    key: 'phone',
    value: '电话',
    type: IconDianhua,
    config_type: IconDianhua1,
    text_placeholder: '请输入文字',
    text_label: '文字',
  },
];
const FooterConfig = ({ data, setIsEdit, isEdit }: FooterConfigProps) => {
  const { appPreviewData, license } = useAppSelector(state => state.config);
  const dispatch = useAppDispatch();
  const {
    control,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<HeaderSetting | any>({
    defaultValues: {
      corp_name: '',
      icp: '',
      brand_name: '',
      brand_desc: '',
      brand_logo: '',
      show_brand_info: false,
      social_media_accounts: [],
      footer_show_intro: true,
      brand_groups: [],
    },
  });

  const corp_name = watch('corp_name');
  const icp = watch('icp');
  const brand_name = watch('brand_name');
  const brand_desc = watch('brand_desc');
  const brand_logo = watch('brand_logo');
  const brand_groups = watch('brand_groups');
  const show_brand_info = watch('show_brand_info');
  const social_media_accounts: DomainSocialMediaAccount[] = watch(
    'social_media_accounts',
  );
  const footer_show_intro = watch('footer_show_intro');
  const isHydratingRef = useRef(true);
  const latestAppPreviewDataRef = useRef(appPreviewData);

  useEffect(() => {
    latestAppPreviewDataRef.current = appPreviewData;
  }, [appPreviewData]);

  useEffect(() => {
    const source =
      isEdit && appPreviewData ? appPreviewData.settings : data?.settings;
    if (!source) return;

    isHydratingRef.current = true;
    reset({
      corp_name: source.footer_settings?.corp_name || '',
      icp: source.footer_settings?.icp || '',
      brand_name: source.footer_settings?.brand_name || '',
      brand_desc: source.footer_settings?.brand_desc || '',
      brand_logo: source.footer_settings?.brand_logo || '',
      brand_groups: source.footer_settings?.brand_groups || [],
      show_brand_info: source.web_app_custom_style?.show_brand_info || false,
      social_media_accounts:
        source.web_app_custom_style?.social_media_accounts || [],
      footer_show_intro:
        source.web_app_custom_style?.footer_show_intro === false ? false : true,
    });
  }, [appPreviewData?.id, data?.id, reset]);
  useEffect(() => {
    if (!latestAppPreviewDataRef.current) return;
    if (isHydratingRef.current) {
      isHydratingRef.current = false;
      return;
    }

    const currentAppPreviewData = latestAppPreviewDataRef.current;
    const previewData = {
      ...currentAppPreviewData,
      settings: {
        ...currentAppPreviewData.settings,
        footer_settings: {
          ...currentAppPreviewData.settings?.footer_settings,
          corp_name,
          icp,
          brand_name,
          brand_desc,
          brand_logo,
          brand_groups,
        },
        web_app_custom_style: {
          ...currentAppPreviewData.settings?.web_app_custom_style,
          show_brand_info,
          social_media_accounts,
          footer_show_intro,
        },
      },
    };
    dispatch(setAppPreviewData(previewData));
  }, [
    corp_name,
    icp,
    brand_name,
    brand_desc,
    brand_logo,
    brand_groups,
    dispatch,
    show_brand_info,
    social_media_accounts,
    footer_show_intro,
  ]);

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
              fontWeight: 600,
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
            网站介绍信息
            <Controller
              control={control}
              name='footer_show_intro'
              render={({ field }) => (
                <Switch
                  sx={{ marginLeft: 'auto', mr: 0.5 }}
                  {...field}
                  checked={field?.value === false ? false : true}
                  onChange={e => {
                    field.onChange(e.target.checked);
                    setIsEdit(true);
                  }}
                ></Switch>
              )}
            />
          </Box>
          <Stack direction={'column'} spacing={3}>
            <Stack direction={'column'} spacing={1}>
              <Box
                sx={{ fontWeight: 400, fontSize: '12px', lineHeight: '20px' }}
              >
                Logo 图标
              </Box>
              <Controller
                control={control}
                name='brand_logo'
                render={({ field }) => (
                  <UploadFile
                    {...field}
                    id='footerconfig_logo'
                    name='footerconfig_logo'
                    type='url'
                    accept='image/*'
                    width={80}
                    onChange={(url: string) => {
                      field.onChange(url);
                      setIsEdit(true);
                    }}
                  />
                )}
              />
            </Stack>
            <Stack direction={'column'} spacing={1}>
              <Box
                sx={{ fontWeight: 400, fontSize: '12px', lineHeight: '20px' }}
              >
                Logo 文字
              </Box>
              <Controller
                control={control}
                name='brand_name'
                render={({ field }) => (
                  <TextField
                    fullWidth
                    {...field}
                    placeholder='请输入'
                    error={!!errors.title}
                    helperText={errors.title?.message?.toString()}
                    onChange={e => {
                      field.onChange(e.target.value);
                      setIsEdit(true);
                    }}
                  />
                )}
              />
            </Stack>
            <Stack direction={'column'} spacing={1}>
              <Box
                sx={{ fontWeight: 400, fontSize: '12px', lineHeight: '20px' }}
              >
                说明信息
              </Box>
              <Controller
                control={control}
                name='brand_desc'
                render={({ field }) => (
                  <TextField
                    fullWidth
                    {...field}
                    placeholder='请输入'
                    error={!!errors.title}
                    helperText={errors.title?.message?.toString()}
                    onChange={e => {
                      field.onChange(e.target.value);
                      setIsEdit(true);
                    }}
                    multiline
                    sx={{
                      '& textarea': {
                        resize: 'vertical',
                        minHeight: '36px',
                        minWidth: '100%',
                      },
                      '& .MuiOutlinedInput-root': {
                        pb: '4px',
                        pr: '4px',
                      },
                    }}
                  />
                )}
              />
            </Stack>
            <Stack direction={'column'} spacing={1}>
              <Stack
                sx={{ fontWeight: 400, fontSize: '12px', lineHeight: '20px' }}
                direction={'row'}
              >
                社交信息
                <Stack
                  direction={'row'}
                  sx={{
                    alignItems: 'center',
                    marginLeft: 'auto',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const newAccounts = [
                      ...(social_media_accounts || []),
                      {
                        icon: '',
                        channel: '',
                        text: '',
                        link: '',
                      },
                    ];
                    setValue('social_media_accounts', newAccounts);
                    setIsEdit(true);
                  }}
                >
                  <IconTianjia
                    sx={{ fontSize: '10px !important', color: '#5F58FE' }}
                  />
                  <Box
                    sx={{
                      fontSize: 14,
                      lineHeight: '22px',
                      marginLeft: 0.5,
                      color: '#5F58FE',
                    }}
                  >
                    添加
                  </Box>
                </Stack>
              </Stack>
              <DragSocialInfo
                data={social_media_accounts || []}
                control={control}
                onChange={(data: DomainSocialMediaAccount[]) => {
                  setValue('social_media_accounts', data);
                  setIsEdit(true);
                }}
                setIsEdit={setIsEdit}
              ></DragSocialInfo>
            </Stack>
          </Stack>
        </Stack>
        <Stack direction={'column'} gap={2}>
          <Box
            sx={{
              fontSize: 14,
              lineHeight: '22px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600,
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
            链接组
            <Stack
              direction={'row'}
              sx={{
                alignItems: 'center',
                marginLeft: 'auto',
                cursor: 'pointer',
              }}
              onClick={() => {
                const newGroups = [
                  ...(brand_groups || []),
                  { name: '', links: [{ name: '', url: '' }] },
                ];
                setValue('brand_groups', newGroups);
                setIsEdit(true);
              }}
            >
              <IconTianjia
                sx={{ fontSize: '10px !important', color: '#5F58FE' }}
              />
              <Box
                sx={{
                  fontSize: 14,
                  lineHeight: '22px',
                  marginLeft: 0.5,
                  fontWeight: 400,
                  color: '#5F58FE',
                }}
              >
                添加
              </Box>
            </Stack>
          </Box>

          <DragBrand
            control={control}
            data={brand_groups || []}
            onChange={brand_groups => {
              setValue('brand_groups', brand_groups);
              setIsEdit(true);
            }}
            setIsEdit={setIsEdit}
            errors={errors}
          ></DragBrand>
        </Stack>
        <Stack direction={'column'} gap={2}>
          <Box
            sx={{
              fontSize: 14,
              lineHeight: '22px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600,
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
            版权信息
          </Box>
          <Controller
            control={control}
            name='corp_name'
            render={({ field }) => (
              <TextField
                fullWidth
                {...field}
                placeholder='请输入'
                error={!!errors.title}
                helperText={errors.title?.message?.toString()}
                onChange={e => {
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
              fontWeight: 600,
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
            ICP 备案编号
          </Box>
          <Controller
            control={control}
            name='icp'
            render={({ field }) => (
              <TextField
                fullWidth
                {...field}
                placeholder='请输入'
                error={!!errors.placeholder}
                helperText={errors.placeholder?.message?.toString()}
                onChange={e => {
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
              fontWeight: 600,
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
            湖工院版权信息
          </Box>
          <VersionMask
            permission={PROFESSION_VERSION_PERMISSION}
            wrapperSx={{ px: 2 }}
            sx={{ inset: '-8px 0' }}
          >
            <Controller
              control={control}
              name='show_brand_info'
              render={({ field }) => (
                <Stack direction={'row'}>
                  <Box
                    sx={{
                      fontSize: 12,
                      lineHeight: '20px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    展示 湖工院版权信息
                  </Box>
                  <Switch
                    sx={{ marginLeft: 'auto' }}
                    {...field}
                    checked={field?.value === false ? false : true}
                    onChange={e => {
                      field.onChange(e.target.checked);
                      setIsEdit(true);
                    }}
                  ></Switch>
                </Stack>
              )}
            />
          </VersionMask>
        </Stack>
      </Stack>
    </>
  );
};

export default FooterConfig;
