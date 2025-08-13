import {
  AppDetail,
  CardWebHeaderBtn,
  HeaderSetting,
  updateAppDetail,
} from '@/api';
import DragBtn from '@/components/Drag/DragBtn';
import UploadFile from '@/components/UploadFile';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material';
import { Icon, Message } from 'ct-mui';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

interface CardWebHeaderProps {
  id: string;
  data: AppDetail;
  refresh: (value: HeaderSetting) => void;
}

const CardWebHeader = ({ id, data, refresh }: CardWebHeaderProps) => {
  const [isEdit, setIsEdit] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<HeaderSetting>({
    defaultValues: {
      title: '',
      icon: '',
      btns: [],
    },
  });

  const btns = watch('btns');

  const [selectedBtnId, setSelectedBtnId] = useState<string | null>(null);

  const handleAddButton = () => {
    const id = Date.now().toString();
    const newBtn = {
      id,
      url: '',
      variant: 'outlined' as const,
      showIcon: false,
      icon: '',
      text: '按钮' + (btns.length + 1),
      target: '_self' as const,
    };

    const currentBtns = btns || [];
    const newBtns = [...currentBtns, newBtn];
    setValue('btns', newBtns);
    setSelectedBtnId(id);
    setIsEdit(true);
  };

  const onSubmit = (value: HeaderSetting) => {
    updateAppDetail({ id }, { settings: { ...data.settings, ...value } }).then(
      () => {
        refresh(value);
        Message.success('保存成功');
        setIsEdit(false);
      },
    );
  };

  useEffect(() => {
    setValue('title', data.settings?.title || '');
    setValue('icon', data.settings?.icon || '');
    setValue('btns', data.settings?.btns || []);
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
          顶部导航
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
            网站标题
          </Box>
          <Controller
            control={control}
            name='title'
            render={({ field }) => (
              <TextField
                fullWidth
                {...field}
                placeholder='输入网站标题'
                error={!!errors.title}
                helperText={errors.title?.message}
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />
        </Stack>
        <Stack direction={'row'} gap={2}>
          <Box
            sx={{ width: 156, fontSize: 14, lineHeight: '52px', flexShrink: 0 }}
          >
            网站 Logo
          </Box>
          <Controller
            control={control}
            name='icon'
            render={({ field }) => (
              <UploadFile
                {...field}
                id='website_logo'
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
        <Box>
          <Box sx={{ my: 1, fontSize: 14, lineHeight: '32px' }}>
            导航右侧按钮
          </Box>
          <Box sx={{ mb: selectedBtnId !== null || btns.length > 0 ? 1 : 0 }}>
            <DragBtn
              data={btns}
              selectedBtnId={selectedBtnId}
              setSelectedBtnId={setSelectedBtnId}
              onChange={data => {
                if (!data.find(btn => btn.id === selectedBtnId))
                  setSelectedBtnId(null);
                setValue('btns', data);
                setIsEdit(true);
              }}
            />
          </Box>
          {selectedBtnId !== null && (
            <Controller
              control={control}
              name='btns'
              render={({ field }) => {
                const btn = field.value.find(
                  (btn: CardWebHeaderBtn) => btn.id === selectedBtnId,
                );
                if (!btn) return <></>;
                return (
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 2,
                      borderRadius: '10px',
                      mb: 1,
                    }}
                  >
                    <Stack gap={1}>
                      <Stack direction={'row'}>
                        <Box
                          sx={{ fontSize: 14, lineHeight: '32px', width: 80 }}
                        >
                          按钮样式
                        </Box>
                        <RadioGroup
                          value={btn.variant}
                          onChange={e => {
                            const newBtns = [...field.value];
                            const index = newBtns.findIndex(
                              (btn: CardWebHeaderBtn) =>
                                btn.id === selectedBtnId,
                            );
                            newBtns[index] = {
                              ...btn,
                              variant: e.target.value as
                                | 'contained'
                                | 'outlined',
                            };
                            field.onChange(newBtns);
                            setIsEdit(true);
                          }}
                          row
                        >
                          <FormControlLabel
                            value='contained'
                            control={<Radio size='small' />}
                            label='实心按钮'
                          />
                          <FormControlLabel
                            value='outlined'
                            control={<Radio size='small' />}
                            label='描边按钮'
                          />
                        </RadioGroup>
                      </Stack>
                      <Stack direction={'row'} alignItems={'center'}>
                        <Box
                          sx={{
                            fontSize: 14,
                            lineHeight: '32px',
                            flexShrink: 0,
                            width: 80,
                          }}
                        >
                          按钮文本
                        </Box>
                        <TextField
                          fullWidth
                          value={btn.text}
                          onChange={e => {
                            const newBtns = [...field.value];
                            const index = newBtns.findIndex(
                              (btn: CardWebHeaderBtn) =>
                                btn.id === selectedBtnId,
                            );
                            newBtns[index] = { ...btn, text: e.target.value };
                            field.onChange(newBtns);
                            setIsEdit(true);
                          }}
                        />
                      </Stack>
                      <Stack direction={'row'} alignItems={'center'}>
                        <Box
                          sx={{
                            fontSize: 14,
                            lineHeight: '32px',
                            flexShrink: 0,
                            width: 80,
                          }}
                        >
                          链接地址
                        </Box>
                        <TextField
                          fullWidth
                          value={btn.url}
                          onChange={e => {
                            const newBtns = [...field.value];
                            const index = newBtns.findIndex(
                              (btn: CardWebHeaderBtn) =>
                                btn.id === selectedBtnId,
                            );
                            newBtns[index] = { ...btn, url: e.target.value };
                            field.onChange(newBtns);
                            setIsEdit(true);
                          }}
                        />
                      </Stack>
                      <Stack direction={'row'} alignItems={'center'}>
                        <Box
                          sx={{ fontSize: 14, lineHeight: '32px', width: 80 }}
                        >
                          图标
                        </Box>
                        <FormControl>
                          <Stack
                            direction={'row'}
                            alignItems={'center'}
                            gap={2}
                          >
                            <Stack
                              direction={'row'}
                              alignItems={'center'}
                              gap={1}
                            >
                              <Checkbox
                                size='small'
                                sx={{ p: 0, m: 0 }}
                                checked={btn.showIcon}
                                onChange={e => {
                                  const newBtns = [...field.value];
                                  const index = newBtns.findIndex(
                                    (btn: CardWebHeaderBtn) =>
                                      btn.id === selectedBtnId,
                                  );
                                  newBtns[index] = {
                                    ...btn,
                                    showIcon: e.target.checked,
                                  };
                                  field.onChange(newBtns);
                                  setIsEdit(true);
                                }}
                              />
                              <Box sx={{ fontSize: 14, lineHeight: '32px' }}>
                                展示图标
                              </Box>
                            </Stack>
                            <UploadFile
                              name='icon'
                              id={`${selectedBtnId}_icon`}
                              type='url'
                              disabled={!btn.showIcon}
                              accept='image/*'
                              width={60}
                              value={btn.icon}
                              onChange={url => {
                                const newBtns = [...field.value];
                                const index = newBtns.findIndex(
                                  (btn: CardWebHeaderBtn) =>
                                    btn.id === selectedBtnId,
                                );
                                newBtns[index] = { ...btn, icon: url };
                                field.onChange(newBtns);
                                setIsEdit(true);
                              }}
                            />
                          </Stack>
                        </FormControl>
                      </Stack>
                      <Stack direction={'row'}>
                        <Box
                          sx={{ fontSize: 14, lineHeight: '32px', width: 80 }}
                        >
                          打开方式
                        </Box>
                        <RadioGroup
                          value={btn.target}
                          onChange={e => {
                            const newBtns = [...field.value];
                            const index = newBtns.findIndex(
                              (btn: CardWebHeaderBtn) =>
                                btn.id === selectedBtnId,
                            );
                            newBtns[index] = {
                              ...btn,
                              target: e.target.value as '_blank' | '_self',
                            };
                            field.onChange(newBtns);
                            setIsEdit(true);
                          }}
                          row
                        >
                          <FormControlLabel
                            value='_self'
                            control={<Radio size='small' />}
                            label='当前窗口'
                          />
                          <FormControlLabel
                            value='_blank'
                            control={<Radio size='small' />}
                            label='新窗口'
                          />
                        </RadioGroup>
                      </Stack>
                    </Stack>
                  </Box>
                );
              }}
            />
          )}
          <Button
            size='small'
            onClick={handleAddButton}
            startIcon={
              <Icon type='icon-add' sx={{ fontSize: '12px !important' }} />
            }
          >
            添加按钮
          </Button>
        </Box>
      </Stack>
    </>
  );
};
export default CardWebHeader;
