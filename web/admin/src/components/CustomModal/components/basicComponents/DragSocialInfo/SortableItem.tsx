import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FC } from 'react';
import Item, { SocialInfoProps } from './Item';

type SortableItemProps = SocialInfoProps & {};

const SortableItem: FC<SortableItemProps> = ({ item, ...rest }) => {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `social-${rest.index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  return (
    <Item
      ref={setNodeRef}
      style={style}
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
