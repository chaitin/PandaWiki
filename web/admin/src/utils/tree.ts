import { ITreeItem } from "@/api";

// 递归获取所有子节点ID
const getAllChildrenIds = (node: ITreeItem): string[] => {
  let ids = [node.id];
  if (node.children) {
    node.children.forEach(child => {
      ids = ids.concat(getAllChildrenIds(child));
    });
  }
  return ids;
};

// 检查节点的所有子节点是否都被选中
const areAllChildrenSelected = (node: ITreeItem, selectedIds: string[]): boolean => {
  if (!node.children || node.children.length === 0) return true;
  return node.children.every(child => {
    if (child.type === 1) {
      // 对于文件夹，需要该文件夹被选中，并且其所有子节点也都被选中
      return selectedIds.includes(child.id) && areAllChildrenSelected(child, selectedIds);
    }
    // 对于文件，直接检查其选中状态
    return selectedIds.includes(child.id);
  });
};

// 获取当前节点
const getNodeById = (value: ITreeItem[], targetId: string): ITreeItem | null => {
  for (const item of value) {
    if (item.id === targetId) return item;
    if (item.children) {
      const found = getNodeById(item.children, targetId);
      if (found) return found;
    }
  }
  return null;
};

// 更新所有父节点状态
export const updateAllParentStatus = (value: ITreeItem[], selectedIds: Set<string>) => {
  // 递归检查每个节点
  const checkNode = (nodes: ITreeItem[]) => {
    for (const node of nodes) {
      if (node.type === 1 && node.children) { // 只处理文件夹
        // 先递归处理子节点
        checkNode(node.children);

        // 检查当前节点的所有子节点状态
        if (areAllChildrenSelected(node, Array.from(selectedIds))) {
          selectedIds.add(node.id);
        } else {
          selectedIds.delete(node.id);
        }
      }
    }
  };

  checkNode(value);
};

export const handleMultiSelect = (value: ITreeItem[], id: string, selected: string[]) => {
  const node = getNodeById(value, id);
  if (!node) return selected;

  // 使用 Set 来处理选中状态，避免重复
  const selectedSet = new Set(selected);

  if (node.type === 1) { // 文件夹
    const childrenIds = getAllChildrenIds(node);
    if (selectedSet.has(id)) {
      // 取消选择文件夹及其所有子节点
      selectedSet.delete(id);
      childrenIds.forEach(childId => selectedSet.delete(childId));
    } else {
      // 选择文件夹及其所有子节点
      selectedSet.add(id);
      childrenIds.forEach(childId => selectedSet.add(childId));
    }
  } else { // 文件
    if (selectedSet.has(id)) {
      selectedSet.delete(id);
    } else {
      selectedSet.add(id);
    }
  }

  // 更新整个树的父节点状态
  updateAllParentStatus(value, selectedSet);

  return Array.from(selectedSet);
}



export const filterEmptyFolders = (data: ITreeItem[]): ITreeItem[] => {
  return data
    .map(item => {
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterEmptyFolders(item.children)
        return { ...item, children: filteredChildren }
      }
      return item
    })
    .filter(item => {
      if (item.type === 1) {
        return item.children && item.children.length > 0
      }
      return true
    })
}

// 递归获取showTreeData中所有 type === 2 的数据
export const getAllType2Items = (data: ITreeItem[]): string[] => {
  let result: string[] = [];
  data.forEach(item => {
    if (item.type === 2) {
      result.push(item.id);
    }
    if (item.children && item.children.length > 0) {
      result = result.concat(getAllType2Items(item.children));
    }
  });
  return result;
};