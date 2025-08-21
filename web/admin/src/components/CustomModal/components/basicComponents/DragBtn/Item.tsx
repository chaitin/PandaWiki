import { CardWebHeaderBtn } from '@/api';
import UploadFile from '@/components/UploadFile';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAppPreviewData } from '@/store/slices/config';
import {
  Box,
  Checkbox,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { Icon } from '@ctzhian/ui';
import {
  CSSProperties,
  Dispatch,
  forwardRef,
  HTMLAttributes,
  SetStateAction,
  useEffect,
} from 'react';
import { Control, Controller, useForm } from 'react-hook-form';

export type ItemProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  item: CardWebHeaderBtn;
  withOpacity?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
  handleRemove?: (id: string) => void;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  data: CardWebHeaderBtn[];
  control: Control<any>;
};

const Item = forwardRef<HTMLDivElement, ItemProps>(
  (
    {
      item,
      withOpacity,
      isDragging,
      style,
      dragHandleProps,
      handleRemove,
      setIsEdit,
      data: btns,
      control,
      ...props
    },
    ref,
  ) => {
    const dispatch = useAppDispatch();
    const { appPreviewData } = useAppSelector(state => state.config);
    const inlineStyles: CSSProperties = {
      opacity: withOpacity ? '0.5' : '1',
      borderRadius: '10px',
      cursor: isDragging ? 'grabbing' : 'grab',
      backgroundColor: '#ffffff',
      ...style,
    };
    return (
      <Box ref={ref} style={inlineStyles} {...props}>
        <Stack
          direction={'row'}
          alignItems={'center'}
          justifyContent={'space-between'}
          gap={0.5}
          sx={{
            px: 1,
            py: '20px',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            height: '234px',
            width: '346px',
          }}
        >
          <Controller
            control={control}
            name='btns'
            render={({ field }) => {
              const curBtn = btns.find(btn => btn.id === item.id);
              if (!curBtn) return <></>;
              return (
                <Stack direction={'column'} gap={'20px'}>
                  <Stack direction={'row'} gap={1}>
                    <FormControl>
                      <InputLabel
                        id={curBtn.id + '_button_style'}
                        sx={{
                          '&.Mui-focused': {
                            color: 'black',
                          },
                        }}
                      >
                        按钮样式
                      </InputLabel>
                      <Select
                        labelId={curBtn.id + '_button_style'}
                        id={curBtn.id + '_button_style'}
                        value={curBtn.variant}
                        label='按钮样式'
                        onChange={e => {
                          const newBtns = [
                            ...(appPreviewData?.settings.btns || []),
                          ];
                          const index = newBtns.findIndex(
                            (btn: CardWebHeaderBtn) => btn.id === curBtn.id,
                          );
                          newBtns[index] = {
                            ...curBtn,
                            variant: e.target.value as 'contained' | 'outlined',
                          };
                          field.onChange(newBtns);
                          setIsEdit(true);
                        }}
                        sx={{
                          width: '144px',
                          height: '36px',
                        }}
                      >
                        <MenuItem value={'contained'}>实心</MenuItem>
                        <MenuItem value={'outlined'}>描边</MenuItem>
                        <MenuItem value={'text'}>文字</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl>
                      <InputLabel
                        id={curBtn.id + '_button_target'}
                        sx={{
                          '&.Mui-focused': {
                            color: 'black',
                          },
                        }}
                      >
                        打开方式
                      </InputLabel>
                      <Select
                        labelId={curBtn.id + '_button_target'}
                        id={curBtn.id + '_button_target'}
                        value={curBtn.target}
                        label='打开方式'
                        onChange={e => {
                          const newBtns = [
                            ...(appPreviewData?.settings.btns || []),
                          ];
                          const index = newBtns.findIndex(
                            (btn: CardWebHeaderBtn) => btn.id === curBtn.id,
                          );
                          newBtns[index] = {
                            ...curBtn,
                            target: e.target.value as '_blank' | '_self',
                          };
                          field.onChange(newBtns);
                          setIsEdit(true);
                        }}
                        sx={{
                          width: '144px',
                          height: '36px',
                        }}
                      >
                        <MenuItem value={'_self'}>当前窗口</MenuItem>
                        <MenuItem value={'_blank'}>新窗口</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                  <Stack direction={'row'} gap={2}>
                    <Stack direction={'row'} alignItems={'center'} gap={1}>
                      <Checkbox
                        size='small'
                        sx={{ p: 0, m: 0 }}
                        checked={curBtn.showIcon}
                        onChange={e => {
                          const newBtns = [
                            ...(appPreviewData?.settings.btns || []),
                          ];
                          const index = newBtns.findIndex(
                            (btn: CardWebHeaderBtn) => btn.id === curBtn.id,
                          );
                          newBtns[index] = {
                            ...curBtn,
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
                      id={`${curBtn.id}_icon`}
                      type='url'
                      disabled={false}
                      accept='image/*'
                      width={36}
                      value={curBtn.icon}
                      onChange={(url: string) => {
                        const newBtns = [
                          ...(appPreviewData?.settings.btns || []),
                        ];
                        const index = newBtns.findIndex(
                          (btn: CardWebHeaderBtn) => btn.id === curBtn.id,
                        );
                        newBtns[index] = { ...curBtn, icon: url };
                        field.onChange(newBtns);
                        setIsEdit(true);
                      }}
                    />
                  </Stack>
                  <TextField
                    label='按钮文本'
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                    sx={{
                      height: '36px',
                      '& .MuiOutlinedInput-root': {
                        height: '36px',
                        padding: '0 12px',
                        '& .MuiOutlinedInput-input': {
                          padding: '8px 0',
                        },
                      },
                    }}
                    fullWidth
                    placeholder='请输入文本'
                    variant='outlined'
                    value={curBtn.text}
                    onChange={e => {
                      const newBtns = [
                        ...(appPreviewData?.settings.btns || []),
                      ];
                      const index = newBtns.findIndex(
                        (btn: CardWebHeaderBtn) => btn.id === curBtn.id,
                      );
                      newBtns[index] = { ...curBtn, text: e.target.value };
                      field.onChange(newBtns);
                      setIsEdit(true);
                    }}
                  />
                  <TextField
                    label='按钮链接'
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                    sx={{
                      height: '36px',
                      '& .MuiOutlinedInput-root': {
                        height: '36px',
                        padding: '0 12px',
                        '& .MuiOutlinedInput-input': {
                          padding: '8px 0',
                        },
                      },
                    }}
                    fullWidth
                    placeholder='请输入链接'
                    value={curBtn.url}
                    variant='outlined'
                    onChange={e => {
                      const newBtns = [
                        ...(appPreviewData?.settings.btns || []),
                      ];
                      const index = newBtns.findIndex(
                        (btn: CardWebHeaderBtn) => btn.id === curBtn.id,
                      );
                      newBtns[index] = { ...curBtn, url: e.target.value };
                      field.onChange(newBtns);
                      setIsEdit(true);
                    }}
                  />
                </Stack>
              );
            }}
          />

          <Stack
            direction={'column'}
            sx={{ justifyContent: 'space-between', height: '100%' }}
          >
            <IconButton
              size='small'
              onClick={e => {
                e.stopPropagation();
                handleRemove?.(item.id);
              }}
              sx={{
                color: 'text.tertiary',
                ':hover': { color: 'error.main' },
                width: '28px',
                height: '28px',
              }}
            >
              <Icon type='icon-shanchu2' sx={{ fontSize: '12px' }} />
            </IconButton>
            <IconButton
              size='small'
              sx={{
                cursor: 'grab',
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
              {...dragHandleProps}
            >
              <Icon type='icon-drag' />
            </IconButton>
          </Stack>
        </Stack>
      </Box>
    );
  },
);

export default Item;
