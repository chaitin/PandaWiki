import Card from '@/components/Card';
import { useURLSearchParams } from '@/hooks';
import { getApiV1AppDetail } from '@/request/App';
import { getApiV1KnowledgeBaseDetail } from '@/request/KnowledgeBase';
import {
  DomainAppDetailResp,
  DomainKnowledgeBaseDetail,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { Box, Tab, Tabs } from '@mui/material';
import { useEffect, useState } from 'react';
import CardAI from './component/CardAI';
import CardFeedback from './component/CardFeedback';
import CardKB from './component/CardKB';
import CardRobot from './component/CardRobot';
import CardSecurity from './component/CardSecurity';
import CardWeb from './component/CardWeb';
import CardMCP from './component/CardMCP';

const SettingTabs: { label: string; id: string }[] = [
  { label: '门户网站', id: 'portal-website' },
  { label: 'AI 机器人', id: 'robot' },
  { label: '问答设置', id: 'ai-setting' },
  { label: '反馈设置', id: 'feedback' },
  { label: '安全设置', id: 'security' },
  { label: '访问控制', id: 'backend-info' },
  { label: 'MCP 设置', id: 'mcp' },
];

const Setting = () => {
  const { kb_id } = useAppSelector(state => state.config);
  const [searchParams, setSearchParams] = useURLSearchParams();
  const activeTab = searchParams.get('tab') || 'portal-website';
  const [kb, setKb] = useState<DomainKnowledgeBaseDetail | null>(null);
  const [url, setUrl] = useState<string>('');
  const [info, setInfo] = useState<DomainAppDetailResp>();

  const getInfo = async () => {
    const res = await getApiV1AppDetail({ kb_id: kb_id!, type: '1' });
    setInfo(res);
  };

  const getKb = () => {
    if (!kb_id) return;
    getApiV1KnowledgeBaseDetail({ id: kb_id }).then(res => setKb(res));
    getInfo();
  };

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
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
    <Box
      sx={{
        position: 'relative',
      }}
    >
      <Card sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
        <Tabs
          value={activeTab}
          onChange={(event, newValue) => setActiveTab(newValue as string)}
          aria-label='setting tabs'
        >
          {SettingTabs.map(tab => (
            <Tab key={tab.id} label={tab.label} value={tab.id} />
          ))}
        </Tabs>
      </Card>
      <Card
        sx={{
          height: 'calc(100vh - 148px)',
          overflow: 'auto',
        }}
      >
        {activeTab === 'backend-info' && <CardKB />}
        {activeTab === 'ai-setting' && <CardAI kb={kb} />}
        {activeTab === 'security' && (
          <CardSecurity data={info} kb={kb} refresh={getInfo} />
        )}
        {activeTab === 'feedback' && <CardFeedback kb={kb} />}
        {activeTab === 'robot' && <CardRobot kb={kb} url={url} />}
        {activeTab === 'portal-website' && <CardWeb kb={kb} refresh={getKb} />}
        {activeTab === 'mcp' && <CardMCP kb={kb} />}
      </Card>
    </Box>
  );
};
export default Setting;
