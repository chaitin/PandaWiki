'use client';

import { ITreeItem, KBDetail, NodeListItem, WidgetInfo } from '@/assets/type';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';
import { GithubComChaitinPandaWikiProApiShareV1AuthInfoResp } from '@/request/pro/types';

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
    authInfo: authInfoProp = context.authInfo,
    tree: initialTree = context.tree || [],
  } = props;

  const [localAuthInfo, setLocalAuthInfo] = useState<
    GithubComChaitinPandaWikiProApiShareV1AuthInfoResp | undefined
  >(undefined);

  useEffect(() => {
    try {
      const raw =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('authInfo')
          : null;
      if (raw) setLocalAuthInfo(JSON.parse(raw));
    } catch (_) {}
  }, []);

  const authInfo = authInfoProp ?? localAuthInfo;

  const catalogSettings = kbDetail?.settings?.catalog_settings;

  const [catalogWidth, setCatalogWidth] = useState<number>(() => {
    return catalogSettings?.catalog_width || 260;
  });
  const [nodeList, setNodeList] = useState<NodeListItem[] | undefined>(
    initialNodeList,
  );
  const [tree, setTree] = useState<ITreeItem[] | undefined>(initialTree);
  const [qaModalOpen, setQaModalOpen] = useState(false);

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
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
