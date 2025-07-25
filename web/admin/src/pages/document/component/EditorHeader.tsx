import { createNode, NodeDetail, NodeListItem, NodeReleaseDetail, NodeReleaseItem, updateNode } from "@/api"
import Emoji from "@/components/Emoji"
import DocAddByCustomText from "@/pages/document/component/DocAddByCustomText"
import DocDelete from "@/pages/document/component/DocDelete"
import { useAppSelector } from "@/store"
import { addOpacityToColor, getShortcutKeyText } from "@/utils"
import { Box, Button, IconButton, Stack, Tooltip, useTheme } from "@mui/material"
import { Ellipsis, Icon, MenuSelect, Message } from "ct-mui"
import { UseTiptapEditorReturn } from "ct-tiptap-editor"
import dayjs from "dayjs"
import { useState } from "react"
import VersionRollback from "./VersionRollback"

interface EditorHeaderProps {
  editorRef: UseTiptapEditorReturn
  detail: NodeDetail | null
  setDetail?: (data: NodeDetail) => void
  onSave: (auto?: boolean, publish?: boolean) => void
  resetTimer?: () => void
  cancelTimer?: () => void
  setShowVersion: (show: boolean) => void
  showVersion: boolean
  setDocContent: (content: string) => void
  curVersion: (NodeReleaseDetail & { release: NodeReleaseItem }) | null
}

const EditorHeader = ({ editorRef, detail, onSave, resetTimer, cancelTimer, setDetail, setShowVersion, showVersion, curVersion, setDocContent }: EditorHeaderProps) => {
  const editor = editorRef?.editor || null
  const theme = useTheme()
  const { kb_id } = useAppSelector(state => state.config)

  const [renameOpen, setRenameOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [rollbackOpen, setRollbackOpen] = useState(false)

  const handleRollback = () => {
    if (!curVersion || !detail) return
    setDetail?.({
      ...detail,
      name: curVersion.name,
      content: curVersion.content,
      meta: curVersion.meta,
      status: 1,
    })
    setDocContent(curVersion.content)
    setRollbackOpen(false)
    setShowVersion(false)
    Message.success(`已使用版本 ${curVersion.release.release_name} 内容，需要保存并发布才能生效`, 5)
  }

  const handleSave = (publish?: boolean) => {
    if (publish && detail?.status === 2) {
      Message.info('当前已是最新版本！')
    } else {
      onSave(undefined, publish)
    }
  }

  const handleExport = async (type: string) => {
    if (!editorRef || !editor) return
    cancelTimer?.()
    if (type === 'html') {
      const html = editorRef.getHtml()
      if (!html) return
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${detail?.name}.html`
      a.click()
      URL.revokeObjectURL(url)
      Message.success('导出成功')
    }
    if (type === 'md') {
      const markdown = editor.storage.markdown.getMarkdown()
      if (!markdown) return
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${detail?.name}.md`
      a.click()
      URL.revokeObjectURL(url)
      Message.success('导出成功')
    }
    resetTimer?.()
  }

  if (!detail) return null

  return <>
    <Stack direction={'row'} alignItems={'center'} gap={3} justifyContent={'space-between'} sx={{
      width: 876,
      margin: 'auto',
    }}>
      {showVersion ? <>
        <Stack direction={'row'} gap={1} flex={1}>
          <Button
            sx={{ color: 'text.primary', flexShrink: 0 }}
            startIcon={<Icon type='icon-dengchu' sx={{ transform: 'rotate(180deg)', fontSize: 18 }} />}
            onClick={() => setShowVersion(false)}
          >
            返回编辑
          </Button>
          <Stack direction={'row'} alignItems={'center'} gap={1} flex={1}>
            <Emoji sx={{ flexShrink: 0 }} readOnly type={2} value={curVersion?.meta?.emoji} />
            <Ellipsis sx={{ fontSize: 18, fontWeight: 'bold', width: 0, flex: 1 }}>{curVersion?.name}</Ellipsis>
          </Stack>
        </Stack>
        <Stack direction={'row'} alignItems={'center'} gap={2} sx={{ flexShrink: 0 }}>
          <Stack direction={'row'} alignItems={'center'} gap={0.5} sx={{ fontSize: 12, color: 'text.auxiliary', fontFamily: 'Mono' }}>
            <Icon type='icon-banben1' />
            {curVersion?.release.release_name}
          </Stack>
          <Button variant="contained" onClick={() => setRollbackOpen(true)}>使用当前版本</Button>
        </Stack>
      </> : <>
        <Stack direction={'row'} alignItems={'center'} gap={1} flex={1}>
          <Emoji sx={{ flexShrink: 0 }} readOnly={showVersion} type={detail?.type} value={detail?.meta?.emoji} onChange={(value) => {
            cancelTimer?.()
            updateNode({ id: detail.id, kb_id: kb_id, emoji: value }).then(() => {
              Message.success('修改成功')
              setDetail?.({
                ...detail,
                updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                meta: { ...detail.meta, emoji: value },
                status: 1,
              })
            }).finally(() => {
              resetTimer?.()
            })
          }} />
          <Ellipsis sx={{ fontSize: 18, fontWeight: 'bold', width: 0, flex: 1 }}>{detail?.name}</Ellipsis>
        </Stack>
        <Stack direction={'row'} alignItems={'center'} gap={2} flexShrink={0}>
          <Stack direction={'row'} alignItems={'center'} gap={0.5} sx={{ fontSize: 12, color: 'text.auxiliary' }}>
            <Icon type='icon-baocun' />
            {dayjs(detail.updated_at).format('YYYY-MM-DD HH:mm:ss')}
          </Stack>
          <MenuSelect list={[
            {
              key: 'copy',
              label: <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{
                  fontSize: 14, px: 2, lineHeight: '40px', height: 40, width: 100,
                  borderRadius: '5px',
                  cursor: 'pointer', ':hover': { bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1) }
                }}
              >
                复制
              </Stack>,
              onClick: () => {
                if (kb_id) {
                  createNode({
                    name: detail.name + ' [副本]',
                    content: detail.content,
                    kb_id: detail.kb_id,
                    parent_id: detail.parent_id || null,
                    type: detail.type,
                    emoji: detail.meta.emoji,
                  }).then((res) => {
                    Message.success('复制成功')
                    window.open(`/doc/editor/${res.id}`, '_blank')
                  })
                }
              }
            },
            {
              key: 'version',
              label: <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{
                  fontSize: 14, px: 2, lineHeight: '40px', height: 40, width: 100,
                  borderRadius: '5px',
                  cursor: 'pointer', ':hover': { bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1) }
                }}
              >
                历史版本
              </Stack>,
              onClick: () => {
                Message.info('敬请期待')
                // setShowVersion(true)
              }
            },
            {
              key: 'rename',
              label: <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{
                  fontSize: 14, px: 2, lineHeight: '40px', height: 40, width: 100,
                  borderRadius: '5px',
                  cursor: 'pointer', ':hover': { bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1) }
                }}
              >
                重命名
              </Stack>,
              onClick: () => {
                cancelTimer?.()
                setRenameOpen(true)
              }
            },
            {
              key: 'delete',
              label: <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{
                  fontSize: 14,
                  px: 2,
                  lineHeight: '40px',
                  height: 40,
                  width: 100,
                  borderRadius: '5px',
                  cursor: 'pointer', ':hover': { bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1) }
                }}
              >
                删除
              </Stack>,
              onClick: () => {
                setDelOpen(true)
              }
            }
          ]} context={<IconButton size="small"><Icon type='icon-gengduo' /></IconButton>} />
          <MenuSelect list={[
            {
              key: 'html',
              label: <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{
                  fontSize: 14, px: 2, lineHeight: '40px', height: 40, width: 140,
                  borderRadius: '5px',
                  cursor: 'pointer', ':hover': { bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1) }
                }}
              >
                导出 HTML
              </Stack>,
              onClick: () => handleExport('html')
            },
            {
              key: 'md',
              label: <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{
                  fontSize: 14, px: 2, lineHeight: '40px', height: 40, width: 140,
                  borderRadius: '5px',
                  cursor: 'pointer', ':hover': { bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1) }
                }}
              >
                导出 Markdown
              </Stack>,
              onClick: () => handleExport('md')
            }
          ]} context={<Button
            size="small"
            variant="outlined"
            startIcon={<Icon type='icon-daochu' />}
          >导出</Button>} />
          <MenuSelect list={[
            {
              key: 'save',
              label: <Tooltip title={<Box>
                {getShortcutKeyText(['ctrl', 's'])}
              </Box>} placement="right" arrow>
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  gap={1}
                  sx={{
                    fontSize: 14, px: 2, lineHeight: '40px', height: 40, width: 140,
                    borderRadius: '5px',
                    cursor: 'pointer', ':hover': { bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1) }
                  }}
                >
                  保存
                </Stack>
              </Tooltip>,
              onClick: () => handleSave(false)
            },
            {
              key: 'save_publish',
              label: <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{
                  fontSize: 14, px: 2, lineHeight: '40px', height: 40, width: 140,
                  borderRadius: '5px',
                  cursor: 'pointer', ':hover': { bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1) }
                }}
              >
                保存并发布
              </Stack>,
              onClick: () => handleSave(true)
            },
          ]} context={
            <Button size="small" variant="contained"
              startIcon={<Icon type='icon-baocun' />}>保存</Button>
          } />
        </Stack>
      </>}
    </Stack>
    <DocAddByCustomText type={detail.type} open={renameOpen} onClose={() => {
      resetTimer?.()
      setRenameOpen(false)
    }} data={detail} setDetail={setDetail} />
    <DocDelete open={delOpen} onClose={() => {
      setDelOpen(false)
    }} data={[{ ...detail, emoji: detail.meta?.emoji || '', parent_id: '', summary: detail.meta?.summary || '', position: 0, status: 1, visibility: 2 } as NodeListItem]} refresh={() => {
      setTimeout(() => {
        window.close();
      }, 1500)
    }} />
    {curVersion && <VersionRollback
      open={rollbackOpen}
      data={curVersion.release}
      onClose={() => {
        setRollbackOpen(false)
      }}
      onOk={handleRollback}
    />}
  </>
}

export default EditorHeader