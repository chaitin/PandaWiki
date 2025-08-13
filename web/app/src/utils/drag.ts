import { ITreeItem, NodeListItem } from '@/assets/type';

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

export const filterEmptyFolders = (data: ITreeItem[]): ITreeItem[] => {
  return data
    .map(item => {
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterEmptyFolders(item.children);
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter(item => {
      if (item.type === 1) {
        return item.children && item.children.length > 0;
      }
      return true;
    });
};

export const addExpandState = (
  nodes: ITreeItem[],
  activeId: string,
  defaultExpand: boolean,
): ITreeItem[] => {
  const findParentPath = (
    nodes: ITreeItem[],
    targetId: string,
    path: string[] = [],
  ): string[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return path;
      }
      if (node.children && node.children.length > 0) {
        const found = findParentPath(node.children, targetId, [
          ...path,
          node.id,
        ]);
        if (found) return found;
      }
    }
    return null;
  };

  const parentPath = findParentPath(nodes, activeId) || [];
  const parentSet = new Set(parentPath);

  const addExpand = (nodes: ITreeItem[]): ITreeItem[] => {
    return nodes.map(node => {
      const isExpanded = parentSet.has(node.id) ? true : defaultExpand;
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          defaultExpand: isExpanded,
          children: addExpand(node.children),
        };
      }
      return node;
    });
  };

  return addExpand(nodes);
};
