'use client';

import { KBDetail, NodeListItem, WidgetInfo } from '@/assets/type';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { createContext, useContext, useEffect, useState } from 'react';

interface StoreContextType {
  widget?: WidgetInfo;
  kbDetail?: KBDetail;
  kb_id?: string;
  catalogShow?: boolean;
  themeMode?: 'light' | 'dark';
  mobile?: boolean;
  nodeList?: NodeListItem[];
  token?: string;
  setNodeList?: (list: NodeListItem[]) => void;
  setCatalogShow?: (value: boolean) => void;
  catalogWidth?: number;
  setCatalogWidth?: (value: number) => void;
}

export const StoreContext = createContext<StoreContextType>({
  widget: undefined,
  kbDetail: undefined,
  kb_id: undefined,
  catalogShow: undefined,
  themeMode: 'light',
  mobile: false,
  nodeList: undefined,
  token: undefined,
  setNodeList: () => {},
  setCatalogShow: () => {},
});

export const useStore = () => useContext(StoreContext);

export default function StoreProvider({
  children,
  widget,
  kbDetail,
  kb_id,
  themeMode,
  nodeList: initialNodeList = [],
  mobile,
  token,
}: StoreContextType & { children: React.ReactNode }) {
  const catalogSettings = kbDetail?.settings?.catalog_settings;
  const [catalogWidth, setCatalogWidth] = useState<number>(() => {
    return catalogSettings?.catalog_width || 260;
  });
  const [nodeList, setNodeList] = useState<NodeListItem[] | undefined>(
    initialNodeList
  );
  const [catalogShow, setCatalogShow] = useState(
    catalogSettings?.catalog_visible !== 2
  );
  const [isMobile, setIsMobile] = useState(mobile);
  const theme = useTheme();
  const mediaQueryResult = useMediaQuery(theme.breakpoints.down('lg'), {
    noSsr: true,
  });

  useEffect(() => {
    if (kbDetail) setCatalogShow(catalogSettings?.catalog_visible !== 2);
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
        kb_id,
        themeMode,
        nodeList,
        catalogShow,
        setCatalogShow,
        mobile: isMobile,
        setNodeList,
        token,
        catalogWidth,
        setCatalogWidth: (value) => {
          setCatalogWidth(value);
          window.localStorage.setItem('CATALOG_WIDTH', value.toString());
        },
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
