import { getNodeDetail, NodeDetail, NodeReleaseDetail, NodeReleaseItem, updateNode, uploadFile } from "@/api";
import { useAppDispatch } from "@/store";
import { setKbId } from "@/store/slices/config";
import { Box, Stack, useMediaQuery } from "@mui/material";
import { Message } from "ct-mui";
import { TiptapEditor, TiptapToolbar, useTiptapEditor } from 'ct-tiptap-editor';
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import VersionPublish from "../release/components/VersionPublish";
import EditorDocNav from "./component/EditorDocNav";
import EditorFolder from "./component/EditorFolder";
import EditorHeader from "./component/EditorHeader";
import EditorSummary from "./component/EditorSummary";
import VersionList from "./component/VersionList";

const DocEditor = () => {
  const timer = useRef<NodeJS.Timeout | null>(null)
  const { id = '' } = useParams()
  const dispatch = useAppDispatch()
  const isWideScreen = useMediaQuery('(min-width:1400px)')
  const [edited, setEdited] = useState(false)
  const [detail, setDetail] = useState<NodeDetail | null>(null)
  const [docContent, setDocContent] = useState('')
  const [headings, setHeadings] = useState<{ id: string, title: string, heading: number }[]>([])
  const [maxH, setMaxH] = useState(0)
  const [publishOpen, setPublishOpen] = useState(false)
  const [showVersion, setShowVersion] = useState(false)
  const [curVersion, setCurVersion] = useState<(NodeReleaseDetail & { release: NodeReleaseItem }) | null>(null)

  const handleSave = async (auto?: boolean, publish?: boolean, html?: string) => {
    if (!editorRef || !detail) return
    const content = html || editorRef.getHtml()
    cancelTimer()
    try {
      await updateNode({ id, content, kb_id: detail.kb_id, emoji: detail.meta.emoji, summary: detail.meta.summary, name: detail.name })
      setDetail({
        ...detail,
        status: 1,
        updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        content,
        name: detail.name,
        meta: {
          emoji: detail.meta.emoji || '',
          summary: detail.meta.summary || '',
        }
      })
      if (publish) {
        setPublishOpen(true)
      }
      if (auto === true) {
        Message.success('自动保存成功')
      } else {
        setEdited(false)
        setDocContent(content)
      }
      if (auto === undefined) Message.success('保存成功')
      resetTimer()
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
    size: 100,
    aiUrl: '/api/v1/creation/text',
    onUpload: handleUpload,
    onSave: (html) => handleSave(undefined, false, html),
    onUpdate: () => {
      setEdited(true)
      if (detail) setDetail({ ...detail, status: 1 })
    },
    onError: (error: Error) => {
      Message.error(error.message)
    }
  })

  const getDetail = (unCover?: boolean) => {
    getNodeDetail({ id }).then(res => {
      setDetail(res)
      if (!unCover) setDocContent(res.content || '')
      setEdited(false)
      dispatch(setKbId(res.kb_id))
    })
  }

  const cancelTimer = () => {
    if (timer.current) clearInterval(timer.current)
  }

  const resetTimer = () => {
    cancelTimer()
    timer.current = setInterval(() => {
      handleSave(true)
    }, 1000 * 60)
  }

  useEffect(() => {
    if (showVersion) {
      cancelTimer()
    } else {
      resetTimer()
    }
  }, [showVersion])

  useEffect(() => {
    cancelTimer()
    if (editorRef) {
      editorRef.setContent(docContent || '').then((headings) => {
        setHeadings(headings)
        setMaxH(Math.min(...headings.map(h => h.heading)))
      })
      resetTimer()
    }
    return () => cancelTimer()
  }, [docContent])

  useEffect(() => {
    if (id && editorRef) {
      cancelTimer()
      getDetail()
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 60)
    }
  }, [id])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && edited) {
        handleSave(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  if (!editorRef) return <></>

  return <Box sx={{ color: 'text.primary', pb: 2 }}>
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
          detail={detail}
          setDetail={setDetail}
          setDocContent={setDocContent}
          editorRef={editorRef}
          resetTimer={resetTimer}
          cancelTimer={cancelTimer}
          showVersion={showVersion}
          curVersion={curVersion}
          setShowVersion={setShowVersion}
          onSave={(auto, publish) => handleSave(auto, publish)}
        />
      </Box>
      {!showVersion && <Box sx={{
        width: 900,
        margin: 'auto',
      }}>
        <TiptapToolbar editorRef={editorRef} />
      </Box>}
    </Box>
    {showVersion ? <VersionList
      changeVersion={setCurVersion}
    /> : <Box sx={{
      pt: '105px',
      display: 'flex',
      justifyContent: 'center',
      gap: isWideScreen ? 1 : 0,
    }}>
      {isWideScreen && (
        <Box sx={{
          width: 292,
          position: 'fixed',
          left: 'calc(50vw - 700px - 4px)',
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
      <Box className='editor-content' sx={{
        width: 800,
        overflowY: 'auto',
        position: 'relative',
        zIndex: 1,
        m: '0 auto',
        '.editor-container': {
          p: 4,
          borderRadius: '6px',
          bgcolor: '#fff',
          '.tiptap': {
            minHeight: 'calc(100vh - 185px)',
          }
        }
      }}>
        <TiptapEditor editorRef={editorRef} />
      </Box>
      {isWideScreen && (
        <Box sx={{
          width: 292,
          position: 'fixed',
          right: 'calc(50vw - 700px - 4px)',
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
              resetTimer={resetTimer}
              cancelTimer={cancelTimer}
              detail={detail}
              setDetail={setDetail}
            />
            <EditorDocNav
              headers={headings}
              maxH={maxH}
            />
          </Stack>
        </Box>
      )}
    </Box>}
    <VersionPublish
      open={publishOpen}
      defaultSelected={[id]}
      onClose={() => setPublishOpen(false)}
      refresh={() => getDetail()}
    />
  </Box>
}

export default DocEditor