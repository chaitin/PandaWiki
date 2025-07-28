'use client';

import { apiClient } from '@/api';
import NotData from '@/assets/images/nodata.png';
import { Heading, KBDetail, NodeDetail } from '@/assets/type';
import Footer from '@/components/footer';
import Header from '@/components/header';
import { VisitSceneNode } from '@/constant';
import { useStore } from '@/provider';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Box, Fab, Stack, Zoom } from '@mui/material';
import { message } from 'ct-mui';
import { useTiptapEditor } from 'ct-tiptap-editor';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Catalog from './Catalog';
import CatalogH5 from './CatalogH5';
import DocAnchor from './DocAnchor';
import DocContent from './DocContent';

const Doc = ({
  node: defaultNode,
  token,
  kbInfo,
  commentList,
}: {
  node?: NodeDetail;
  token?: string;
  kbInfo?: KBDetail;
  commentList?: any[];
}) => {
  const { id = '' }: { id: string } = useParams();

  const [docId, setDocId] = useState(id);
  const [firstRequest, setFirstRequest] = useState(true);
  const {
    nodeList = [],
    kb_id,
    kbDetail,
    mobile = false,
    catalogShow,
    catalogWidth,
  } = useStore();

  const footerSetting = kbDetail?.settings?.footer_settings;
  const [footerHeight, setFooterHeight] = useState(0);
  const [headings, setHeadings] = useState<Heading[]>([]);

  const [node, setNode] = useState<NodeDetail | undefined>(defaultNode);

  const editorRef = useTiptapEditor({
    content: node?.content || '',
    editable: false,
    immediatelyRender: false,
  });

  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = () => {
    setShowScrollTop(window.scrollY > 300);
  };

  // 获取 Footer 高度的函数
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
    // 延迟获取高度，确保 DOM 已渲染
    const timer = setTimeout(getFooterHeight, 100);

    // 监听窗口大小变化，重新计算高度
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
      const result = await apiClient.clientGetNodeDetail(
        id,
        kb_id || '',
        token
      );
      if (result.success) {
        setNode(result.data);
        if (document)
          document.title = kbDetail?.name + ' - ' + result.data?.name;
      } else {
        message.error(result.message || 'Failed to fetch');
      }
    } catch (error) {
      console.error('page Error fetching document content:', error);
    }
  };

  useEffect(() => {
    if (node && editorRef && editorRef.editor) {
      editorRef.setContent(node?.content || '').then((navs: Heading[]) => {
        setHeadings(navs || []);
      });
    }
  }, [node, firstRequest]);

  useEffect(() => {
    if (!firstRequest) {
      getData(docId || '');
      apiClient.clientStatPage({
        scene: VisitSceneNode,
        node_id: docId || '',
        kb_id: kb_id || '',
        authToken: token,
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
            bgcolor: 'background.paper',
            ...(footerSetting?.footer_style === 'complex' && {
              borderTop: '1px solid',
              borderColor: 'divider',
            }),
          }}
        >
          <Footer />
        </Box>
        <Zoom in={showScrollTop}>
          <Fab
            size='small'
            onClick={scrollToTop}
            sx={{
              backgroundColor: 'background.paper',
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
      <Footer />
      <Zoom in={showScrollTop}>
        <Fab
          size='small'
          onClick={scrollToTop}
          sx={{
            backgroundColor: 'background.paper',
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
