import { DomainKnowledgeBaseDetail } from '@/request/types';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material';
import ShowText from '@/components/ShowText';
import { getApiV1AppDetail, putApiV1App } from '@/request/App';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { FormItem, SettingCardItem } from './Common';
import { DomainAppDetailResp } from '@/request/types';
import { message } from '@ctzhian/ui';
import { useAppSelector } from '@/store';

const CardRobotApi = ({
  kb,
  url,
}: {
  kb: DomainKnowledgeBaseDetail;
  url: string;
}) => {
  const [isEdit, setIsEdit] = useState(false);
  const [detail, setDetail] = useState<DomainAppDetailResp | null>(null);
  const { license } = useAppSelector(state => state.config);

  const isEnterprise = useMemo(() => {
    return license.edition === 2;
  }, [license]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      is_enabled: false,
      secret_key: '',
    },
  });

  const isEnabled = watch('is_enabled');

  const getDetail = () => {
    getApiV1AppDetail({ kb_id: kb.id!, type: '9' }).then(res => {
      setValue(
        'is_enabled',
        res.settings?.openai_api_bot_settings?.is_enabled ?? false,
      );
      setValue(
        'secret_key',
        res.settings?.openai_api_bot_settings?.secret_key ?? '',
      );
      setDetail(res);
    });
  };

  useEffect(() => {
    if (!kb) return;
    getDetail();
  }, [kb]);

  const onSubmit = handleSubmit(data => {
    if (!kb) return;
    putApiV1App(
      { id: detail!.id! },
      {
        kb_id: kb.id!,
        settings: {
          openai_api_bot_settings: {
            is_enabled: data.is_enabled,
            secret_key: data.secret_key,
          },
        },
      },
    ).then(() => {
      message.success('保存成功');
      setIsEdit(false);
      getDetail();
      reset();
    });
  });

  return (
    <SettingCardItem
      title='问答机器人 API'
      isEdit={isEdit}
      more={
        <Link
          component='a'
          href='https://wiki.webinfra.cloud/node/01971b60-100e-7b23-9385-e36763df5c0a'
          target='_blank'
          sx={{
            fontSize: 14,
            ml: 1,
            textDecoration: 'none',
            fontWeight: 'normal',
            '&:hover': {
              fontWeight: 'bold',
            },
          }}
        >
          使用方法
        </Link>
      }
      onSubmit={onSubmit}
    >
      <FormItem
        label='问答机器人 API'
        tooltip={!isEnterprise ? '企业版可用' : undefined}
      >
        <FormControl>
          <Controller
            control={control}
            name='is_enabled'
            render={({ field }) => (
              <RadioGroup
                {...field}
                onChange={e => {
                  field.onChange(e.target.value === 'true');
                  setIsEdit(true);
                }}
              >
                <Stack direction={'row'}>
                  <FormControlLabel
                    value={true}
                    disabled={!isEnterprise}
                    control={<Radio size='small' />}
                    label={<Box sx={{ width: 100 }}>启用</Box>}
                  />
                  <FormControlLabel
                    value={false}
                    disabled={!isEnterprise}
                    control={<Radio size='small' />}
                    label={<Box sx={{ width: 100 }}>禁用</Box>}
                  />
                </Stack>
              </RadioGroup>
            )}
          />
        </FormControl>
      </FormItem>

      {isEnabled && (
        <>
          <FormItem label='API Token' required>
            <Controller
              control={control}
              name='secret_key'
              rules={{
                required: 'API Token 不能为空',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  placeholder={'API Token'}
                  error={!!errors.secret_key}
                  helperText={errors.secret_key?.message}
                />
              )}
            />
          </FormItem>
          <FormItem label='API 调用地址'>
            <ShowText text={[`${url}/share/v1/chat/completions`]} />
          </FormItem>
        </>
      )}
    </SettingCardItem>
  );
};

export default CardRobotApi;
