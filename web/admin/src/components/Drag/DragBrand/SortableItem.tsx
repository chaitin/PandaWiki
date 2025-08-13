import { FooterSetting } from '@/api/type';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FC } from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import Item, { ItemProps } from './Item';

type SortableItemProps = Omit<
  ItemProps,
  'withOpacity' | 'isDragging' | 'dragHandleProps'
> & {
  id: string;
  groupIndex: number;
  control: Control<FooterSetting>;
  errors: FieldErrors<FooterSetting>;
  setIsEdit: (value: boolean) => void;
  handleRemove: () => void;
};

const SortableItem: FC<SortableItemProps> = ({ id, ...rest }) => {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

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
      {...rest}
    />
  );
};

export default SortableItem;
