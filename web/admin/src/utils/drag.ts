import { ITreeItem } from '@/api';
import {
  TreeMenuItem,
  TreeMenuOptions,
} from '@/components/Drag/DragTree/TreeMenu';
import { TreeItems } from '@/components/TreeDragSortable';
import { DomainNodeListItemResp } from '@/request/types';
import { createContext } from 'react';

export interface DragTreeProps {
  data: ITreeItem[];
  readOnly?: boolean;
  menu?: (opra: TreeMenuOptions) => TreeMenuItem[];
  refresh?: () => void;
  updateData?: (data: TreeItems<ITreeItem>) => void;
  ui?: 'select' | 'move';
  selected?: string[];
  supportSelect?: boolean;
  onSelectChange?: (value: string[], id?: string) => void;
  relativeSelect?: boolean;
  traverseFolder?: boolean;
  disabled?: (value: ITreeItem) => boolean;
  virtualized?: boolean;
  virtualizedHeight?: number | string;
}

// 定义上下文类型
export interface AppContextType {
  data: ITreeItem[];
  scrollToItem?: (itemId: string) => void;
  updateData?: (data: TreeItems<ITreeItem>) => void;
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

export function convertToTree(data: DomainNodeListItemResp[]) {
  const nodeMap = new Map<string, ITreeItem>();
  const rootNodes: ITreeItem[] = [];

  // 第一次遍历：创建所有节点
  data.forEach(item => {
    const node: ITreeItem = {
      id: item.id!,
      summary: item.summary,
      name: item.name!,
      level: 0,
      status: item.status,
      order: item.position,
      emoji: item.emoji,
      content_type: item.content_type,
      type: item.type!,
      rag_status: item.rag_info?.status,
      rag_message: item.rag_info?.message,
      parentId: item.parent_id,
      children: [],
      canHaveChildren: item.type === 1,
      updated_at: item.updated_at || item.created_at,
      permissions: item.permissions,
    };

    nodeMap.set(item.id!, node);
  });

  // 第二次遍历：构建树结构
  nodeMap.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      parent.children!.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // 递归计算每个节点的实际层级
  const calculateLevel = (nodes: ITreeItem[], level: number = 0) => {
    nodes.forEach(node => {
      node.level = level;
      if (node.children?.length) {
        calculateLevel(node.children, level + 1);
      }
    });
  };

  // 从根节点开始计算层级
  calculateLevel(rootNodes);

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

export const collapseAllFolders = (
  list: TreeItems<ITreeItem>,
  collapsed: boolean,
): TreeItems<ITreeItem> => {
  return list.map(it => ({
    ...it,
    collapsed: it.type === 1 ? collapsed : it.collapsed,
    children: it.children
      ? (collapseAllFolders(
          it.children as TreeItems<ITreeItem>,
          collapsed,
        ) as ITreeItem[])
      : it.children,
  }));
};
