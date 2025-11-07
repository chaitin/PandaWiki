import router from '@/router';
import { useAppDispatch } from '@/store';
import { theme } from '@/themes';
import { ThemeProvider } from '@ctzhian/ui';
import { useEffect } from 'react';
import { useLocation, useRoutes } from 'react-router-dom';

import { getApiV1License } from './request/pro/License';

import { setLicense } from './store/slices/config';

import '@ctzhian/tiptap/dist/index.css';

function App() {
  const location = useLocation();
  const { pathname } = location;
  const dispatch = useAppDispatch();
  const routerView = useRoutes(router);
  const loginPage = pathname.includes('/login');
  const onlyAllowShareApi = loginPage;

  const token = localStorage.getItem('panda_wiki_token') || '';

  useEffect(() => {
    if (token) {
      getApiV1License().then(res => {
        // 确保始终设置为企业版
        if (res && res.data) {
          const licenseData: DomainLicenseResp = {
            ...res.data,
            edition: 2, // 企业版
          };
          dispatch(setLicense(licenseData));
        }
      });
    }
  }, [token]);

  // 添加这个useEffect钩子确保license始终为企业版
  useEffect(() => {
    if (license && license.edition !== 2) {
      // 如果license不是企业版，强制设置为企业版
      const updatedLicense: DomainLicenseResp = {
        ...license,
        edition: 2,
        expired_at:
          license.expired_at ||
          Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 一年后过期
        started_at: license.started_at || Math.floor(Date.now() / 1000), // 今天开始
      };
      dispatch(setLicense(updatedLicense));
    }
  }, [license, dispatch]);

  if (!token && !onlyAllowShareApi) {
    window.location.href = '/login';
    return null;
  }

  return (
    <ThemeProvider theme={theme} defaultMode='light' storageManager={null}>
      {routerView}
    </ThemeProvider>
  );
}

export default App;
