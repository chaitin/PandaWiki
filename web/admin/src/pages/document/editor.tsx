import { getNodeDetail, NodeDetail, updateNode, uploadFile } from "@/api";
import { useAppDispatch } from "@/store";
import { setKbId } from "@/store/slices/config";
import { Box, Stack } from "@mui/material";
import { Message } from "ct-mui";
import { TiptapEditor, TiptapToolbar, useTiptapEditor } from 'ct-tiptap-editor';
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
  const [edited, setEdited] = useState(false)
  const [detail, setDetail] = useState<NodeDetail | null>(null)
  const [headings, setHeadings] = useState<{ id: string, title: string, heading: number }[]>([])
  const [maxH, setMaxH] = useState(0)
  const [publishOpen, setPublishOpen] = useState(false)

  const getDetail = () => {
    getNodeDetail({ id }).then(res => {
      setDetail(res)
      dispatch(setKbId(res.kb_id))
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
    const { editor } = editorRef
    const content = editor.getHTML()
    try {
      await updateNode({ id, content, kb_id: detail.kb_id })
      if (auto === true) Message.success('自动保存成功')
      else if (auto === undefined) Message.success('保存成功')
      setEdited(false)
      if (publish) setPublishOpen(true)
      getDetail()
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
    onSave: () => handleSave(),
    aiUrl: '/api/v1/creation/text',
    onUpload: handleUpload,
    onUpdate: () => setEdited(true),
    onError: (error: Error) => {
      Message.error(error.message)
    }
  })

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (detail && editorRef) {
      const content = editorRef.editor.getHTML()
      if (content === detail.content) return
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
    if (id) getDetail()
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSave(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [id])

  if (!editorRef) return <></>

  return <Box sx={{ color: 'text.primary', pb: 2 }}>
    <Box sx={{
      position: 'fixed',
      top: 0,
      width: '100vw',
      zIndex: 2,
      bgcolor: '#fff',
      boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)',
    }}
    >
      <Box sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1,
      }}>
        <EditorHeader edited={edited} editorRef={editorRef} detail={detail} onSave={(auto, publish) => handleSave(auto, publish)} refresh={async () => {
          await handleSave(false)
          getDetail()
        }} />
      </Box>
      <TiptapToolbar editorRef={editorRef} />
    </Box>
    <Stack direction='row' alignItems={'flex-start'} sx={{
      width: 1400,
      margin: 'auto',
      overflowY: 'auto',
      mt: '105px',
    }}>
      <Box sx={{
        width: 292,
        position: 'fixed',
        zIndex: 1,
        mr: 1,
      }}>
        <EditorFolder editorRef={editorRef} content={detail?.content || ''} save={handleSave} />
      </Box>
      <Box className='editor-content' sx={{
        width: 800,
        ml: '300px',
        position: 'relative',
        zIndex: 1,
        '.editor-container': {
          p: 4,
          borderRadius: '6px',
          bgcolor: '#fff',
          minHeight: 'calc(100vh - 121px)',
          '.tiptap': {
            minHeight: 'calc(100vh - 121px)',
          }
        }
      }}>
        <TiptapEditor editorRef={editorRef} />
      </Box>
      <Stack direction={'row'} justifyContent={'flex-end'} sx={{
        position: 'fixed',
        width: 1400,
      }}>
        <Stack gap={1}>
          <EditorSummary
            kb_id={detail?.kb_id || ''}
            id={detail?.id || ''}
            name={detail?.name || ''}
            summary={detail?.meta.summary || ''}
          />
          <EditorDocNav title={detail?.name} headers={headings} maxH={maxH} />
        </Stack>
      </Stack>
    </Stack>
    <VersionPublish open={publishOpen} defaultSelected={[id]} onClose={() => setPublishOpen(false)} refresh={() => getDetail()} />
  </Box>
}

export default DocEditor