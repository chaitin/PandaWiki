import UploadFile from '@/components/UploadFile';
import { DomainSocialMediaAccount } from '@/request/types';
import {
  Box,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Icon } from '@ctzhian/ui';
import {
  CSSProperties,
  Dispatch,
  forwardRef,
  HTMLAttributes,
  SetStateAction,
  useId,
} from 'react';
import { Control, Controller } from 'react-hook-form';
import { options } from '../../config/FooterConfig';

export interface SocialInfoProps extends HTMLAttributes<HTMLDivElement> {
  item: DomainSocialMediaAccount;
  data: DomainSocialMediaAccount[];
  control: Control<any>;
  withOpacity?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  index: number;
}
const Item = forwardRef<HTMLDivElement, SocialInfoProps>(
  (
    {
      item,
      data,
      control,
      setIsEdit,
      index,
      style,
      withOpacity,
      isDragging,
      dragHandleProps,
      ...props
    },
    ref,
  ) => {
    const id = useId();
    const inlineStyles: CSSProperties = {
      opacity: withOpacity ? '0.5' : '1',
      borderRadius: '10px',
      cursor: isDragging ? 'grabbing' : 'grab',
      backgroundColor: '#ffffff',
      ...style,
    };
    return (
      <>
        {item && (
          <Box ref={ref} {...props} style={inlineStyles}>
            <Controller
              control={control}
              name='social_media_accounts'
              render={({ field }) => (
                <Stack
                  direction={'column'}
                  sx={{
                    p: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '10px',
                    width: '346px',
                  }}
                  gap={1}
                >
                  <Stack
                    direction={'row'}
                    justifyContent={'flex-start'}
                    alignItems={'center'}
                  >
                    <IconButton
                      size='small'
                      sx={{
                        cursor: 'grab',
                        color: 'text.secondary',
                        '&:hover': { color: 'primary.main' },
                        flexShrink: 0,
                        width: '28px',
                        height: '28px',
                      }}
                      {...dragHandleProps}
                    >
                      <Icon type='icon-drag' />
                    </IconButton>
                    <Box
                      sx={{
                        fontSize: '12px',
                        lineHeight: '20px',
                        fontWeight: '600',
                      }}
                    >
                      社交信息{index + 1}
                    </Box>
                    <IconButton
                      size='small'
                      onClick={() => {
                        let newData = [...data];
                        newData = newData.filter((_, i) => i !== index);
                        field.onChange(newData);
                        setIsEdit(true);
                      }}
                      sx={{
                        color: 'text.auxiliary',
                        ':hover': { color: 'error.main' },
                        flexShrink: 0,
                        width: '28px',
                        height: '28px',
                        ml: 'auto',
                      }}
                    >
                      <Icon type='icon-shanchu2' sx={{ fontSize: '12px' }} />
                    </IconButton>
                  </Stack>
                  <Stack direction={'row'} gap={1}>
                    <Select
                      value={item?.channel || ''}
                      sx={{
                        bgcolor: '#fff',
                        padding: 0,
                        width: '60px',
                        minWidth: '60px',
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            maxHeight: 'none',
                            overflow: 'hidden',
                          },
                        },
                      }}
                      renderValue={selected => {
                        const option = options.find(i => i.key === selected);
                        return (
                          <Stack justifyContent={'center'} sx={{ mt: '2px' }}>
                            <Icon
                              type={
                                option
                                  ? option?.config_type || option?.type || ''
                                  : ''
                              }
                              sx={{ fontSize: '14px' }}
                            />
                          </Stack>
                        );
                      }}
                    >
                      <MenuItem
                        sx={{
                          bgcolor: '#fff',
                          padding: 0,
                        }}
                        disableRipple
                        onClick={e => e.preventDefault()}
                      >
                        <ToggleButtonGroup
                          value={item?.channel}
                          onChange={(e, newValue) => {
                            const newData = [...data];
                            newData[index] = {
                              ...item,
                              channel: newValue,
                            };
                            field.onChange(newData);
                            setIsEdit(true);
                          }}
                          exclusive
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            backgroundColor: 'white',
                            p: 1,
                            borderRadius: 1,
                          }}
                        >
                          {options.map(item => (
                            <ToggleButton
                              key={item.key}
                              value={item.key}
                              sx={{
                                p: 1,
                                height: 'auto',
                                border: '1px solid #ddd !important',
                                borderRadius: '0px',
                              }}
                            >
                              <Stack
                                direction='row'
                                gap={1}
                                alignItems='center'
                              >
                                <Icon
                                  type={item?.config_type || item?.type}
                                  sx={{ fontSize: '16px' }}
                                />
                                {/* <Box>{item.value || item.key}</Box> */}
                              </Stack>
                            </ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </MenuItem>
                    </Select>
                    <TextField
                      {...field}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                      value={item?.text || ''}
                      sx={{
                        width: '100%',
                        height: '36px',
                        bgcolor: '#ffffff',
                        '& .MuiOutlinedInput-root': {
                          height: '36px',
                          padding: '0 12px',
                          '& .MuiOutlinedInput-input': {
                            padding: '8px 0',
                          },
                        },
                      }}
                      placeholder={
                        options.find(i => i.key === item.channel)
                          ?.text_placeholder || ''
                      }
                      label={
                        options.find(i => i.key === item.channel)?.text_label ||
                        ''
                      }
                      onChange={e => {
                        const newData = [...data];
                        newData[index] = {
                          ...item,
                          text: e.target.value,
                        };
                        field.onChange(newData);
                        setIsEdit(true);
                      }}
                    />
                  </Stack>
                  <Stack
                    sx={{ width: '100%', bgcolor: '#ECEEF1', height: '1px' }}
                  ></Stack>
                  {item.channel === 'wechat_oa' && (
                    <UploadFile
                      {...field}
                      id={`${item.link}-${Date.now()}`}
                      name={`${item.link}-${Date.now()}`}
                      type='url'
                      accept='image/*'
                      width={80}
                      value={item?.icon || ''}
                      onChange={(url: string) => {
                        const newData = [...data];
                        newData[index] = {
                          ...item,
                          icon: url,
                        };
                        field.onChange(newData);
                        setIsEdit(true);
                      }}
                    />
                  )}
                  {item.channel === 'phone' && (
                    <TextField
                      {...field}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                      value={item?.phone || ''}
                      sx={{
                        mt: 1,
                        width: '100%',
                        height: '36px',
                        bgcolor: '#ffffff',
                        '& .MuiOutlinedInput-root': {
                          height: '36px',
                          padding: '0 12px',
                          '& .MuiOutlinedInput-input': {
                            padding: '8px 0',
                          },
                        },
                      }}
                      placeholder={'请输入电话号码'}
                      label={'电话'}
                      onChange={e => {
                        const newData = [...data];
                        newData[index] = {
                          ...item,
                          phone: e.target.value,
                        };
                        field.onChange(newData);
                        setIsEdit(true);
                      }}
                    />
                  )}
                </Stack>
              )}
            />
          </Box>
        )}
      </>
    );
  },
);
export default Item;
