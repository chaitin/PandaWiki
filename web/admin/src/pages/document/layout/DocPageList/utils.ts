import { ITreeItem } from '@/api';
import { DomainNodeListItemResp } from '@/request/types';

/** 从树中移除指定 id 的节点及其子树 */
export function removeDeep(
  items: ITreeItem[],
  removeIds: Set<string>,
): ITreeItem[] {
  const result: ITreeItem[] = [];
  for (const it of items) {
    if (removeIds.has(it.id)) continue;
    const children = it.children?.length
      ? removeDeep(it.children as ITreeItem[], removeIds)
      : undefined;
    result.push({ ...it, children });
  }
  return result;
}

/** 在树中查找节点 */
export function findNodeInTree(
  items: ITreeItem[],
  id: string,
): ITreeItem | null {
  for (const it of items) {
    if (it.id === id) return it;
    if (it.children?.length) {
      const f = findNodeInTree(it.children as ITreeItem[], id);
      if (f) return f;
    }
  }
  return null;
}

/** 从树中取出指定 id 的节点，返回剩余树和取出的节点 */
export function pickNodesFromTree(
  items: ITreeItem[],
  idSet: Set<string>,
): { remaining: ITreeItem[]; picked: ITreeItem[] } {
  const picked: ITreeItem[] = [];
  const removePicked = (nodes: ITreeItem[]): ITreeItem[] => {
    const res: ITreeItem[] = [];
    for (const it of nodes) {
      if (idSet.has(it.id)) {
        picked.push({ ...it });
        continue;
      }
      const children = it.children?.length
        ? removePicked(it.children as ITreeItem[])
        : it.children;
      res.push({ ...it, children });
    }
    return res;
  };
  const remaining = removePicked(items);
  return { remaining, picked };
}

/** 收集到 targetId 的路径上的所有文件夹 id */
function collectAncestorFolderIds(
  items: ITreeItem[],
  targetId: string,
  trail: Set<string> = new Set(),
): Set<string> | null {
  for (const n of items) {
    const nextTrail = new Set(trail);
    if (n.type === 1) nextTrail.add(n.id);
    if (n.id === targetId) return nextTrail;
    if (n.children?.length) {
      const res = collectAncestorFolderIds(
        n.children as ITreeItem[],
        targetId,
        nextTrail,
      );
      if (res) return res;
    }
  }
  return null;
}

/** 展开目标节点及其所有祖先，返回新树 */
export function expandAncestorsToTarget(
  items: ITreeItem[],
  targetId: string,
): ITreeItem[] {
  const toExpand = collectAncestorFolderIds(items, targetId) ?? new Set();
  const apply = (nodes: ITreeItem[]): ITreeItem[] =>
    nodes.map(n => {
      const children = n.children?.length
        ? apply(n.children as ITreeItem[])
        : n.children;
      const collapsed =
        n.type === 1 && toExpand.has(n.id) ? false : n.collapsed;
      return { ...n, collapsed, children };
    });
  return apply(items);
}

/** 将取出的节点移动到目标父节点下，返回新树（不可变更新） */
export function applyMoveToTree(
  items: ITreeItem[],
  picked: ITreeItem[],
  parentId: string | null,
): ITreeItem[] {
  if (!parentId) {
    return [...items, ...picked.map(p => ({ ...p, parentId: undefined }))];
  }
  const parent = findNodeInTree(items, parentId);
  if (!parent) return items;

  const updateParent = (nodes: ITreeItem[], targetId: string): ITreeItem[] =>
    nodes.map(n => {
      if (n.id !== targetId) {
        const children = n.children?.length
          ? updateParent(n.children as ITreeItem[], targetId)
          : n.children;
        return { ...n, children };
      }
      const children = (n.children as ITreeItem[] | undefined) ?? [];
      return {
        ...n,
        collapsed: false,
        children: [...children, ...picked.map(p => ({ ...p, parentId }))],
      };
    });

  const next = updateParent(items, parentId);
  return expandAncestorsToTarget(next, parentId);
}

export function findItemInTree(
  items: ITreeItem[],
  id: string,
): DomainNodeListItemResp | null {
  for (const item of items) {
    if (item.id === id) {
      return {
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        parent_id: item.parentId,
        summary: item.summary,
        type: item.type,
        status: item.status,
        permissions: item.permissions,
        updated_at: item.updated_at,
      } as DomainNodeListItemResp;
    }
    if (item.children?.length) {
      const found = findItemInTree(item.children as ITreeItem[], id);
      if (found) return found;
    }
  }
  return null;
}

export function collectOpenFolderIds(items: ITreeItem[]): Set<string> {
  const openIds = new Set<string>();
  const dfs = (nodes: ITreeItem[]) => {
    nodes.forEach(n => {
      if (n.type === 1 && n.collapsed === false) openIds.add(n.id);
      if (n.children?.length) dfs(n.children as ITreeItem[]);
    });
  };
  dfs(items);
  return openIds;
}

export function reopenFolders(
  items: ITreeItem[],
  openIds: Set<string>,
): ITreeItem[] {
  return items.map(n => {
    const children = n.children?.length
      ? reopenFolders(n.children as ITreeItem[], openIds)
      : n.children;
    const collapsed = n.type === 1 && openIds.has(n.id) ? false : n.collapsed;
    return { ...n, collapsed, children } as ITreeItem;
  });
}
