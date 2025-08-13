import { statConversationDistribution, TrendData } from '@/api';
import Nodata from '@/assets/images/nodata.png';
import Card from '@/components/Card';
import PieTrend from '@/components/PieTrend';
import { AppType, chartColor } from '@/constant/enums';
import { useAppSelector } from '@/store';
import { Box, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { ActiveTab } from '.';

const QAReferer = ({ tab }: { tab: ActiveTab }) => {
  const { kb_id = '' } = useAppSelector(state => state.config);
  const [list, setList] = useState<TrendData[]>([]);

  useEffect(() => {
    statConversationDistribution({ kb_id }).then(res => {
      setList(
        (res || [])
          .map((it, idx) => ({
            count: it.count,
            name: AppType[it.app_type as keyof typeof AppType].label,
            color: chartColor[idx],
          }))
          .sort((a, b) => b.count - a.count),
      );
    });
  }, [tab, kb_id]);

  return (
    <Card
      sx={{
        p: 2,
        height: 292,
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
        flexShrink: 0,
      }}
    >
      <Box sx={{ fontSize: 16, fontWeight: 'bold', mb: 2 }}>问答来源</Box>
      {list.length > 0 ? (
        <Stack
          direction={'row'}
          alignItems={'strict'}
          justifyContent={'space-between'}
          gap={2}
          sx={{ height: 220 }}
        >
          <Stack
            direction={'row'}
            alignItems='center'
            sx={{ flex: 1, height: '100%' }}
          >
            <PieTrend chartData={list} text='OS' height={140} />
          </Stack>
          <Stack
            sx={{
              p: 2,
              width: 184,
              flexShrink: 0,
              fontSize: 12,
              bgcolor: 'background.paper2',
              borderRadius: '10px',
            }}
            gap={1.5}
          >
            {list.map(it => (
              <Stack
                direction={'row'}
                alignItems={'center'}
                justifyContent={'space-between'}
                key={it.name}
              >
                <Stack direction={'row'} alignItems={'center'} gap={1}>
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: it.color,
                    }}
                  ></Box>
                  <Box>{it.name}</Box>
                </Stack>
                <Box sx={{ fontFamily: 'Gbold' }}>{it.count}</Box>
              </Stack>
            ))}
          </Stack>
        </Stack>
      ) : (
        <Stack
          alignItems={'center'}
          justifyContent={'center'}
          sx={{ height: 220, fontSize: 12, color: 'text.disabled' }}
        >
          <img src={Nodata} width={100} />
          暂无数据
        </Stack>
      )}
    </Card>
  );
};

export default QAReferer;
