import { DomainRecommendNodeListResp } from '@/request/types';
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
import { Box } from '@mui/material';
import { FC, useCallback, useState } from 'react';
import Item from './Item';
import SortableItem from './SortableItem';

interface DragRecommendProps {
  data: DomainRecommendNodeListResp[];
  columns?: number;
  refresh?: () => void;
  onChange: (data: DomainRecommendNodeListResp[]) => void;
}

const DragRecommend: FC<DragRecommendProps> = ({
  data,
  columns = 2,
  refresh,
  onChange,
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
        items={data.map(item => item.id!)}
        strategy={rectSortingStrategy}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gridGap: 4,
          }}
        >
          {data.map((item, idx) => (
            <SortableItem
              key={idx}
              id={item.id}
              item={item}
              refresh={refresh}
              handleRemove={handleRemove}
            />
          ))}
        </Box>
      </SortableContext>
      <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
        {activeId ? (
          <Item isDragging item={data.find(item => item.id === activeId)!} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DragRecommend;
