import type { KnowledgeBaseListItem } from '@/api';
import { useEffect, useState } from 'react';

/** 与 Header「前台查看」一致：用于生成站内文档链接 */
export function useWikiFrontBaseUrl(
  kbList: KnowledgeBaseListItem[] | null | undefined,
  kbId: string | undefined,
): string {
  const [wikiUrl, setWikiUrl] = useState('');

  useEffect(() => {
    const currentKb = kbList?.find(item => item.id === kbId);
    if (!currentKb) {
      setWikiUrl('');
      return;
    }
    const baseUrl = currentKb.access_settings?.base_url?.trim();
    if (baseUrl) {
      setWikiUrl(baseUrl.replace(/\/$/, ''));
      return;
    }
    const host = currentKb.access_settings?.hosts?.[0] || '';
    if (host === '') {
      setWikiUrl('');
      return;
    }
    const { ssl_ports = [], ports = [] } = currentKb.access_settings || {};
    if (ssl_ports?.length) {
      if (ssl_ports.includes(443)) setWikiUrl(`https://${host}`);
      else setWikiUrl(`https://${host}:${ssl_ports[0]}`);
    } else if (ports?.length) {
      if (ports.includes(80)) setWikiUrl(`http://${host}`);
      else setWikiUrl(`http://${host}:${ports[0]}`);
    } else {
      setWikiUrl('');
    }
  }, [kbList, kbId]);

  return wikiUrl;
}
