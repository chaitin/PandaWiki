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
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { Box, Button } from '@mui/material';
import { Icon } from 'ct-mui';
import { FC, useCallback, useState } from 'react';
import { Control, FieldErrors, useFieldArray } from 'react-hook-form';
import Item from './Item';
import SortableItem from './SortableItem';

export interface BrandGroup {
  id: string;
  name: string;
  links: {
    id: string;
    name: string;
    url: string;
  }[];
}

interface DragBrandProps {
  control: Control<FooterSetting>;
  errors: FieldErrors<FooterSetting>;
  setIsEdit: (value: boolean) => void;
}

const DragBrand: FC<DragBrandProps> = ({ control, errors, setIsEdit }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  const {
    fields: brandGroupFields,
    append: appendBrandGroup,
    remove: removeBrandGroup,
    move,
  } = useFieldArray({
    control,
    name: 'brand_groups',
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = brandGroupFields.findIndex(
          (_, index) => `group-${index}` === active.id,
        );
        const newIndex = brandGroupFields.findIndex(
          (_, index) => `group-${index}` === over!.id,
        );
        move(oldIndex, newIndex);
        setIsEdit(true);
      }
      setActiveId(null);
    },
    [brandGroupFields, move, setIsEdit],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleRemove = useCallback(
    (index: number) => {
      removeBrandGroup(index);
      setIsEdit(true);
    },
    [removeBrandGroup, setIsEdit],
  );

  const handleAddBrandGroup = () => {
    appendBrandGroup({
      name: '',
      links: [{ name: '', url: '' }],
    });
    setIsEdit(true);
  };

  if (brandGroupFields.length === 0) {
    return (
      <Button
        size='small'
        startIcon={
          <Icon type='icon-add' sx={{ fontSize: '12px !important' }} />
        }
        onClick={handleAddBrandGroup}
      >
        添加一个链接组
      </Button>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={brandGroupFields.map((_, index) => `group-${index}`)}
          strategy={rectSortingStrategy}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {brandGroupFields.map((group, groupIndex) => (
              <SortableItem
                key={group.id}
                id={`group-${groupIndex}`}
                groupIndex={groupIndex}
                control={control}
                errors={errors}
                setIsEdit={setIsEdit}
                handleRemove={() => handleRemove(groupIndex)}
              />
            ))}
          </Box>
        </SortableContext>
        <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
          {activeId ? (
            <Item
              isDragging
              groupIndex={parseInt(activeId.split('-')[1])}
              control={control}
              errors={errors}
              setIsEdit={setIsEdit}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      <Button
        size='small'
        startIcon={
          <Icon type='icon-add' sx={{ fontSize: '12px !important' }} />
        }
        onClick={handleAddBrandGroup}
      >
        添加一个链接组
      </Button>
    </>
  );
};

export default DragBrand;
