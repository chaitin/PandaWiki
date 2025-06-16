import { ITreeItem, moveNode } from "@/api";
import { AppContext, DragTreeProps, getSiblingItemIds } from "@/constant/drag";
import { DndContext } from "@dnd-kit/core";
import {
  SortableTree,
  TreeItems
} from "dnd-kit-sortable-tree";
import { ItemChangedReason } from "dnd-kit-sortable-tree/dist/types";
import { useEffect, useState } from "react";
import TreeItem from "./TreeItem";


const DragTree = ({
  data,
  menu,
  refresh,
  ui = 'move',
  readOnly = false,
  selected,
  onSelectChange,
  supportSelect = true,
  relativeSelect = true,
}: DragTreeProps) => {
  const [items, setItems] = useState<TreeItems<ITreeItem>>(data);

  useEffect(() => {
    setItems(data)
  }, [data])

  return <AppContext.Provider value={{
    ui,
    menu,
    items,
    setItems,
    refresh,
    readOnly,
    selected,
    onSelectChange,
    supportSelect,
    relativeSelect
  }}>
    <DndContext>
      <SortableTree
        items={items}
        onItemsChanged={(items: TreeItems<ITreeItem>, reason: ItemChangedReason<ITreeItem>) => {
          if (reason.type === 'dropped') {
            const { draggedItem } = reason;
            const { parentId = null, id } = draggedItem
            const { prevItemId, nextItemId } = getSiblingItemIds(items, id)
            moveNode({ id, parent_id: parentId, next_id: nextItemId, prev_id: prevItemId }).then(() => {
              refresh?.()
            })
          }
          setItems(items)
        }}
        TreeItemComponent={TreeItem}
      />
    </DndContext>
  </AppContext.Provider>
}

export default DragTree