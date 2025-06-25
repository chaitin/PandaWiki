'use client'

import { apiClient } from "@/api";
import NotData from '@/assets/images/nodata.png';
import { NodeDetail } from "@/assets/type";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { useStore } from "@/provider";
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Box, Fab, Stack, Zoom } from "@mui/material";
import { useTiptapEditor } from "ct-tiptap-editor";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Catalog from "./Catalog";
import CatalogH5 from "./CatalogH5";
import DocAnchor from "./DocAnchor";
import DocContent from "./DocContent";

const Doc = ({ node: defaultNode, token }: { node?: NodeDetail, token?: string }) => {

  const { id: defaultId } = useParams()

  const [firstRequest, setFirstRequest] = useState(true)
  const { nodeList = [], kb_id, kbDetail, mobile = false, catalogShow } = useStore()

  const catalogSetting = kbDetail?.settings?.catalog_settings
  const footerSetting = kbDetail?.settings?.footer_settings
  const [footerHeight, setFooterHeight] = useState(0);

  const [id, setId] = useState(defaultId as string || '')
  const [node, setNode] = useState<NodeDetail | undefined>(defaultNode)

  const editorRef = useTiptapEditor({
    content: node?.content || '',
    editable: false,
  })

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
    const timer = setTimeout(() => {
      getFooterHeight();
    }, 100);

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
      const result = await apiClient.serverGetNodeDetail(id, kb_id || '', token, window?.location.origin);
      setNode(result.data);
    } catch (error) {
      console.error('page Error fetching document content:', error);
    }
  }

  useEffect(() => {
    if (node && editorRef && editorRef.editor) {
      editorRef.setContent(node?.content || '')
    }
  }, [node])

  useEffect(() => {
    if (!firstRequest) getData(id)
    setFirstRequest(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  if (mobile) {
    return <Box sx={{ mt: '60px', position: 'relative', zIndex: 1 }}>
      <Box sx={{ minHeight: `calc(100vh - ${footerHeight + 1}px - 100px)` }}>
        <Header />
        {nodeList && <CatalogH5 activeId={id} nodes={nodeList} onChange={setId} />}
        <Box sx={{ height: 24 }} />
        {node ? <DocContent info={node} editorRef={editorRef} /> : <Stack direction='column' alignItems='center' justifyContent='center' sx={{
          height: 600,
        }}>
          <Image src={NotData.src} alt='not data' width={423} height={232} />
          <Box sx={{
            fontSize: 14,
            color: 'text.secondary',
            textAlign: 'center',
            mt: 2,
          }}>
            文档不存在
          </Box>
        </Stack>}
      </Box>
      <Box sx={{
        mt: 5,
        bgcolor: 'background.paper',
        ...(footerSetting?.footer_style === 'complex' && {
          borderTop: '1px solid',
          borderColor: 'divider',
        }),
      }}>
        <Footer />
      </Box>
      <Zoom in={showScrollTop}>
        <Fab
          size="small"
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
  }

  return <Box sx={{
    position: 'relative',
    bgcolor: 'background.default',
  }}>
    <Catalog />
    <Header />
    {node ? <>
      <Box sx={{
        pt: '96px',
        position: 'relative',
        zIndex: 1,
        minHeight: `calc(100vh - ${footerHeight + 1}px)`,
        pb: 10,
        bgcolor: 'background.default',
      }}>
        <DocContent info={node} editorRef={editorRef} />
      </Box>
      <DocAnchor
        editorRef={editorRef}
        node={node}
        summary={node?.meta?.summary || ''}
      />
    </> : <Stack direction='column' alignItems='center' justifyContent='center' sx={{
      position: 'relative',
      height: `calc(100vh - ${footerHeight + 1}px)`,
      ml: catalogShow ? `${catalogSetting?.catalog_width ?? 260}px` : '16px',
    }}>
      {footerHeight > 0 && <>
        <Image src={NotData.src} alt='not data' width={423} height={232} />
        <Box sx={{
          fontSize: 14,
          color: 'text.secondary',
          textAlign: 'center',
          mt: 2,
        }}>
          文档不存在
        </Box>
      </>}
    </Stack>}
    <Footer />
    <Zoom in={showScrollTop}>
      <Fab
        size="small"
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
};

export default Doc;
