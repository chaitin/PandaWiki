import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import router from '@/router';
import { useAppDispatch } from '@/store';
import { light } from '@/themes/color';
import componentStyleOverrides from '@/themes/override';
import { Box } from '@mui/material';
import { ThemeProvider } from 'ct-mui';
import { useEffect } from 'react';
import { useLocation, useRoutes } from 'react-router-dom';
import { getLicenseInfo, getUser } from './api';
import KBCreate from './components/KB/KBCreate';
import { setLicense, setUser } from './store/slices/config';

function App() {
  const location = useLocation();
  const { pathname } = location;
  const dispatch = useAppDispatch();
  const routerView = useRoutes(router);
  const loginPage = pathname.includes('/login');
  const docEditPage = pathname.includes('/doc/editor');
  const onlyAllowShareApi = loginPage;
  const hideLayout = loginPage || docEditPage;

  const token = localStorage.getItem('panda_wiki_token') || '';

  useEffect(() => {
    if (onlyAllowShareApi) return;
    getUser().then(res => {
      dispatch(setUser(res));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (token) {
      getLicenseInfo().then(res => {
        dispatch(setLicense(res));
      });
    }
  }, [token]);

  if (!token && !onlyAllowShareApi) {
    window.location.href = '/login';
    return null;
  }

  return (
    <ThemeProvider
      colors={{ light }}
      mode='light'
      theme={{
        components: componentStyleOverrides,
      }}
    >
      {hideLayout ? (
        <Box
          sx={{
            minWidth: '900px',
          }}
        >
          {routerView}
        </Box>
      ) : (
        <>
          <Box
            sx={{
              position: 'relative',
              minWidth: '900px',
              minHeight: '100vh',
              fontSize: '16px',
              bgcolor: 'background.paper0',
            }}
          >
            <Sidebar />
            <Header />
            <Box
              sx={{
                pr: 2,
                width: 'calc(100% - 170px)',
                pt: '64px',
                ml: '170px',
                color: 'text.primary',
              }}
            >
              {routerView}
            </Box>
          </Box>
          <KBCreate />
        </>
      )}
    </ThemeProvider>
  );
}

export default App;
