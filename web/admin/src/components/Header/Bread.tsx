import { useAppSelector } from '@/store';
import { Box, Stack, useTheme } from '@mui/material';
import { Icon } from 'ct-mui';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import KBSelect from '../KB/KBSelect';

const HomeBread = { title: '文档', to: '/' };
const OtherBread = {
  document: { title: '文档', to: '/' },
  stat: { title: '统计', to: '/stat' },
  conversation: { title: '问答', to: '/conversation' },
  feedback: { title: '反馈', to: '/feedback' },
  application: { title: '设置', to: '/setting' },
  release: { title: '发布', to: '/release' },
};

const Bread = () => {
  const theme = useTheme();
  const { pathname } = useLocation();
  const [breads, setBreads] = useState<{ title: string; to: string }[]>([]);
  const { pageName } = useAppSelector(state => state.breadcrumb);

  useEffect(() => {
    const curBreads: { title: string; to: string }[] = [];
    if (pathname === '/') {
      curBreads.push(HomeBread);
    } else {
      const pieces = pathname.split('/').filter(it => it !== '');
      pieces.forEach(it => {
        const bread = OtherBread[it as keyof typeof OtherBread];
        if (bread) {
          curBreads.push(bread);
        }
      });
    }
    if (pageName) {
      curBreads.push({ title: pageName, to: 'custom' });
    }
    setBreads(curBreads);
  }, [pathname, pageName]);

  return (
    <Stack
      direction={'row'}
      alignItems={'center'}
      gap={1}
      sx={{
        flexGrow: 1,
        color: 'text.auxiliary',
        fontSize: '14px',
        a: { color: 'text.auxiliary' },
        lineHeight: '22px',
      }}
    >
      <KBSelect />
      {breads.map((it, idx) => {
        return (
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={1}
            key={it.title}
            sx={{
              color:
                idx === breads.length - 1
                  ? `${theme.palette.text.primary} !important`
                  : 'text.disabled',
              a: {
                color:
                  idx === breads.length - 1
                    ? `${theme.palette.text.primary} !important`
                    : 'text.disabled',
              },
              ...(idx === breads.length - 1 && { fontWeight: 'bold' }),
            }}
          >
            <Icon
              type='icon-xiala'
              sx={{ fontSize: 20, transform: 'rotate(-90deg)' }}
            />
            {it.to === 'custom' ? (
              <Box
                sx={{ cursor: 'pointer', ':hover': { color: 'primary.main' } }}
              >
                {it.title}
              </Box>
            ) : (
              <NavLink to={it.to}>
                <Box
                  sx={{
                    cursor: 'pointer',
                    ':hover': { color: 'primary.main' },
                  }}
                >
                  {it.title}
                </Box>
              </NavLink>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
};

export default Bread;
