import { getApiV1KnowledgeBaseDetail } from '@/request/KnowledgeBase';
import { DomainKnowledgeBaseDetail } from '@/request/types';
import { useAppSelector } from '@/store';
import { Stack, useMediaQuery } from '@mui/material';
import { useEffect, useState } from 'react';
import CardAI from './component/CardAI';
import CardKB from './component/CardKB';
import CardRobot from './component/CardRobot';
import CardWeb from './component/CardWeb';
import CardFeedback from './component/CardFeedback';

const Setting = () => {
  const { kb_id } = useAppSelector(state => state.config);
  const [kb, setKb] = useState<DomainKnowledgeBaseDetail | null>(null);
  const isWideScreen = useMediaQuery('(min-width:1400px)');
  const [url, setUrl] = useState<string>('');

  const getKb = () => {
    if (!kb_id) return;
    getApiV1KnowledgeBaseDetail({ id: kb_id }).then(res => setKb(res));
  };

  useEffect(() => {
    if (kb) {
      if (kb.access_settings!.base_url) {
        setUrl(kb.access_settings!.base_url);
        return;
      }

      let defaultUrl: string = '';
      const host = kb.access_settings?.hosts?.[0] || '';
      if (!host) return;

      if (
        kb.access_settings!.ssl_ports &&
        kb.access_settings!.ssl_ports.length > 0
      ) {
        defaultUrl = kb.access_settings!.ssl_ports.includes(443)
          ? `https://${host}`
          : `https://${host}:${kb.access_settings!.ssl_ports[0]}`;
      } else if (
        kb.access_settings!.ports &&
        kb.access_settings!.ports.length > 0
      ) {
        defaultUrl = kb.access_settings!.ports.includes(80)
          ? `http://${host}`
          : `http://${host}:${kb.access_settings!.ports[0]}`;
      }

      setUrl(defaultUrl);
    }
  }, [kb]);

  useEffect(() => {
    if (kb_id) getKb();
  }, [kb_id]);

  if (!kb) return <></>;

  return (
    <Stack
      direction={isWideScreen ? 'row' : 'column-reverse'}
      gap={2}
      sx={{
        pb: 2,
        width: '100%',
      }}
    >
      <Stack
        gap={2}
        sx={{ width: isWideScreen ? 'calc((100% - 16px) / 2)' : '100%' }}
      >
        <CardKB kb={kb} />
        <CardAI kb={kb} />
        <CardFeedback kb={kb} />
        <CardRobot kb={kb} url={url} />
      </Stack>
      <Stack
        gap={2}
        sx={{ width: isWideScreen ? 'calc((100% - 16px) / 2)' : '100%' }}
      >
        <CardWeb kb={kb} refresh={getKb} />
      </Stack>
    </Stack>
  );
};
export default Setting;
