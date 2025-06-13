import { ITreeItem, NodeListItem } from "@/api";
import { TreeMenuItem, TreeMenuOptions } from "@/components/Drag/DragTree/TreeMenu";
import {
  TreeItems
} from "dnd-kit-sortable-tree";
import { createContext } from "react";

export interface DragTreeProps {
  data: ITreeItem[]
  menu?: (opra: TreeMenuOptions) => TreeMenuItem[]
  refresh?: () => void
  ui?: 'select' | 'move'
  selected?: string[]
  supportSelect?: boolean
  onSelectChange?: (value: string[]) => void
  relativeSelect?: boolean
}

// 定义上下文类型
export interface AppContextType {
  items: TreeItems<ITreeItem>;
  setItems: React.Dispatch<React.SetStateAction<TreeItems<ITreeItem>>>;
}

// 使用正确的类型创建上下文
export const AppContext = createContext<(Omit<DragTreeProps, 'data'> & AppContextType) | null>(null);

export const checkValidateInput = (value: string) => {
  if (!value) {
    return {
      result: false,
      message: 'Required'
    }
  } else {
    return {
      result: true,
    }
  }
}

export const checkValidateTree = (tree: TreeItems<ITreeItem>): any => {
  if (!tree || tree.length === 0) {
    return undefined;
  }
  for (let node of tree) {
    if (node.isEditting) {
      return node;
    }
    if (node.level === 1) {
      const match = checkValidateTree(node.children as TreeItems<ITreeItem>);
      if (match) {
        return match;
      }
    } else {
      continue;
    }
  }
  return undefined
}

export const updateTree = (tree: TreeItems<ITreeItem>, id: string, updateData: ITreeItem) => {
  for (let i = 0; i < tree.length; i++) {
    const item = tree[i];
    if (item.id === id) {
      Object.assign(item, updateData);
      return;
    }
    if (item.children) {
      updateTree(item.children, id, updateData);
    }
  }
}

export function convertToTree(data: NodeListItem[]) {
  const map: { [key: string]: ITreeItem } = {};
  const tree: ITreeItem[] = [];

  data.forEach(item => {
    map[item.id] = {
      id: item.id,
      summary: item.summary,
      name: item.name,
      level: 0,
      order: item.position,
      emoji: item.emoji,
      type: item.type,
      parentId: item.parent_id || null,
      children: [],
      canHaveChildren: item.type === 1,
      updated_at: item.updated_at || item.created_at,
    };
  });

  data.forEach(item => {
    const node = map[item.id];
    if (node.parentId && map[node.parentId]) {
      node.level = (map[node.parentId].level || 0) + 1;
      if (map[node.parentId]) {
        if (!map[node.parentId].children) {
          map[node.parentId].children = [];
        }
        map[node.parentId].children!.push(node);
        map[node.parentId].children!.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
    } else {
      node.level = 0;
      tree.push(node);
    }
  });

  tree.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return tree;
}

export function getSiblingItemIds(items: TreeItems<ITreeItem>, draggedId: string): { prevItemId: string | null, nextItemId: string | null } {
  // 默认返回值
  const result: { prevItemId: string | null, nextItemId: string | null } = { prevItemId: null, nextItemId: null };

  // 查找拖拽项及其父项
  const findItemAndParent = (
    tree: TreeItems<ITreeItem>,
    id: string,
    parent: TreeItems<ITreeItem> | null = null
  ): { item: ITreeItem | null, parent: TreeItems<ITreeItem> | null } => {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i].id === id) {
        return { item: tree[i], parent: parent || tree };
      }

      if (tree[i].children && (tree[i].children || []).length > 0) {
        const found = findItemAndParent(tree[i].children as TreeItems<ITreeItem>, id, tree[i].children as TreeItems<ITreeItem>);
        if (found.item) {
          return found;
        }
      }
    }

    return { item: null, parent: null };
  };

  const { item, parent } = findItemAndParent(items, draggedId);

  // 如果找不到项目或父项，返回默认结果
  if (!item || !parent) {
    return result;
  }

  // 在父项中查找当前项的索引
  const currentIndex = parent.findIndex(sibling => sibling.id === draggedId);

  // 如果找到索引
  if (currentIndex !== -1) {
    // 获取前一个项目的ID（如果存在）
    if (currentIndex > 0) {
      result.prevItemId = parent[currentIndex - 1].id;
    }

    // 获取后一个项目的ID（如果存在）
    if (currentIndex < parent.length - 1) {
      result.nextItemId = parent[currentIndex + 1].id;
    }
  }

  return result;
}
