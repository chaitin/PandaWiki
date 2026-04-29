import StoreProvider from '@/provider';
import PagesClientChrome from '@/components/PagesClientChrome';
import { getShareV1AppWebInfo } from '@/request/ShareApp';
import { getShareV1NodeList } from '@/request/ShareNode';
import parse, { DOMNode, domToReact } from 'html-react-parser';
import Script from 'next/script';
import { filterEmptyFolders, convertToTree } from '@/utils/drag';

const Layout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const [kbDetail, nodeList]: any = await Promise.all([
    getShareV1AppWebInfo(),
    getShareV1NodeList(),
  ]);

  const tree = filterEmptyFolders(convertToTree(nodeList || []));

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

      <StoreProvider nodeList={nodeList || []} tree={tree}>
        <PagesClientChrome>{children}</PagesClientChrome>
      </StoreProvider>

      {kbDetail?.settings?.body_code && (
        <>{parse(kbDetail.settings.body_code, options)}</>
      )}
    </>
  );
};

export default Layout;
