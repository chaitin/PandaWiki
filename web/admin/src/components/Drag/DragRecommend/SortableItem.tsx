import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FC } from 'react';
import Item, { ItemProps } from './Item';

type SortableItemProps = ItemProps & {
  refresh?: () => void;
};

const SortableItem: FC<SortableItemProps> = ({ item, refresh, ...rest }) => {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    height: '100%',
  };

  return (
    <Item
      ref={setNodeRef}
      style={style}
      refresh={refresh}
      withOpacity={isDragging}
      dragHandleProps={{
        ...attributes,
        ...listeners,
      }}
      item={item}
      {...rest}
    />
  );
};

export default SortableItem;
