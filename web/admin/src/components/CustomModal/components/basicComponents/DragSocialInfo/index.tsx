import { DomainSocialMediaAccount } from '@/api';
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
import { Stack } from '@mui/material';
import { Dispatch, FC, SetStateAction, useCallback, useState } from 'react';
import Item from './Item';
import SortableItem from './SortableItem';
import { Control } from 'react-hook-form';

interface DragSocialInfoProps {
  data: DomainSocialMediaAccount[];
  columns?: number;
  onChange: (data: DomainSocialMediaAccount[]) => void;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  control: Control<any>;
}

const DragSocialInfo: FC<DragSocialInfoProps> = ({
  data,
  onChange,
  setIsEdit,
  control,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = data.findIndex(
          (_, index) => `social-${index}` === active?.id,
        );
        const newIndex = data.findIndex(
          (_, index) => `social-${index}` === over!?.id,
        );
        const newData = arrayMove(data, oldIndex, newIndex);
        onChange(newData);
      }

      setActiveId(null);
    },
    [data, onChange],
  );
  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  if (data.length === 0) return null;

  return (
    <>
      {data && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={data.map((_, index) => `social-${index}`)}
            strategy={rectSortingStrategy}
          >
            <Stack direction={'column'} gap={2.5}>
              {data.map((item, idx) => (
                <SortableItem
                  key={`social-${idx}`}
                  id={`social-${idx}`}
                  item={item}
                  setIsEdit={setIsEdit}
                  data={data}
                  control={control}
                  index={idx}
                />
              ))}
            </Stack>
          </SortableContext>
          <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
            {activeId ? (
              <Item
                isDragging
                item={data.find((_, index) => `social-${index}` === activeId)!}
                setIsEdit={setIsEdit}
                data={data}
                control={control}
                index={data.findIndex(
                  (_, index) => `social-${index}` === activeId,
                )}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  );
};

export default DragSocialInfo;
