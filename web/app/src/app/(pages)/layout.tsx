import StoreProvider from '@/provider';
import { getShareV1AppWebInfo } from '@/request/ShareApp';
import { getShareV1NodeList } from '@/request/ShareNode';
import { Box } from '@mui/material';
import parse, { DOMNode, domToReact } from 'html-react-parser';
import Script from 'next/script';

const Layout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const kbDetail: any = await getShareV1AppWebInfo();
  const nodeList: any = await getShareV1NodeList();

  const options = {
    replace(domNode: DOMNode) {
      if (domNode.type === 'script') {
        if (!domNode.children) return <Script {...domNode.attribs} />;
        return (
          <Script {...domNode.attribs}>
            {domToReact(domNode.children as any, options)}
          </Script>
        );
      }
    },
  };

  return (
    <>
      {kbDetail?.settings?.head_code ? (
        <>{parse(kbDetail.settings.head_code, options)}</>
      ) : null}

      <StoreProvider nodeList={nodeList || []}>
        <Box sx={{ bgcolor: 'background.paper' }}>{children}</Box>
      </StoreProvider>

      {kbDetail?.settings?.body_code && (
        <>{parse(kbDetail.settings.body_code, options)}</>
      )}
    </>
  );
};

export default Layout;
