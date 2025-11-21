import { Box, Stack, useMediaQuery } from '@mui/material';
import { CusTabs } from '@ctzhian/ui';
import { useMemo, useState } from 'react';
import AreaMap from './AreaMap';
import ClientStat from './ClientStat';
import HostReferer from './HostReferer';
import HotDocs from './HotDocs';
import QAReferer from './QAReferer';
import RTVisitor from './RTVisitor';
import TypeCount from './TypeCount';
import { useAppSelector } from '@/store';
import { VersionCanUse } from '@/components/VersionMask';
import {
  BUSINESS_VERSION_PERMISSION,
  PROFESSION_VERSION_PERMISSION,
} from '@/constant/version';

export const TimeList = [
  { label: '近 24 小时', value: 1 },
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 },
];

export type ActiveTab = 1 | 7 | 30 | 90;

const Statistic = () => {
  const { license } = useAppSelector(state => state.config);
  const [tab, setTab] = useState<ActiveTab>(1);
  const isWideScreen = useMediaQuery('(min-width:1190px)');

  const timeList = useMemo(() => {
    const isPro = PROFESSION_VERSION_PERMISSION.includes(license.edition!);
    const isBusiness = BUSINESS_VERSION_PERMISSION.includes(license.edition!);
    return [
      { label: '近 24 小时', value: 1, disabled: false },
      {
        label: (
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={0.5}
            sx={{ lineHeight: 1 }}
          >
            <span>近 7 天</span>
            <VersionCanUse
              permission={PROFESSION_VERSION_PERMISSION}
              mode='icon'
            />
          </Stack>
        ),
        value: 7,
        disabled: !isPro,
      },
      {
        label: (
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={0.5}
            sx={{ lineHeight: 1 }}
          >
            <span>近 30 天</span>
            <VersionCanUse
              permission={BUSINESS_VERSION_PERMISSION}
              mode='icon'
            />
          </Stack>
        ),
        value: 30,
        disabled: !isBusiness,
      },
      {
        label: (
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={0.5}
            sx={{ lineHeight: 1 }}
          >
            <span>近 90 天</span>
            <VersionCanUse
              permission={BUSINESS_VERSION_PERMISSION}
              mode='icon'
            />
          </Stack>
        ),
        value: 90,
        disabled: !isBusiness,
      },
    ];
  }, [license]);

  return (
    <Box sx={{ p: 2 }}>
      <RTVisitor isWideScreen={isWideScreen} />
      <Box sx={{ py: 2 }}>
        <CusTabs
          list={timeList}
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
