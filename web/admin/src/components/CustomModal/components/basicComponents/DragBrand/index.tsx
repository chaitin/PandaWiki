import { AppDetail, FooterSetting } from '@/api/type';
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
} from '@dnd-kit/sortable';
import { Box, Button } from '@mui/material';
import { Icon } from '@ctzhian/ui';
import { FC, useCallback, useEffect, useState } from 'react';
import { Control, FieldErrors, useFieldArray } from 'react-hook-form';
import Item from './Item';
import SortableItem from './SortableItem';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAppPreviewData } from '@/store/slices/config';

export interface BrandGroup {
  name: string;
  links: {
    name: string;
    url: string;
  }[];
}
[];

interface DragBrandProps {
  onChange: (data: BrandGroup[]) => void;
  setIsEdit: (value: boolean) => void;
  data: {
    name: string;
    links: {
      name: string;
      url: string;
    }[];
  }[];
  control: Control<FooterSetting>;
  errors: FieldErrors<FooterSetting>;
}

const DragBrand: FC<DragBrandProps> = ({
  setIsEdit,
  data,
  onChange,
  control,
  errors,
}) => {
  const dispatch = useAppDispatch();
  const { appPreviewData } = useAppSelector(state => state.config);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id && data) {
        const oldIndex = data?.findIndex(
          (_, index) => `group-${index}` === active.id,
        );
        const newIndex = data?.findIndex(
          (_, index) => `group-${index}` === over!.id,
        );
        const newData = arrayMove(data, oldIndex, newIndex);
        onChange(newData);
      }
      setActiveId(null);
    },
    [data, setIsEdit],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleRemove = useCallback(
    (index: number) => {
      if (data) {
        const newData = data.filter((_, i) => i !== index);
        onChange(newData);
      }
    },
    [data, setIsEdit],
  );

  useEffect(() => {
    if (data) {
      if (!appPreviewData) return;
      const previewData = {
        ...appPreviewData,
        settings: {
          ...appPreviewData.settings,
          footer_settings: {
            ...appPreviewData?.settings?.footer_settings,
            data,
          },
        },
      };
      dispatch(setAppPreviewData(previewData));
    }
  }, [data]);

  return (
    <>
      {data && (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={data?.map((_, index) => `group-${index}`)}
              strategy={rectSortingStrategy}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {data?.map((group, groupIndex) => (
                  <SortableItem
                    key={groupIndex}
                    id={`group-${groupIndex}`}
                    groupIndex={groupIndex}
                    setIsEdit={setIsEdit}
                    handleRemove={() => handleRemove(groupIndex)}
                    item={group}
                    data={data}
                    onChange={onChange}
                    control={control}
                    errors={errors}
                  />
                ))}
              </Box>
            </SortableContext>
            <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
              {activeId ? (
                <Item
                  isDragging
                  groupIndex={parseInt(activeId.split('-')[1])}
                  setIsEdit={setIsEdit}
                  item={data[parseInt(activeId.split('-')[1])]}
                  data={data}
                  onChange={onChange}
                  control={control}
                  errors={errors}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}
    </>
  );
};

export default DragBrand;
