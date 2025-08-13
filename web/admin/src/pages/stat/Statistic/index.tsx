import { Box, Stack, useMediaQuery } from '@mui/material';
import { CusTabs } from 'ct-mui';
import { useState } from 'react';
import AreaMap from './AreaMap';
import ClientStat from './ClientStat';
import HostReferer from './HostReferer';
import HotDocs from './HotDocs';
import QAReferer from './QAReferer';
import RTVisitor from './RTVisitor';
import TypeCount from './TypeCount';

export const TimeList = [
  { label: '近 24 小时', value: 'day' },
  { label: '近 7 天', value: 'week', disabled: true },
  { label: '近 30 天', value: 'month', disabled: true },
  { label: '近 90 天', value: 'quarter', disabled: true },
];

export type ActiveTab = (typeof TimeList)[number]['value'];

const Statistic = () => {
  const [tab, setTab] = useState<ActiveTab>('day');
  const isWideScreen = useMediaQuery('(min-width:1190px)');

  return (
    <Box sx={{ p: 2 }}>
      <RTVisitor isWideScreen={isWideScreen} />
      <Box sx={{ py: 2 }}>
        <CusTabs
          list={TimeList}
          value={tab}
          change={(value: ActiveTab) => setTab(value)}
        />
      </Box>
      <TypeCount tab={tab} />
      <Stack
        direction={isWideScreen ? 'row' : 'column'}
        gap={2}
        alignItems={'stretch'}
        sx={{ my: 2 }}
      >
        <AreaMap tab={tab} />
        <Box sx={{ width: isWideScreen ? 400 : '100%' }}>
          <QAReferer tab={tab} />
        </Box>
      </Stack>
      <Stack
        direction={isWideScreen ? 'row' : 'column'}
        gap={2}
        alignItems={'stretch'}
      >
        <Box sx={{ width: isWideScreen ? 340 : '100%', flexShrink: 0 }}>
          <HostReferer tab={tab} />
        </Box>
        <Box sx={{ width: isWideScreen ? 340 : '100%', flexShrink: 0 }}>
          <HotDocs tab={tab} />
        </Box>
        <Box sx={{ width: isWideScreen ? 340 : '100%', flex: 1 }}>
          <ClientStat tab={tab} />
        </Box>
      </Stack>
    </Box>
  );
};

export default Statistic;
