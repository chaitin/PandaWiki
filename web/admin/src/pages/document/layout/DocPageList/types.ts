import { ITreeItem } from '@/api';
import {
  TreeMenuItem,
  TreeMenuOptions,
} from '@/components/Drag/DragTree/TreeMenu';
import type { TreeDragHandlers } from '@/utils/drag';
import {
  ConstsCrawlerSource,
  GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp,
} from '@/request/types';

export interface DocPageListContainerProps {
  groups: GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp[];
  nav_id: string | undefined;
  search: string;
  refresh: () => void;
  wikiUrl: string;
  loading?: boolean;
  onPublishOpen: (ids?: string[]) => void;
  onRagOpen: (ids?: string[]) => void;
  /** 由 layout 传入，用于注册文档树拖拽回调（拖到目录时由 layout 统一 onDragEnd） */
  registerTreeDragHandlers?: (handlers: TreeDragHandlers | null) => void;
}

export interface DocTreeMenuHandlers {
  handleUrl: (item: ITreeItem, key: ConstsCrawlerSource) => void;
  handleDelete: (item: ITreeItem) => void;
  handlePublish: (item: ITreeItem) => void;
  handleRestudy: (item: ITreeItem) => void;
  handleProperties: (item: ITreeItem) => void;
  handleFrontDoc: (id: string) => void;
}

export type DocTreeMenuFn = (opra: TreeMenuOptions) => TreeMenuItem[];
