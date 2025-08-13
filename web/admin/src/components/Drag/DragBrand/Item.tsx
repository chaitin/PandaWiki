import { FooterSetting } from '@/api/type';
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
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Button, IconButton, Stack, TextField } from '@mui/material';
import { Icon } from 'ct-mui';
import {
  CSSProperties,
  forwardRef,
  HTMLAttributes,
  useCallback,
  useState,
} from 'react';
import {
  Control,
  Controller,
  FieldErrors,
  useFieldArray,
} from 'react-hook-form';

export type ItemProps = HTMLAttributes<HTMLDivElement> & {
  groupIndex: number;
  withOpacity?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
  control: Control<FooterSetting>;
  errors: FieldErrors<FooterSetting>;
  setIsEdit: (value: boolean) => void;
  handleRemove?: () => void;
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
        <Stack gap={1} alignItems='center' direction='row'>
          <IconButton
            size='small'
            sx={{
              cursor: 'grab',
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
              flexShrink: 0,
            }}
            {...dragHandleProps}
          >
            <Icon type='icon-drag' />
          </IconButton>
          <Box
            sx={{
              color: 'text.secondary',
              flexShrink: 0,
              fontSize: 12,
              width: 20,
            }}
          >
            {linkIndex + 1}.
          </Box>
          <Controller
            control={control}
            name={`brand_groups.${groupIndex}.links.${linkIndex}.name`}
            rules={{ required: '请输入链接文字' }}
            render={({ field }) => (
              <TextField
                {...field}
                sx={{ width: 300 }}
                label='链接文字'
                placeholder='链接文字'
                onChange={e => {
                  field.onChange(e.target.value);
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
            name={`brand_groups.${groupIndex}.links.${linkIndex}.url`}
            rules={{ required: '请输入链接地址' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label='链接地址'
                placeholder='链接地址'
                onChange={e => {
                  field.onChange(e.target.value);
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
          <IconButton size='small' sx={{ flexShrink: 0 }} onClick={onRemove}>
            <Icon type='icon-icon_tool_close' />
          </IconButton>
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
      control,
      errors,
      setIsEdit,
      ...props
    },
    ref,
  ) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

    const {
      fields: linkFields,
      append: appendLink,
      remove: removeLink,
      move: moveLink,
    } = useFieldArray({
      control,
      name: `brand_groups.${groupIndex}.links`,
    });

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
        if (active.id !== over?.id) {
          const oldIndex = linkFields.findIndex(
            (_, index) => `link-${groupIndex}-${index}` === active.id,
          );
          const newIndex = linkFields.findIndex(
            (_, index) => `link-${groupIndex}-${index}` === over!.id,
          );
          moveLink(oldIndex, newIndex);
          setIsEdit(true);
        }
        setActiveId(null);
      },
      [linkFields, moveLink, setIsEdit, groupIndex],
    );

    const handleLinkDragCancel = useCallback(() => {
      setActiveId(null);
    }, []);

    const handleAddLink = () => {
      appendLink({ name: '', url: '' });
      setIsEdit(true);
    };

    const handleRemoveLink = (linkIndex: number) => {
      removeLink(linkIndex);
      setIsEdit(true);
    };

    return (
      <Box ref={ref} style={inlineStyles} {...props}>
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            p: 2,
            mb: 1,
            pb: 1,
          }}
        >
          <Stack direction='row' alignItems='center' gap={1} sx={{ mb: 1 }}>
            <IconButton
              size='small'
              sx={{
                cursor: 'grab',
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
                flexShrink: 0,
              }}
              {...dragHandleProps}
            >
              <Icon type='icon-drag' />
            </IconButton>
            <Controller
              control={control}
              name={`brand_groups.${groupIndex}.name`}
              rules={{ required: '请输入链接组名称' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder='输入链接组名称'
                  label='链接组名称'
                  onChange={e => {
                    field.onChange(e.target.value);
                    setIsEdit(true);
                  }}
                  error={!!errors.brand_groups?.[groupIndex]?.name}
                  helperText={errors.brand_groups?.[groupIndex]?.name?.message}
                />
              )}
            />
            <IconButton size='small' onClick={handleRemove}>
              <Icon type='icon-icon_tool_close' />
            </IconButton>
          </Stack>

          {/* 链接拖拽区域 */}
          {linkFields.length > 0 && (
            <Box
              sx={{
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: '10px',
                py: 1,
                pl: 2,
              }}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleLinkDragStart}
                onDragEnd={handleLinkDragEnd}
                onDragCancel={handleLinkDragCancel}
              >
                <SortableContext
                  items={linkFields.map(
                    (_, index) => `link-${groupIndex}-${index}`,
                  )}
                  strategy={rectSortingStrategy}
                >
                  <Stack gap={1}>
                    {linkFields.map((link, linkIndex) => (
                      <SortableLinkItem
                        key={link.id}
                        linkId={`link-${groupIndex}-${linkIndex}`}
                        linkIndex={linkIndex}
                        groupIndex={groupIndex}
                        control={control}
                        errors={errors}
                        setIsEdit={setIsEdit}
                        onRemove={() => handleRemoveLink(linkIndex)}
                      />
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
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </Box>
          )}

          <Button
            size='small'
            startIcon={
              <Icon type='icon-add' sx={{ fontSize: '12px !important' }} />
            }
            onClick={handleAddLink}
            sx={{ mt: 1 }}
          >
            添加一个链接
          </Button>
        </Box>
      </Box>
    );
  },
);

export default Item;
