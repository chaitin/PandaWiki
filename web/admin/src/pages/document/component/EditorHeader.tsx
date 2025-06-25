import { createNode, NodeDetail, NodeListItem, updateNode } from "@/api"
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

interface EditorHeaderProps {
  editorRef: UseTiptapEditorReturn
  detail: NodeDetail | null
  onSave?: () => void
  refresh?: () => void
}

const EditorHeader = ({ editorRef, detail, onSave, refresh }: EditorHeaderProps) => {
  const editor = editorRef?.editor || null
  const theme = useTheme()
  const { kb_id } = useAppSelector(state => state.config)

  const [renameOpen, setRenameOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)

  const handleExport = async (type: string) => {
    if (!editor) return
    if (type === 'html') {
      const html = editor.getHTML()
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
  }

  if (!detail) return null

  return <>
    <Stack direction={'row'} alignItems={'center'} gap={3} justifyContent={'space-between'} sx={{
      width: 800,
      margin: 'auto',
    }}>
      <Stack direction={'row'} alignItems={'center'} gap={1} flexShrink={0}>
        <Emoji type={detail?.type} value={detail?.meta?.emoji} onChange={(value) => {
          updateNode({ id: detail.id, kb_id: kb_id, emoji: value }).then(() => {
            Message.success('修改成功')
            refresh?.()
          })
        }} />
        <Ellipsis sx={{ fontSize: 18, fontWeight: 'bold' }}>{detail?.name}</Ellipsis>
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
                fontSize: 14, px: 2, lineHeight: '40px', height: 40, width: 80,
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
            key: 'rename',
            label: <Stack
              direction={'row'}
              alignItems={'center'}
              gap={1}
              sx={{
                fontSize: 14, px: 2, lineHeight: '40px', height: 40, width: 80,
                borderRadius: '5px',
                cursor: 'pointer', ':hover': { bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1) }
              }}
            >
              重命名
            </Stack>,
            onClick: () => {
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
                width: 80,
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
          // {
          //   key: 'pdf',
          //   label: '导出 PDF',
          //   onClick: () => handleExport('pdf')
          // },
          // {
          //   key: 'docx',
          //   label: '导出 Docx',
          //   onClick: () => handleExport('docx')
          // },
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
        ]} context={<Button size="small" variant="outlined"
          startIcon={<Icon type='icon-daochu' />}>导出</Button>} />
        <Tooltip title={<Box>
          {getShortcutKeyText(['ctrl', 's'])}
        </Box>} placement="bottom" arrow>
          <Button size="small" variant="contained" onClick={onSave}
            startIcon={<Icon type='icon-baocun' />}>保存</Button>
        </Tooltip>
      </Stack>
    </Stack>
    <DocAddByCustomText type={detail.type} open={renameOpen} onClose={() => {
      setRenameOpen(false)
    }} data={{ id: detail.id, name: detail.name, emoji: detail.meta?.emoji || '' }} refresh={refresh} />
    <DocDelete open={delOpen} onClose={() => {
      setDelOpen(false)
    }} data={[{ ...detail, emoji: detail.meta?.emoji || '', parent_id: '', summary: detail.meta?.summary || '', position: 0, status: 1, visibility: 2 } as NodeListItem]} refresh={() => {
      setTimeout(() => {
        window.close();
      }, 1500)
    }} />
  </>
}

export default EditorHeader