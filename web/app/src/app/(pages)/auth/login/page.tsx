import Login from '@/views/auth/login';
import { getShareV1AppWebInfo } from '@/request/ShareApp';

const LoginPage = async () => {
  const res = await getShareV1AppWebInfo({});
  return <Login />;
};

export default LoginPage;
