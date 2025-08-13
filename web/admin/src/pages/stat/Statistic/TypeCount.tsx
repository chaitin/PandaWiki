import { statCount, StatTypeItem } from '@/api';
import BlueCard from '@/assets/images/blueCard.png';
import PurpleCard from '@/assets/images/purpleCard.png';
import Card from '@/components/Card';
import { useAppSelector } from '@/store';
import { addOpacityToColor } from '@/utils';
import { Box, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { ActiveTab } from '.';

const TypeCount = ({ tab }: { tab: ActiveTab }) => {
  const { kb_id = '' } = useAppSelector(state => state.config);
  const [data, setData] = useState<StatTypeItem | null>(null);

  const list = [
    {
      label: '访问次数',
      value: 'page_visit_count',
      color: '#021D70',
      bg: 'linear-gradient( 180deg, #D7EBFD 0%, #BEDDFD 100%)',
    },
    {
      label: '问答次数',
      value: 'conversation_count',
      color: '#021D70',
      bg: 'linear-gradient( 180deg, #D7EBFD 0%, #BEDDFD 100%)',
    },
    {
      label: '访问用户数',
      value: 'session_count',
      color: '#021D70',
      bg: 'linear-gradient( 180deg, #D7EBFD 0%, #BEDDFD 100%)',
    },
    {
      label: '来源 IP 数',
      value: 'ip_count',
      color: '#260A7A',
      bg: 'linear-gradient( 180deg, #F0DDFF 0%, #E6C8FF 100%)',
    },
  ];

  useEffect(() => {
    statCount({ kb_id }).then(res => {
      setData(res);
    });
  }, [tab, kb_id]);

  return (
    <Stack direction={'row'} alignItems={'stretch'} gap={2}>
      {list.map(it => (
        <Card
          key={it.value}
          sx={{
            color: it.color,
            background: it.bg,
            p: 2,
            flex: 1,
            position: 'relative',
          }}
        >
          <Box
            sx={{
              fontSize: 20,
              fontFamily: 'Gbold',
              lineHeight: '28px',
              height: 28,
            }}
          >
            {data ? data[it.value as keyof typeof data] : ''}
          </Box>
          <Box
            sx={{
              fontSize: 12,
              lineHeight: '20px',
              color: addOpacityToColor(it.color, 0.5),
            }}
          >
            {it.label}
          </Box>
          <Box
            sx={{
              height: 80,
              width: 158,
              position: 'absolute',
              top: 0,
              zIndex: 1,
              right: 0,
              bottom: 0,
              backgroundSize: 'cover',
              backgroundImage: `url(${it.value === 'ip_count' ? PurpleCard : BlueCard})`,
            }}
          ></Box>
        </Card>
      ))}
    </Stack>
  );
};

export default TypeCount;
