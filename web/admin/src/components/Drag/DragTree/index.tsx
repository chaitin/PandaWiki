import { ITreeItem } from '@/api';
import {
  SortableTree,
  SortableTreeHandle,
  TreeItems,
} from '@/components/TreeDragSortable';
import { ItemChangedReason } from '@/components/TreeDragSortable/types';
import { postApiV1NodeMove } from '@/request/Node';
import { useAppSelector } from '@/store';
import { AppContext, DragTreeProps, getSiblingItemIds } from '@/utils/drag';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import TreeItem from './TreeItem';

export type DragTreeHandle = {
  scrollToItem: (itemId: string) => void;
};

const DragTree = forwardRef<DragTreeHandle, DragTreeProps>(
  (
    {
      data,
      menu,
      updateData,
      refresh,
      ui = 'move',
      readOnly = false,
      selected,
      onSelectChange,
      supportSelect = true,
      relativeSelect = true,
      disabled,
      virtualized = false,
      virtualizedHeight,
      registerDragHandlers,
    },
    ref,
  ) => {
    const { kb_id } = useAppSelector(state => state.config);
    const sortableTreeRef = useRef<SortableTreeHandle>(null);

    // 暴露滚动方法
    useImperativeHandle(ref, () => ({
      scrollToItem: (itemId: string) => {
        sortableTreeRef.current?.scrollToItem(itemId);
      },
    }));

    return (
      <AppContext.Provider
        value={{
          ui,
          menu,
          data,
          updateData,
          refresh,
          readOnly,
          selected,
          onSelectChange,
          supportSelect,
          relativeSelect,
          disabled,
          scrollToItem: (itemId: string) => {
            sortableTreeRef.current?.scrollToItem(itemId);
          },
        }}
      >
        <SortableTree
          ref={sortableTreeRef}
          disableSorting={readOnly}
          registerDragHandlers={registerDragHandlers}
          items={data.map(it => ({ ...it }))}
          onItemsChanged={(
            newItems: TreeItems<ITreeItem>,
            reason: ItemChangedReason<ITreeItem>,
          ) => {
            if (reason.type === 'dropped') {
              const { draggedItem } = reason;
              const { parentId, id } = draggedItem;
              const { prevItemId, nextItemId } = getSiblingItemIds(
                newItems,
                id,
              );
              postApiV1NodeMove({
                id,
                parent_id: parentId,
                next_id: nextItemId as string,
                prev_id: prevItemId as string,
                kb_id: kb_id,
              }).then(() => {
                updateData?.(newItems);
                refresh?.();
              });
            } else {
              updateData?.(newItems);
            }
          }}
          TreeItemComponent={TreeItem}
          virtualized={virtualized}
          virtualizedHeight={virtualizedHeight}
        />
      </AppContext.Provider>
    );
  },
);

DragTree.displayName = 'DragTree';

export default DragTree;
