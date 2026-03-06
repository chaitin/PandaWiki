import { ITreeItem, NodeListItem } from '@/assets/type';
import type { GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp } from '@/request/types';

/** 栏目项，用于导航栏展示 */
export interface NavItem {
  id: string;
  name: string;
  position?: number;
}

/**
 * 查找目标节点在树中的父级路径（从根到目标父节点）
 */
export function findParentPath(
  nodes: ITreeItem[],
  targetId: string,
  path: string[] = [],
): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return path;
    }
    if (node.children && node.children.length > 0) {
      const found = findParentPath(node.children, targetId, [...path, node.id]);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 解析节点列表 API 返回数据
 * 支持两种格式：1) 分组格式 [{nav_id, nav_name, list, position}] 2) 扁平格式 NodeListItem[]
 */
export function parseNodeListResponse(
  data: any,
  nodeId?: string,
): {
  isGrouped: boolean;
  navList: NavItem[];
  navDataMap: Record<string, NodeListItem[]>;
  defaultNavId?: string;
} {
  if (!data || !Array.isArray(data)) {
    return { isGrouped: false, navList: [], navDataMap: {} };
  }

  const first = data[0];
  const isGrouped =
    first &&
    typeof first === 'object' &&
    'nav_id' in first &&
    'list' in first &&
    Array.isArray(first.list);

  if (isGrouped) {
    const navList: NavItem[] = [];
    const navDataMap: Record<string, NodeListItem[]> = {};
    (data as GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp[])
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .forEach(item => {
        const list = (item.list ?? []) as NodeListItem[];
        if (item.nav_id && list.length > 0) {
          navList.push({
            id: item.nav_id,
            name: item.nav_name ?? '',
            position: item.position,
          });
          navDataMap[item.nav_id] = list;
        }
      });
    const defaultNavId =
      (nodeId && findNavIdByNodeId(navDataMap, nodeId)) ?? navList[0]?.id;
    return { isGrouped: true, navList, navDataMap, defaultNavId };
  }

  return {
    isGrouped: false,
    navList: [],
    navDataMap: { '': data as NodeListItem[] },
    defaultNavId: '',
  };
}

/** 根据文档 id 在 navDataMap 中查找所属的 nav_id */
export function findNavIdByNodeId(
  navDataMap: Record<string, NodeListItem[]>,
  nodeId: string,
): string | undefined {
  if (!nodeId || !navDataMap) return undefined;
  for (const [navId, list] of Object.entries(navDataMap)) {
    if (list?.some(item => item.id === nodeId)) {
      return navId;
    }
  }
  return undefined;
}

export function convertToTree(data: NodeListItem[]) {
  const nodeMap = new Map<string, ITreeItem>();
  const rootNodes: ITreeItem[] = [];

  data.forEach(item => {
    const node: ITreeItem = {
      id: item.id,
      summary: item.summary,
      name: item.name,
      level: 0,
      status: item.status,
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

  nodeMap.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      parent.children!.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  const calculateLevel = (nodes: ITreeItem[], level: number = 0) => {
    nodes.forEach(node => {
      node.level = level;
      if (node.children?.length) {
        calculateLevel(node.children, level + 1);
      }
    });
  };
  calculateLevel(rootNodes);

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
): { tree: ITreeItem[] } => {
  const parentPath = findParentPath(nodes, activeId) || [];
  const parentSet = new Set(parentPath);

  const addExpand = (nodes: ITreeItem[]): ITreeItem[] => {
    return nodes.map(node => {
      const isExpanded = parentSet.has(node.id) ? true : defaultExpand;
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          defaultExpand: isExpanded,
          expanded: isExpanded,
          children: addExpand(node.children),
        };
      }
      return node;
    });
  };
  return { tree: addExpand(nodes) };
};
