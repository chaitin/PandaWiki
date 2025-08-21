import { FooterSetting } from '@/api/type';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Button, IconButton, Stack, TextField } from '@mui/material';
import { Icon } from '@ctzhian/ui';
import {
  CSSProperties,
  forwardRef,
  HTMLAttributes,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Control,
  Controller,
  FieldErrors,
  useFieldArray,
} from 'react-hook-form';
import { BrandGroup } from '.';

export type ItemProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  groupIndex: number;
  withOpacity?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
  setIsEdit: (value: boolean) => void;
  handleRemove?: () => void;
  item: BrandGroup;
  data: BrandGroup[];
  onChange: (value: BrandGroup[]) => void;
  control: Control<FooterSetting>;
  errors: FieldErrors<FooterSetting>;
};

interface LinkItemProps extends HTMLAttributes<HTMLDivElement> {
  linkId: string;
  linkIndex: number;
  groupIndex: number;
  control: Control<FooterSetting>;
  errors: FieldErrors<FooterSetting>;
  setIsEdit: (value: boolean) => void;
  onRemove: () => void;
  withOpacity?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
  data: BrandGroup[];
}

const LinkItem = forwardRef<HTMLDivElement, LinkItemProps>(
  (
    {
      linkIndex,
      groupIndex,
      control,
      errors,
      setIsEdit,
      onRemove,
      withOpacity,
      isDragging,
      dragHandleProps,
      style,
      data,
      ...props
    },
    ref,
  ) => {
    const inlineStyles: CSSProperties = {
      opacity: withOpacity ? '0.5' : '1',
      cursor: isDragging ? 'grabbing' : 'grab',
      ...style,
    };
    return (
      <Box ref={ref} style={inlineStyles} {...props}>
        <Stack gap={1} direction='column'>
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
              子链接{linkIndex + 1}
            </Box>
            <IconButton
              size='small'
              onClick={onRemove}
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
          <Controller
            control={control}
            name={`brand_groups`}
            rules={{ required: '请输入链接文字' }}
            render={({ field }) => (
              <TextField
                {...field}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                value={field.value[groupIndex].links[linkIndex]?.name}
                sx={{
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
                fullWidth
                label='文字'
                placeholder='文字'
                onChange={e => {
                  const newGroups = [...data];
                  newGroups[groupIndex] = {
                    ...newGroups[groupIndex],
                    links: [...newGroups[groupIndex].links],
                  };
                  newGroups[groupIndex].links[linkIndex] = {
                    ...newGroups[groupIndex].links[linkIndex],
                    name: e.target.value,
                  };
                  field.onChange(newGroups);
                  setIsEdit(true);
                }}
                error={
                  !!errors.brand_groups?.[groupIndex]?.links?.[linkIndex]?.name
                }
                helperText={
                  errors.brand_groups?.[groupIndex]?.links?.[linkIndex]?.name
                    ?.message
                }
              />
            )}
          />
          <Controller
            control={control}
            name={`brand_groups`}
            rules={{ required: '请输入链接地址' }}
            render={({ field }) => (
              <TextField
                {...field}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                value={field.value[groupIndex].links[linkIndex]?.url}
                sx={{
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
                fullWidth
                label='链接'
                placeholder='链接'
                onChange={e => {
                  const newGroups = [...data];
                  newGroups[groupIndex] = {
                    ...newGroups[groupIndex],
                    links: [...newGroups[groupIndex].links],
                  };
                  newGroups[groupIndex].links[linkIndex] = {
                    ...newGroups[groupIndex].links[linkIndex],
                    url: e.target.value,
                  };
                  field.onChange(newGroups);
                  setIsEdit(true);
                }}
                error={
                  !!errors.brand_groups?.[groupIndex]?.links?.[linkIndex]?.url
                }
                helperText={
                  errors.brand_groups?.[groupIndex]?.links?.[linkIndex]?.url
                    ?.message
                }
              />
            )}
          />
        </Stack>
      </Box>
    );
  },
);

const SortableLinkItem: React.FC<LinkItemProps> = ({ linkId, ...rest }) => {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: linkId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  return (
    <LinkItem
      ref={setNodeRef}
      style={style}
      withOpacity={isDragging}
      dragHandleProps={{
        ...attributes,
        ...listeners,
      }}
      linkId={linkId}
      {...rest}
    />
  );
};

const Item = forwardRef<HTMLDivElement, ItemProps>(
  (
    {
      groupIndex,
      withOpacity,
      isDragging,
      style,
      dragHandleProps,
      handleRemove,
      setIsEdit,
      item,
      data,
      onChange,
      errors,
      control,
      ...props
    },
    ref,
  ) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));
    const inlineStyles: CSSProperties = {
      opacity: withOpacity ? '0.5' : '1',
      borderRadius: '10px',
      cursor: isDragging ? 'grabbing' : 'grab',
      backgroundColor: '#ffffff',
      width: '100%',
      ...style,
    };

    const handleLinkDragStart = useCallback((event: DragStartEvent) => {
      setActiveId(event.active.id as string);
    }, []);

    const handleLinkDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && data) {
          const oldIndex = data.findIndex(
            (_, index) => `link-${groupIndex}-${index}` === active.id,
          );
          const newIndex = data.findIndex(
            (_, index) => `link-${groupIndex}-${index}` === over!.id,
          );
          const newData = arrayMove(data[groupIndex].links, oldIndex, newIndex);
          const newGroups = [...data];
          newGroups[groupIndex] = {
            ...newGroups[groupIndex],
            links: newData,
          };
          onChange(newGroups);
        }
        setActiveId(null);
      },
      [data, data[groupIndex].links, setIsEdit, groupIndex],
    );

    const handleLinkDragCancel = useCallback(() => {
      setActiveId(null);
    }, []);

    const handleAddLink = () => {
      const newGroups = [...data];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        links: [...newGroups[groupIndex].links, { name: '', url: '' }],
      };
      onChange(newGroups);
    };

    const handleRemoveLink = (linkIndex: number) => {
      const newGroups = [...data];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        links: newGroups[groupIndex].links.filter(
          (_, index) => index !== linkIndex,
        ),
      };
      onChange(newGroups);
    };

    return (
      <Box ref={ref} style={inlineStyles} {...props}>
        <Box
          sx={{
            p: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            width: '346px',
          }}
        >
          <Stack direction={'column'} gap={1}>
            <Stack direction='column' gap={1}>
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
                  链接组{groupIndex + 1}
                </Box>
                <IconButton
                  size='small'
                  onClick={handleRemove}
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
              <Controller
                control={control}
                name={`brand_groups`}
                rules={{ required: '请输入链接组名称' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                    value={field.value[groupIndex].name}
                    sx={{
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
                    fullWidth
                    placeholder='输入链接组名称'
                    label='链接组名称'
                    onChange={e => {
                      const newGroups = [...data];
                      newGroups[groupIndex] = {
                        ...newGroups[groupIndex],
                        name: e.target.value,
                      };
                      field.onChange(newGroups);
                      setIsEdit(true);
                    }}
                    error={!!errors.brand_groups?.[groupIndex]?.name}
                    helperText={
                      errors.brand_groups?.[groupIndex]?.name?.message
                    }
                  />
                )}
              />
            </Stack>
            {/* 链接拖拽区域 */}

            {item.links.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleLinkDragStart}
                onDragEnd={handleLinkDragEnd}
                onDragCancel={handleLinkDragCancel}
              >
                <SortableContext
                  items={item.links.map(
                    (_, index) => `link-${groupIndex}-${index}`,
                  )}
                  strategy={rectSortingStrategy}
                >
                  <Stack gap={1}>
                    {item.links.map((link, linkIndex) => (
                      <Box
                        sx={{
                          width: '100%',
                          border: '1px dashed',
                          borderColor: 'divider',
                          borderRadius: '10px',
                          p: 1,
                        }}
                      >
                        <SortableLinkItem
                          key={linkIndex}
                          linkId={`link-${groupIndex}-${linkIndex}`}
                          linkIndex={linkIndex}
                          groupIndex={groupIndex}
                          control={control}
                          errors={errors}
                          setIsEdit={setIsEdit}
                          onRemove={() => handleRemoveLink(linkIndex)}
                          data={data}
                        />
                      </Box>
                    ))}
                  </Stack>
                </SortableContext>
                <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
                  {activeId ? (
                    <LinkItem
                      isDragging
                      linkId={activeId}
                      linkIndex={parseInt(activeId.split('-')[2])}
                      groupIndex={groupIndex}
                      control={control}
                      errors={errors}
                      setIsEdit={setIsEdit}
                      onRemove={() => {}}
                      data={data}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
            <Stack
              direction={'row'}
              sx={{
                alignItems: 'center',
                marginLeft: 'auto',
                cursor: 'pointer',
                ml: 1,
                mt: 1,
              }}
              onClick={handleAddLink}
            >
              <Icon
                type='icon-tianjia'
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
        </Box>
      </Box>
    );
  },
);

export default Item;
