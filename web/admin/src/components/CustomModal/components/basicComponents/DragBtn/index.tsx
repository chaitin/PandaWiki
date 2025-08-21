import { CardWebHeaderBtn } from '@/api';
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

interface DragBtnProps {
  data: CardWebHeaderBtn[];
  onChange: (data: CardWebHeaderBtn[]) => void;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  control: Control<any>;
}

const DragBtn: FC<DragBtnProps> = ({ data, onChange, setIsEdit, control }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = data.findIndex(item => item.id === active.id);
        const newIndex = data.findIndex(item => item.id === over!.id);
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
  const handleRemove = useCallback(
    (id: string) => {
      const newData = data.filter(item => item.id !== id);
      onChange(newData);
    },
    [data, onChange],
  );

  if (data.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={data.map(item => item.id)}
        strategy={rectSortingStrategy}
      >
        <Stack direction={'row'} flexWrap={'wrap'} gap={2}>
          {data.map((item, idx) => (
            <SortableItem
              key={idx}
              id={item.id}
              item={item}
              handleRemove={handleRemove}
              setIsEdit={setIsEdit}
              data={data}
              control={control}
            />
          ))}
        </Stack>
      </SortableContext>
      <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
        {activeId ? (
          <Item
            isDragging
            item={data.find(item => item.id === activeId)!}
            setIsEdit={setIsEdit}
            data={data}
            control={control}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DragBtn;
