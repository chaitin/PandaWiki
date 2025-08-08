'use client';

import NotData from '@/assets/images/nodata.png';
import { KBDetail, NodeDetail } from '@/assets/type';
import { FooterProvider } from '@/components/footer';
import Header from '@/components/header';
import { VisitSceneNode } from '@/constant';
import { useStore } from '@/provider';
import { getShareV1NodeDetail } from '@/request/ShareNode';
import { postShareV1StatPage } from '@/request/ShareStat';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Box, Fab, Stack, Zoom } from '@mui/material';
import { TocList, useTiptap } from '@yu-cq/tiptap';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Catalog from './Catalog';
import CatalogH5 from './CatalogH5';
import DocAnchor from './DocAnchor';
import DocContent from './DocContent';

const Doc = ({
  node: defaultNode,
  kbInfo,
  commentList,
}: {
  node?: NodeDetail;
  kbInfo?: KBDetail;
  commentList?: any[];
}) => {
  const { id = '' }: { id: string } = useParams();

  const [docId, setDocId] = useState(id);
  const [firstRequest, setFirstRequest] = useState(true);
  const {
    nodeList = [],
    kbDetail,
    mobile = false,
    catalogShow,
    catalogWidth,
  } = useStore();

  const footerSetting = kbDetail?.settings?.footer_settings;
  const [footerHeight, setFooterHeight] = useState(0);
  const [headings, setHeadings] = useState<TocList>([]);

  const [node, setNode] = useState<NodeDetail | undefined>(defaultNode);

  const editorRef = useTiptap({
    content: node?.content || '',
    editable: false,
    immediatelyRender: false,
    onTocUpdate: (toc: TocList) => {
      setHeadings(toc);
    },
  });

  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = () => {
    setShowScrollTop(window.scrollY > 300);
  };

  const getFooterHeight = () => {
    const footerElement = document.getElementById('footer');
    if (footerElement) {
      const height = footerElement.offsetHeight;
      setFooterHeight(height);
      return height;
    }
    return 0;
  };

  useEffect(() => {
    const timer = setTimeout(getFooterHeight, 100);
    const handleResize = () => {
      getFooterHeight();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [footerSetting, mobile]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getData = async (id: string) => {
    try {
      const result: any = await getShareV1NodeDetail({ id });
      setNode(result);
      document.title = kbDetail?.name + ' - ' + result?.name;
    } catch (error) {
      console.error('page Error fetching document content:', error);
    }
  };

  useEffect(() => {
    if (node && editorRef && editorRef.editor) {
      editorRef.editor.commands.setContent(node?.content || '')
    }
  }, [node, firstRequest]);

  useEffect(() => {
    if (!firstRequest) {
      getData(docId || '');
      postShareV1StatPage({
        scene: VisitSceneNode,
        node_id: docId || '',
      });
    }
    setFirstRequest(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [docId]);

  if (mobile) {
    return (
      <Box sx={{ mt: '60px', position: 'relative', zIndex: 1 }}>
        <Box sx={{ minHeight: `calc(100vh - ${footerHeight + 1}px - 100px)` }}>
          <Header />
          {nodeList && <CatalogH5 nodes={nodeList} />}
          <Box sx={{ height: 24 }} />
          {node ? (
            <DocContent
              info={node}
              editorRef={editorRef}
              docId={docId}
              kbInfo={kbInfo}
              commentList={commentList}
            />
          ) : (
            <Stack
              direction='column'
              alignItems='center'
              justifyContent='center'
              sx={{
                height: 600,
              }}
            >
              <Image
                src={NotData.src}
                alt='not data'
                width={423}
                height={232}
              />
              <Box
                sx={{
                  fontSize: 14,
                  color: 'text.secondary',
                  textAlign: 'center',
                  mt: 2,
                }}
              >
                文档不存在
              </Box>
            </Stack>
          )}
        </Box>
        <Box
          sx={{
            mt: 5,
            bgcolor: 'background.paper2',
            ...(footerSetting?.footer_style === 'complex' && {
              borderTop: '1px solid',
              borderColor: 'divider',
            }),
          }}
        >
          <FooterProvider />
        </Box>
        <Zoom in={showScrollTop}>
          <Fab
            size='small'
            onClick={scrollToTop}
            sx={{
              backgroundColor: 'background.paper2',
              color: 'text.primary',
              position: 'fixed',
              bottom: 66,
              right: 16,
              zIndex: 1000,
            }}
          >
            <KeyboardArrowUpIcon sx={{ fontSize: 24 }} />
          </Fab>
        </Zoom>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: 'background.default',
      }}
    >
      <Catalog id={docId} setId={setDocId} />
      <Header />
      {node ? (
        <>
          <Box
            sx={{
              pt: '96px',
              position: 'relative',
              zIndex: 1,
              minHeight: `calc(100vh - ${footerHeight + 1}px)`,
              pb: 10,
              bgcolor: 'background.default',
            }}
          >
            <DocContent
              info={node}
              editorRef={editorRef}
              docId={docId}
              kbInfo={kbInfo}
            />
          </Box>
          {!!editorRef && (
            <DocAnchor
              headings={headings}
              footerHeight={footerHeight}
              summary={node?.meta?.summary || ''}
            />
          )}
        </>
      ) : (
        <Stack
          direction='column'
          alignItems='center'
          justifyContent='center'
          style={{
            marginLeft: catalogShow ? `${catalogWidth!}px` : '16px',
          }}
          sx={{
            position: 'relative',
            height: `calc(100vh - ${footerHeight + 1}px)`,
          }}
        >
          {footerHeight > 0 && (
            <>
              <Image
                src={NotData.src}
                alt='not data'
                width={423}
                height={232}
              />
              <Box
                sx={{
                  fontSize: 14,
                  color: 'text.secondary',
                  textAlign: 'center',
                  mt: 2,
                }}
              >
                文档不存在
              </Box>
            </>
          )}
        </Stack>
      )}
      <FooterProvider />
      <Zoom in={showScrollTop}>
        <Fab
          size='small'
          onClick={scrollToTop}
          sx={{
            backgroundColor: 'background.paper2',
            color: 'text.primary',
            position: 'fixed',
            bottom: 66,
            right: 16,
            zIndex: 1000,
          }}
        >
          <KeyboardArrowUpIcon sx={{ fontSize: 24 }} />
        </Fab>
      </Zoom>
    </Box>
  );
};

export default Doc;
