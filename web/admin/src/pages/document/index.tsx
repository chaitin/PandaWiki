import { getNodeList, ITreeItem, NodeListFilterData, NodeListItem } from "@/api"
import Card from "@/components/Card"
import DragTree from "@/components/Drag/DragTree"
import { TreeMenuItem, TreeMenuOptions } from "@/components/Drag/DragTree/TreeMenu"
import { convertToTree } from "@/constant/drag"
import { useURLSearchParams } from "@/hooks"
import { useAppSelector } from "@/store"
import { addOpacityToColor } from "@/utils"
import { Box, Button, Checkbox, IconButton, Stack, useTheme } from "@mui/material"
import { Icon, MenuSelect } from "ct-mui"
import { useCallback, useEffect, useState } from "react"
import VersionPublish from "../release/components/VersionPublish"
import DocAdd from "./component/DocAdd"
import DocAddByUrl from "./component/DocAddByUrl"
import DocDelete from "./component/DocDelete"
import DocSearch from "./component/DocSearch"
import DocStatus from "./component/DocStatus"
import DocSummary from "./component/DocSummary"
import Summary from "./component/Summary"

const Content = () => {
  const { kb_id } = useAppSelector(state => state.config)
  const theme = useTheme()

  const [searchParams] = useURLSearchParams()
  const search = searchParams.get('search') || ''
  const [supportSelect, setBatchOpen] = useState(false)

  const [publish, setPublish] = useState({
    published: 0,
    unpublished: 0,
  })
  const [list, setList] = useState<NodeListItem[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [data, setData] = useState<ITreeItem[]>([])
  const [opraData, setOpraData] = useState<NodeListItem[]>([])
  const [statusOpen, setStatusOpen] = useState<'private' | 'public' | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [moreSummaryOpen, setMoreSummaryOpen] = useState(false)
  const [urlOpen, setUrlOpen] = useState(false)
  const [publishIds, setPublishIds] = useState<string[]>([])
  const [publishOpen, setPublishOpen] = useState(false)
  const [key, setKey] = useState<'URL' | 'RSS' | 'Sitemap' | 'OfflineFile' | 'Notion' | 'Epub'>('URL')

  const handleUrl = (item: ITreeItem, key: 'URL' | 'RSS' | 'Sitemap' | 'OfflineFile' | 'Notion' | 'Epub') => {
    setKey(key)
    setUrlOpen(true)
    setOpraData(list.filter(it => it.id === item.id))
  }

  const handleDelete = (item: ITreeItem) => {
    setDeleteOpen(true)
    setOpraData(list.filter(it => it.id === item.id))
  }

  const handleSummary = (item: ITreeItem) => {
    setSummaryOpen(true)
    setOpraData(list.filter(it => it.id === item.id))
  }

  const handleStatus = (item: ITreeItem, status: 'public' | 'private') => {
    setStatusOpen(status)
    setOpraData(list.filter(it => it.id === item.id))
  }

  const handlePublish = (item: ITreeItem) => {
    setPublishOpen(true)
    setPublishIds([item.id])
  }

  const menu = (opra: TreeMenuOptions): TreeMenuItem[] => {
    const { item, createItem, renameItem, isEditting } = opra
    return [
      ...(item.type === 1 ? [
        { label: '创建文件夹', key: 'folder', onClick: () => createItem(1) },
        { label: '创建文档', key: 'doc', onClick: () => createItem(2) },
        {
          label: '导入文档', key: 'third', children: [
            { label: '通过 URL 导入', key: 'URL', onClick: () => handleUrl(item, 'URL') },
            { label: '通过 RSS 导入', key: 'RSS', onClick: () => handleUrl(item, 'RSS') },
            { label: '通过 Sitemap 导入', key: 'Sitemap', onClick: () => handleUrl(item, 'Sitemap') },
            { label: '通过离线文件导入', key: 'OfflineFile', onClick: () => handleUrl(item, 'OfflineFile') },
            { label: '通过 Notion 导入', key: 'Notion', onClick: () => handleUrl(item, 'Notion') },
            { label: '通过 Epub 导入', key: 'Epub', onClick: () => handleUrl(item, 'Epub') }
          ]
        }
      ] : []),
      ...(item.type === 2 ? [
        ...(item.visibility === 1 ? [{ label: '设为公开', key: 'public', onClick: () => handleStatus(item, 'public') }] : []),
        ...(item.visibility === 2 ? [{ label: '设为私有', key: 'private', onClick: () => handleStatus(item, 'private') }] : []),
        ...(item.status === 1 ? [{ label: '更新发布', key: 'update_publish', onClick: () => handlePublish(item) }] : []),
        { label: item.summary ? '查看摘要' : '生成摘要', key: 'summary', onClick: () => handleSummary(item) },
      ] : []),
      ...(!isEditting ? [{ label: '重命名', key: 'rename', onClick: renameItem }] : []),
      { label: '删除', key: 'delete', onClick: () => handleDelete(item) }
    ]
  }

  const getData = useCallback(() => {
    const params: NodeListFilterData = { kb_id }
    if (search) params.search = search
    getNodeList(params).then(res => {
      setList(res || [])
      const fileData = res.filter(it => it.type === 2)
      setPublish({
        unpublished: fileData.filter(it => it.status === 1).length,
        published: fileData.filter(it => it.status === 2).length,
      })
      const v = convertToTree(res || [])
      setData(v)
    })
  }, [search, kb_id])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && kb_id) {
        getData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [getData, kb_id]);

  useEffect(() => {
    if (kb_id) getData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, kb_id])

  return <>
    <Card>
      <Stack direction={'row'} alignItems={'center'} justifyContent={'space-between'} sx={{ p: 2 }}>
        <Stack direction={'row'} alignItems={'center'} gap={0} sx={{ fontSize: 16, fontWeight: 700 }}>
          <Box>目录</Box>
          {publish.unpublished > 0 && <>
            <Box sx={{ color: 'error.main', fontSize: 12, fontWeight: 'normal', ml: 2 }}>
              {publish.unpublished} 个文档未发布，
            </Box>
            <Button size="small" sx={{ minWidth: 0, p: 0, fontSize: 12 }} onClick={() => {
              setPublishOpen(true)
            }}>
              去发布
            </Button>
          </>}
        </Stack>
        <Stack direction={'row'} alignItems={'center'} gap={2}>
          <DocSearch />
          <DocAdd refresh={getData} />
          <MenuSelect
            list={[
              {
                key: 'batch',
                label: <Stack
                  direction={'row'}
                  alignItems={'center'}
                  gap={1}
                  sx={{
                    fontSize: 14, px: 2, lineHeight: '40px', height: 40, width: 180,
                    borderRadius: '5px',
                    cursor: 'pointer', ':hover': { bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1) }
                  }}
                  onClick={() => setBatchOpen(true)}
                >
                  批量操作
                </Stack>
              },
            ]}
            context={<Box>
              <IconButton size="small">
                <Icon type="icon-gengduo" />
              </IconButton>
            </Box>}
          />
        </Stack>
      </Stack>
      {supportSelect && <Stack direction={'row'} alignItems={'center'} sx={{ px: 2, mb: 2 }}>
        <Checkbox
          sx={{ color: 'text.disabled', width: '35px', height: '35px', mt: '-1px' }}
          checked={selected.length === list.length}
          onChange={(e) => {
            e.stopPropagation()
            if (selected.length === list.length) {
              setSelected([])
              setOpraData([])
            } else {
              setSelected(list.map(item => item.id))
              setOpraData(list)
            }
          }}
        />
        {selected.length > 0 ? <>
          <Box sx={{ fontSize: 14, color: 'text.secondary', mr: 2 }}>
            已选中 {selected.length} 项
          </Box>
          <Stack direction={'row'} alignItems={'center'} gap={1}>
            <Button size="small" sx={{ minWidth: 0, p: 0 }} onClick={() => {
              setStatusOpen('public')
              setOpraData(list.filter(item => selected.includes(item.id)))
            }}>
              设为公开
            </Button>
            <Button size="small" sx={{ minWidth: 0, p: 0 }} onClick={() => {
              setStatusOpen('private')
              setOpraData(list.filter(item => selected.includes(item.id)))
            }}>
              设为私有
            </Button>
            <Button size="small" sx={{ minWidth: 0, p: 0 }} onClick={() => {
              setMoreSummaryOpen(true)
              setOpraData(list.filter(item => selected.includes(item.id)))
            }}>
              生成摘要
            </Button>
            <Button size="small" sx={{ minWidth: 0, p: 0 }} onClick={() => {
              setDeleteOpen(true)
              setOpraData(list.filter(item => selected.includes(item.id)))
            }}>
              批量删除
            </Button>
          </Stack>
        </> : <Box sx={{ fontSize: 14, color: 'text.secondary' }} >
          全选
        </Box>}
        <Button size="small" sx={{ color: 'text.secondary', minWidth: 0, p: 0, ml: 2 }} onClick={() => {
          setSelected([])
          setBatchOpen(false)
        }}>
          取消
        </Button>
      </Stack>}
      <Stack sx={{
        height: 'calc(100vh - 148px)',
        overflow: 'hidden',
        overflowY: 'auto',
        px: 2,
      }}>
        <DragTree
          data={data}
          menu={menu}
          refresh={getData}
          selected={selected}
          onSelectChange={(value) => {
            setSelected(value)
          }}
          supportSelect={supportSelect}
        />
      </Stack>
    </Card>
    <DocDelete open={deleteOpen} onClose={() => {
      setDeleteOpen(false)
      setOpraData([])
      setSelected([])
      setBatchOpen(false)
    }} data={opraData} refresh={getData} />
    <DocAddByUrl
      type={key}
      open={urlOpen}
      onCancel={() => {
        setUrlOpen(false)
        setOpraData([])
      }}
      parentId={opraData[0]?.id}
      refresh={getData}
    />
    <Summary
      data={opraData[0]}
      kb_id={kb_id}
      open={summaryOpen}
      refresh={getData}
      onClose={() => {
        setSummaryOpen(false)
        setOpraData([])
      }}
    />
    <DocSummary
      data={opraData}
      kb_id={kb_id}
      open={moreSummaryOpen}
      refresh={getData}
      onClose={() => {
        setMoreSummaryOpen(false)
        setOpraData([])
      }}
    />
    <DocStatus
      status={statusOpen || 'public'}
      data={opraData}
      kb_id={kb_id}
      open={!!statusOpen}
      refresh={getData}
      onClose={() => {
        setStatusOpen(null)
        setOpraData([])
      }}
    />
    <VersionPublish
      open={publishOpen}
      defaultSelected={publishIds}
      onClose={() => {
        setPublishOpen(false)
        setPublishIds([])
      }}
      refresh={getData}
    />
  </>
}

export default Content