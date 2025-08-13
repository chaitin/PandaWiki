import {
  statInstantCount,
  statInstantPage,
  StatInstantPageItme,
  TrendData,
} from '@/api';
import ClockIcon from '@/assets/images/clock.png';
import Nodata from '@/assets/images/nodata.png';
import BarTrend from '@/components/BarTrend';
import Card from '@/components/Card';
import { useAppSelector } from '@/store';
import { Box, Stack } from '@mui/material';
import { Ellipsis } from 'ct-mui';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

const RTVisitor = ({ isWideScreen }: { isWideScreen: boolean }) => {
  const { kb_id = '' } = useAppSelector(state => state.config);
  const [count, setCount] = useState<TrendData[]>([]);
  const [pages, setPages] = useState<StatInstantPageItme[]>([]);

  useEffect(() => {
    if (kb_id) {
      statInstantPage({ kb_id }).then(res => {
        setPages(res);
      });
      statInstantCount({ kb_id }).then(res => {
        const stats = (res || []).map(it => ({
          count: it.count,
          time: dayjs(it.time).format('YYYY-MM-DD HH:mm'),
        }));
        const today = stats.find(
          it => it.time === dayjs().format('YYYY-MM-DD HH:mm'),
        );
        const statsData: Array<{ count: number; time: string }> = [
          {
            count: today?.count || 0,
            time: dayjs().format('YYYY-MM-DD HH:mm'),
          },
        ];
        while (statsData.length < 60) {
          const lastDate: dayjs.Dayjs = statsData[statsData.length - 1]
            ? dayjs(statsData[statsData.length - 1].time)
            : dayjs();
          const time: string = lastDate
            .subtract(1, 'minute')
            .format('YYYY-MM-DD HH:mm');
          const stat = stats.find(it => it.time === time);
          statsData.push(
            stat
              ? stat
              : {
                  count: 0,
                  time,
                },
          );
        }
        setCount(
          statsData.map(it => ({ count: it.count, name: it.time })).reverse(),
        );
      });
    }
  }, [kb_id]);

  return (
    <Card
      sx={{
        p: 2,
        boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Stack direction='row' gap={4}>
        <Box sx={{ width: 334 }}>
          <Box sx={{ fontWeight: 'bold', fontSize: '16px' }}>实时来访</Box>
          <BarTrend height={148} chartData={count} text={'实时来访'} />
        </Box>
        <Card
          sx={{
            flex: 1,
            bgcolor: 'background.paper2',
            p: 2,
            pr: 0,
            lineHeight: '20px',
            height: 172,
            overflow: 'hidden',
          }}
        >
          {pages.length > 0 ? (
            <Box sx={{ height: 140, overflowY: 'auto', pr: 2 }}>
              {pages.map((it, idx) => (
                <Stack
                  key={idx}
                  direction={isWideScreen ? 'row' : 'column'}
                  alignItems={isWideScreen ? 'center' : 'flex-start'}
                  justifyContent='space-between'
                  gap={isWideScreen ? 6 : 0}
                  sx={{
                    position: 'relative',
                    mb:
                      idx === pages.length - 1 || !isWideScreen ? '0' : '20px',
                  }}
                >
                  {idx !== pages.length - 1 && (
                    <Box
                      sx={{
                        height: '20px',
                        width: '1px',
                        border: '1px solid',
                        borderImage:
                          'linear-gradient(180deg, rgba(50, 72, 242, 0.2), rgba(158, 104, 252, 0.2)) 1 1',
                        position: 'absolute',
                        left: 5.5,
                        top: 20,
                      }}
                    ></Box>
                  )}
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={isWideScreen ? 6 : 1}
                  >
                    <Stack
                      direction={'row'}
                      alignItems={'center'}
                      gap={1}
                      sx={{ width: 80, flexShrink: 0 }}
                    >
                      <Box component={'img'} src={ClockIcon} width={12} />
                      <Box sx={{ color: 'text.auxiliary', fontSize: '12px' }}>
                        {dayjs(it.created_at).fromNow()}
                      </Box>
                    </Stack>
                    <Ellipsis sx={{ fontSize: '12px', flexShrink: 0 }}>
                      {it.node_name || '-'}
                    </Ellipsis>
                  </Stack>
                  <Box
                    sx={{
                      color: 'text.auxiliary',
                      fontSize: '12px',
                      ...(!isWideScreen && { ml: '20px', fontSize: 10 }),
                    }}
                  >
                    {it.ip_address.province} - {it.ip_address.city}
                  </Box>
                </Stack>
              ))}
            </Box>
          ) : (
            <Stack
              alignItems={'center'}
              justifyContent={'center'}
              sx={{ height: '100%', fontSize: 12, color: 'text.disabled' }}
            >
              <img src={Nodata} width={100} />
              暂无数据
            </Stack>
          )}
        </Card>
      </Stack>
    </Card>
  );
};

export default RTVisitor;
