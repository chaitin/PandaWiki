import { TrendData, statBrowsers } from '@/api';
import Nodata from '@/assets/images/nodata.png';
import Card from '@/components/Card';
import PieTrend from '@/components/PieTrend';
import { chartColor } from '@/constant/enums';
import { useAppSelector } from '@/store';
import { Box, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { ActiveTab } from '.';

const ClientStat = ({ tab }: { tab: ActiveTab }) => {
  const { kb_id = '' } = useAppSelector(state => state.config);
  const [osList, setOsList] = useState<(TrendData & { color: string })[]>([]);
  const [browserList, setBrowserList] = useState<
    (TrendData & { color: string })[]
  >([]);

  useEffect(() => {
    statBrowsers({ kb_id }).then(res => {
      setOsList(
        (res.os || [])
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((it, idx) => ({
            name: it.name,
            count: it.count,
            color: chartColor[idx],
          })),
      );
      setBrowserList(
        (res.browser || [])
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((it, idx) => ({
            name: it.name,
            count: it.count,
            color: chartColor[idx],
          })),
      );
    });
  }, [tab, kb_id]);

  return (
    <Card
      sx={{
        p: 2,
        height: '100%',
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Stack
        direction={'row'}
        alignItems={'center'}
        justifyContent={'space-between'}
        sx={{ mb: 2 }}
      >
        <Box sx={{ fontSize: 16, fontWeight: 'bold' }}>客户端</Box>
        {/* <Button size="small">查看更多</Button> */}
      </Stack>
      {osList.length > 0 || browserList.length > 0 ? (
        <>
          <Stack
            direction={'row'}
            justifyContent={'space-around'}
            sx={{ mb: 2 }}
          >
            <Box sx={{ flex: 1 }}>
              <PieTrend chartData={osList} text='OS' height={140} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <PieTrend chartData={browserList} text='Browser' height={140} />
            </Box>
          </Stack>
          <Card
            sx={{
              bgcolor: 'background.paper2',
              p: 2,
            }}
          >
            <Stack
              direction={'row'}
              sx={{ fontSize: 12, rowGap: 1.5, columnGap: 4 }}
            >
              <Stack sx={{ flex: 1 }} gap={1.5}>
                {osList.map(it => (
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
                      <Box>{it.name || '-'}</Box>
                    </Stack>
                    <Box sx={{ fontFamily: 'Gbold' }}>{it.count}</Box>
                  </Stack>
                ))}
              </Stack>
              <Stack sx={{ flex: 1 }} gap={1.5}>
                {browserList.map(it => (
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
                      <Box>{it.name || '-'}</Box>
                    </Stack>
                    <Box sx={{ fontFamily: 'Gbold' }}>{it.count}</Box>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Card>
        </>
      ) : (
        <Stack
          alignItems={'center'}
          justifyContent={'center'}
          sx={{ fontSize: 12, color: 'text.disabled' }}
        >
          <img src={Nodata} width={100} />
          暂无数据
        </Stack>
      )}
    </Card>
  );
};

export default ClientStat;
