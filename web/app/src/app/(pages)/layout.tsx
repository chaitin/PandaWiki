import { getShareV1AppWebInfo } from '@/request/ShareApp';
import parse, { DOMNode, domToReact } from 'html-react-parser';
import Script from 'next/script';

const Layout = async ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  const kbDetail = await getShareV1AppWebInfo();

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

      {children}

      {kbDetail?.settings?.body_code && (
        <>{parse(kbDetail.settings.body_code, options)}</>
      )}
    </>
  );
};

export default Layout;
