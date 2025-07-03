import { getNodeDetail, NodeDetail, updateNode, uploadFile } from "@/api";
import { useAppDispatch } from "@/store";
import { setKbId } from "@/store/slices/config";
import { Box, Stack, useMediaQuery, useTheme } from "@mui/material";
import { Message } from "ct-mui";
import { TiptapEditor, TiptapToolbar, useTiptapEditor } from 'ct-tiptap-editor';
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import VersionPublish from "../release/components/VersionPublish";
import EditorDocNav from "./component/EditorDocNav";
import EditorFolder from "./component/EditorFolder";
import EditorHeader from "./component/EditorHeader";
import EditorSummary from "./component/EditorSummary";

const DocEditor = () => {
  const timer = useRef<NodeJS.Timeout | null>(null)
  const { id = '' } = useParams()
  const dispatch = useAppDispatch()
  const theme = useTheme()
  const isWideScreen = useMediaQuery('(min-width:1400px)')
  const [edited, setEdited] = useState(false)
  const [detail, setDetail] = useState<NodeDetail | null>(null)
  const [updateAt, setUpdateAt] = useState<Dayjs | null>(null)
  const [headings, setHeadings] = useState<{ id: string, title: string, heading: number }[]>([])
  const [maxH, setMaxH] = useState(0)
  const [publishOpen, setPublishOpen] = useState(false)

  const getDetail = () => {
    getNodeDetail({ id }).then(res => {
      setDetail(res)
      setEdited(false)
      dispatch(setKbId(res.kb_id))
      setUpdateAt(dayjs(res.updated_at))
    })
  }

  const updateNav = async () => {
    if (!editorRef) return
    const headings = await editorRef.getNavs() || []
    setHeadings(headings)
    setMaxH(Math.min(...headings.map((h: any) => h.heading)))
  }

  const handleSave = async (auto?: boolean, publish?: boolean) => {
    if (!editorRef || !detail) return
    const content = editorRef.getHtml()
    try {
      await updateNode({ id, content, kb_id: detail.kb_id })
      if (auto === true) Message.success('自动保存成功')
      else if (auto === undefined) Message.success('保存成功')
      setEdited(false)
      if (publish) setPublishOpen(true)
      setUpdateAt(dayjs())
      updateNav()
    } catch (error) {
      Message.error('保存失败')
    }
  }

  const handleUpload = async (
    file: File,
    onProgress?: (progress: { progress: number }) => void,
    abortSignal?: AbortSignal
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    const { key } = await uploadFile(formData, {
      onUploadProgress: (event) => {
        onProgress?.(event)
      },
      abortSignal
    })
    return Promise.resolve('/static-file/' + key)
  }

  const editorRef = useTiptapEditor({
    content: '',
    immediatelyRender: true,
    aiUrl: '/api/v1/creation/text',
    onUpload: handleUpload,
    onSave: () => handleSave(),
    onUpdate: () => setEdited(true),
    onError: (error: Error) => {
      Message.error(error.message)
    }
  })

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (detail && editorRef) {
      editorRef.setContent(detail.content || '').then((headings) => {
        setHeadings(headings)
        setMaxH(Math.min(...headings.map(h => h.heading)))
      })
      timer.current = setInterval(() => {
        handleSave(true)
      }, 1000 * 60)
    }
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [detail])

  useEffect(() => {
    if (id) {
      getDetail()
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 60)
    }

    const handleVisibilityChange = () => {
      if (document.hidden && edited) {
        handleSave(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [id])

  // 当从窄屏切换到宽屏时，如果还没有数据则请求
  useEffect(() => {
    if (isWideScreen && id && !detail) {
      getDetail()
    }
  }, [isWideScreen, id, detail])

  if (!editorRef) return <></>

  return <Box sx={{ color: 'text.primary', pb: 2, height: '100vh' }}>
    {/* 固定头部 */}
    <Box sx={{
      position: 'fixed',
      top: 0,
      width: '100vw',
      zIndex: 1000,
      bgcolor: '#fff',
      boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)',
    }}>
      <Box sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1,
      }}>
        <EditorHeader
          edited={edited}
          detail={detail}
          editorRef={editorRef}
          updateAt={updateAt}
          onSave={(auto, publish) => handleSave(auto, publish)}
          refresh={async () => {
            await handleSave(false)
            getDetail()
          }} />
      </Box>
      <Box sx={{
        width: 900,
        margin: 'auto',
      }}>
        <TiptapToolbar editorRef={editorRef} />
      </Box>
    </Box>

    {/* 三栏布局容器 */}
    <Box sx={{
      mt: '105px',
      // height: 'calc(100vh - 105px)',
      display: 'flex',
      justifyContent: 'center',
      gap: isWideScreen ? 1 : 0, // 8px间隔
    }}>
      {/* 左侧边栏 */}
      {isWideScreen && (
        <Box sx={{
          width: 292,
          position: 'fixed',
          left: 'calc(50vw - 700px - 4px)', // 居中定位：视口中心 - 总宽度一半 - 间隔一半
          top: '105px',
          height: 'calc(100vh - 105px)',
          overflowY: 'auto',
          zIndex: 1,
        }}>
          <EditorFolder
            edited={edited}
            save={handleSave}
          />
        </Box>
      )}

      {/* 中间内容区域 */}
      <Box className='editor-content' sx={{
        width: 800,
        height: '100%',
        overflowY: 'auto',
        position: 'relative',
        zIndex: 1,
        m: '0 auto', // 居中显示
        '.editor-container': {
          p: 4,
          borderRadius: '6px',
          bgcolor: '#fff',
          minHeight: '100%',
          '.tiptap': {
            minHeight: '100%',
          }
        }
      }}>
        <TiptapEditor editorRef={editorRef} />
      </Box>

      {/* 右侧边栏 */}
      {isWideScreen && (
        <Box sx={{
          width: 292,
          position: 'fixed',
          right: 'calc(50vw - 700px - 4px)', // 居中定位：视口中心 - 总宽度一半 - 间隔一半
          top: '105px',
          height: 'calc(100vh - 105px)',
          overflowY: 'auto',
          zIndex: 1,
        }}>
          <Stack gap={1}>
            <EditorSummary
              kb_id={detail?.kb_id || ''}
              id={detail?.id || ''}
              name={detail?.name || ''}
              summary={detail?.meta.summary || ''}
            />
            <EditorDocNav
              title={detail?.name}
              headers={headings}
              maxH={maxH}
            />
          </Stack>
        </Box>
      )}
    </Box>

    <VersionPublish
      open={publishOpen}
      defaultSelected={[id]}
      onClose={() => setPublishOpen(false)}
      refresh={() => getDetail()}
    />
  </Box>
}

export default DocEditor