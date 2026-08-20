import WaterMarkProvider from '@/components/watermark/WaterMarkProvider';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <WaterMarkProvider color='rgba(0,0,0,1)'>{children}</WaterMarkProvider>
  );
};

export default Layout;
