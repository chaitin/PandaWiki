"use client";

import { KBDetail, NodeListItem } from '@/assets/type';
import { getAuthStatus } from '@/utils/auth';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { createContext, useContext, useEffect, useState } from 'react';

interface StoreContextType {
  kbDetail?: KBDetail
  kb_id?: string
  catalogShow?: boolean
  themeMode?: 'light' | 'dark'
  mobile?: boolean
  nodeList?: NodeListItem[]
  loading?: boolean;
  setCatalogShow?: (value: boolean) => void
  refreshNodeList?: () => Promise<void>;
}

export const StoreContext = createContext<StoreContextType>({
  kbDetail: undefined,
  kb_id: undefined,
  catalogShow: undefined,
  themeMode: 'light',
  mobile: false,
  nodeList: undefined,
  loading: false,
  setCatalogShow: () => { },
  refreshNodeList: async () => { },
})

export const useStore = () => useContext(StoreContext);

export default function StoreProvider({
  children,
  kbDetail,
  kb_id,
  themeMode,
  nodeList: initialNodeList,
  mobile,
}: StoreContextType & { children: React.ReactNode }) {
  const catalogSettings = kbDetail?.settings?.catalog_settings
  const [nodeList, setNodeList] = useState<NodeListItem[] | undefined>(initialNodeList);
  const [loading, setLoading] = useState(false);
  const [catalogShow, setCatalogShow] = useState(catalogSettings?.catalog_visible === undefined ? true : catalogSettings?.catalog_visible === 1);
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down('md'), {
    defaultMatches: mobile,
  });

  const fetchNodeList = async () => {
    if (!kb_id) return;

    setLoading(true);
    try {
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(cookie =>
        cookie.trim().startsWith(`auth_${kb_id}=`)
      );
      const authToken = authCookie ? authCookie.split('=')[1] : '';

      const response = await fetch('/share/v1/node/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-kb-id': kb_id,
          'X-Simple-Auth-Password': authToken,
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setNodeList(result.data);
        } else {
          console.error('API 返回数据格式错误:', result);
        }
      } else {
        console.error('获取节点列表失败:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('获取节点列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshNodeList = async () => {
    await fetchNodeList();
  };

  useEffect(() => {
    setCatalogShow(kbDetail?.settings?.catalog_settings?.catalog_visible === 1);
  }, [kbDetail]);

  useEffect(() => {
    if (!initialNodeList && kb_id && getAuthStatus(kb_id)) {
      fetchNodeList();
    }
  }, [kb_id, initialNodeList]);

  return <StoreContext.Provider
    value={{
      kbDetail,
      kb_id,
      themeMode,
      nodeList,
      catalogShow,
      setCatalogShow,
      mobile: isMobile,
      loading,
      refreshNodeList,
    }}
  >{children}</StoreContext.Provider>
}
