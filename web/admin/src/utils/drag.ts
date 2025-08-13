import { ITreeItem, NodeListItem } from '@/api';
import {
  TreeMenuItem,
  TreeMenuOptions,
} from '@/components/Drag/DragTree/TreeMenu';
import { TreeItems } from 'dnd-kit-sortable-tree';
import { createContext } from 'react';

export interface DragTreeProps {
  data: ITreeItem[];
  readOnly?: boolean;
  menu?: (opra: TreeMenuOptions) => TreeMenuItem[];
  refresh?: () => void;
  ui?: 'select' | 'move';
  selected?: string[];
  supportSelect?: boolean;
  onSelectChange?: (value: string[], id?: string) => void;
  relativeSelect?: boolean;
  traverseFolder?: boolean;
}

// 定义上下文类型
export interface AppContextType {
  items: TreeItems<ITreeItem>;
  setItems: React.Dispatch<React.SetStateAction<TreeItems<ITreeItem>>>;
}

// 使用正确的类型创建上下文
export const AppContext = createContext<
  (Omit<DragTreeProps, 'data'> & AppContextType) | null
>(null);

export const checkValidateInput = (value: string) => {
  if (!value) {
    return {
      result: false,
      message: 'Required',
    };
  } else {
    return {
      result: true,
    };
  }
};

export const checkValidateTree = (
  tree: TreeItems<ITreeItem>,
): ITreeItem | undefined => {
  if (!tree?.length) return undefined;

  const findEditingNode = (
    items: TreeItems<ITreeItem>,
  ): ITreeItem | undefined => {
    return items.find(
      node =>
        node.isEditting ||
        (node.level === 1 &&
          node.children?.length &&
          findEditingNode(node.children as TreeItems<ITreeItem>)),
    );
  };

  return findEditingNode(tree);
};

export const updateTree = (
  tree: TreeItems<ITreeItem>,
  id: string,
  updateData: ITreeItem,
) => {
  // 创建一个 Map 来存储所有节点的引用
  const nodeMap = new Map<string, ITreeItem>();

  const buildNodeMap = (items: TreeItems<ITreeItem>) => {
    items.forEach(item => {
      nodeMap.set(item.id, item);
      if (item.children?.length) {
        buildNodeMap(item.children);
      }
    });
  };

  buildNodeMap(tree);

  // 直接通过 Map 更新目标节点
  const targetNode = nodeMap.get(id);
  if (targetNode) {
    Object.assign(targetNode, updateData);
  }
};

export function convertToTree(data: NodeListItem[]) {
  const nodeMap = new Map<string, ITreeItem>();
  const rootNodes: ITreeItem[] = [];

  // 第一次遍历：创建所有节点
  data.forEach(item => {
    const node: ITreeItem = {
      id: item.id,
      summary: item.summary,
      name: item.name,
      level: 0,
      status: item.status,
      visibility: item.visibility,
      order: item.position,
      emoji: item.emoji,
      type: item.type,
      parentId: item.parent_id || null,
      children: [],
      canHaveChildren: item.type === 1,
      updated_at: item.updated_at || item.created_at,
    };

    nodeMap.set(item.id, node);
  });

  // 第二次遍历：构建树结构
  nodeMap.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      node.level = parent.level + 1;
      parent.children!.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // 对所有层级的节点进行排序
  const sortChildren = (nodes: ITreeItem[]) => {
    nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    nodes.forEach(node => {
      if (node.children?.length) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(rootNodes);
  return rootNodes;
}

export function getSiblingItemIds(
  items: TreeItems<ITreeItem>,
  draggedId: string,
) {
  const result = {
    prevItemId: null as string | null,
    nextItemId: null as string | null,
  };

  // 构建父子关系 Map
  const parentMap = new Map<
    string,
    { parent: TreeItems<ITreeItem>; index: number }
  >();

  const buildParentMap = (
    tree: TreeItems<ITreeItem>,
    parentArray: TreeItems<ITreeItem>,
  ) => {
    tree.forEach((item, index) => {
      // 将当前项添加到 parentMap，记录它在父级数组中的位置
      parentMap.set(item.id, { parent: parentArray, index });

      if (item.children?.length) {
        buildParentMap(
          item.children as TreeItems<ITreeItem>,
          item.children as TreeItems<ITreeItem>,
        );
      }
    });
  };

  // 对根节点也要建立映射，父级数组就是 items 本身
  buildParentMap(items, items);

  const draggedItem = parentMap.get(draggedId);
  if (draggedItem) {
    const { parent, index } = draggedItem;
    if (index > 0) {
      result.prevItemId = parent[index - 1].id;
    }
    if (index < parent.length - 1) {
      result.nextItemId = parent[index + 1].id;
    }
  }

  return result;
}
