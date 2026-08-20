import { useMemo } from 'react';
import { Box, Stack, Button } from '@mui/material';
import complete from '@/assets/images/init/complete.png';
import { useAppSelector } from '@/store';

const Step7Complete = () => {
  const { kbDetail } = useAppSelector(state => state.config);

  const wikiUrl = useMemo(() => {
    if (!kbDetail) return '';
    const settings = kbDetail.access_settings;
    const host = settings?.hosts?.[0] || '';

    // 优先使用 HTTP 配置打开 Wiki 站点
    if (host && settings?.ports && settings.ports.length > 0) {
      return settings.ports.includes(80)
        ? `http://${host}`
        : `http://${host}:${settings.ports[0]}`;
    }
    return settings?.base_url || '';
  }, [kbDetail]);

  return (
    <Stack
      gap={2}
      alignItems='center'
      justifyContent='center'
      sx={{ height: '100%' }}
    >
      <Box component='img' src={complete} sx={{ width: 274 }}></Box>
      <Box sx={{ fontSize: 14, color: 'text.tertiary' }}>配置完成</Box>
      <Button
        variant='contained'
        onClick={() => {
          if (wikiUrl) {
            window.open(wikiUrl, '_blank');
          }
        }}
      >
        访问 WIKI 网站
      </Button>
    </Stack>
  );
};

export default Step7Complete;
