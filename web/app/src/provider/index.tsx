'use client';

import { ITreeItem, KBDetail, NodeListItem, WidgetInfo } from '@/assets/type';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';
import { useParams } from 'next/navigation';
import { GithubComChaitinPandaWikiProApiShareV1AuthInfoResp } from '@/request/pro/types';
import {
  filterEmptyFolders,
  convertToTree,
  findNavIdByNodeId,
  addExpandState,
  type NavItem,
} from '@/utils/tree';

interface StoreContextType {
  authInfo?: GithubComChaitinPandaWikiProApiShareV1AuthInfoResp;
  widget?: WidgetInfo;
  kbDetail?: KBDetail;
  catalogShow?: boolean;
  tree?: ITreeItem[];
  themeMode?: 'light' | 'dark';
  mobile?: boolean;
  nodeList?: NodeListItem[];
  setNodeList?: (list: NodeListItem[]) => void;
  setTree?: Dispatch<SetStateAction<ITreeItem[] | undefined>>;
  setCatalogShow?: (value: boolean) => void;
  catalogWidth?: number;
  setCatalogWidth?: (value: number) => void;
  qaModalOpen?: boolean;
  setQaModalOpen?: (value: boolean) => void;
  /** 栏目列表，多栏目时展示导航栏 */
  navList?: NavItem[];
  /** 当前选中的栏目 id */
  selectedNavId?: string;
  setSelectedNavId?: Dispatch<SetStateAction<string | undefined>>;
  /** 各栏目对应的文档列表 nav_id -> NodeListItem[] */
  navDataMap?: Record<string, NodeListItem[]>;
}

export const StoreContext = createContext<StoreContextType | undefined>(
  undefined,
);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export default function StoreProvider({
  children,
  ...props
}: StoreContextType & { children: React.ReactNode }) {
  const context = useContext(StoreContext) || {};
  const {
    widget = context.widget,
    kbDetail = context.kbDetail,
    themeMode = context.themeMode,
    nodeList: initialNodeList = context.nodeList || [],
    mobile = context.mobile,
    authInfo = context.authInfo,
    tree: initialTree = context.tree || [],
    navList: initialNavList = context.navList || [],
    selectedNavId: initialSelectedNavId = context.selectedNavId,
    navDataMap: initialNavDataMap = context.navDataMap || {},
  } = props;

  const NAV_ID_STORAGE_KEY = 'panda-wiki-selected-nav-id';

  // 使用 props 传入的 defaultNavId，避免 SSR 与 CSR 不一致导致 Hydration 错误
  const initialNavId = initialSelectedNavId;

  const catalogSettings = kbDetail?.settings?.catalog_settings;

  const [catalogWidth, setCatalogWidth] = useState<number>(() => {
    return catalogSettings?.catalog_width || 260;
  });
  const [nodeList, setNodeList] = useState<NodeListItem[] | undefined>(
    initialNodeList,
  );
  const [tree, setTree] = useState<ITreeItem[] | undefined>(() => {
    if (
      initialNavId !== undefined &&
      initialNavId !== '' &&
      initialNavDataMap[initialNavId]
    ) {
      return filterEmptyFolders(convertToTree(initialNavDataMap[initialNavId]));
    }
    return initialTree;
  });
  const [qaModalOpen, setQaModalOpen] = useState(false);
  const [navList] = useState<NavItem[]>(initialNavList);
  const [navDataMap] =
    useState<Record<string, NodeListItem[]>>(initialNavDataMap);
  const [selectedNavId, setSelectedNavIdState] = useState<string | undefined>(
    initialNavId,
  );

  const setSelectedNavId: Dispatch<
    SetStateAction<string | undefined>
  > = value => {
    setSelectedNavIdState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (typeof window !== 'undefined' && next) {
        localStorage.setItem(NAV_ID_STORAGE_KEY, next);
      }
      return next;
    });
  };

  const [catalogShow, setCatalogShow] = useState(
    catalogSettings?.catalog_visible !== 2,
  );
  const [isMobile, setIsMobile] = useState(mobile);
  const theme = useTheme();
  const mediaQueryResult = useMediaQuery(theme.breakpoints.down('lg'), {
    noSsr: true,
  });

  useEffect(() => {
    if (kbDetail) {
      setCatalogShow(catalogSettings?.catalog_visible !== 2);
    }
  }, [kbDetail]);

  useEffect(() => {
    const savedWidth = window.localStorage.getItem('CATALOG_WIDTH');
    if (Number(savedWidth) > 0) {
      setCatalogWidth(Number(savedWidth));
    }
  }, []);

  useEffect(() => {
    setIsMobile(mediaQueryResult);
  }, [mediaQueryResult]);

  const params = useParams();
  const docId = (params?.id as string) || undefined;
  const catalogFolderExpand = catalogSettings?.catalog_folder !== 2;

  useEffect(() => {
    if (
      navDataMap &&
      selectedNavId !== undefined &&
      selectedNavId !== '' &&
      navDataMap[selectedNavId]
    ) {
      const nodeList = navDataMap[selectedNavId];
      let newTree = filterEmptyFolders(convertToTree(nodeList));
      if (docId) {
        const { tree: expandedTree } = addExpandState(
          newTree,
          docId,
          catalogFolderExpand,
        );
        newTree = expandedTree;
      }
      setTree(newTree);
    }
  }, [selectedNavId, navDataMap, docId, catalogFolderExpand]);

  return (
    <StoreContext.Provider
      value={{
        widget,
        kbDetail,
        themeMode,
        nodeList,
        catalogShow,
        setCatalogShow,
        mobile: isMobile,
        authInfo,
        setNodeList,
        catalogWidth,
        tree,
        setTree,
        setCatalogWidth: value => {
          setCatalogWidth(value);
          window.localStorage.setItem('CATALOG_WIDTH', value.toString());
        },
        qaModalOpen,
        setQaModalOpen,
        navList,
        selectedNavId,
        setSelectedNavId,
        navDataMap,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
