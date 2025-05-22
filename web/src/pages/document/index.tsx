import { createDoc, DocListFilterData, DocListItem, getDocDetail, getDocList } from "@/api"
import NoData from '@/assets/images/nodata.png'
import Card from "@/components/Card"
import { tableSx } from "@/constant/styles"
import { useURLSearchParams } from "@/hooks"
import { useAppSelector } from "@/store"
import { Box, IconButton, Stack } from "@mui/material"
import { Ellipsis, Icon, MenuSelect, Message, Table } from "ct-mui"
import dayjs from "dayjs"
import { useCallback, useEffect, useRef, useState } from "react"
import DocAdd from "./component/DocAdd"
import DocAddByCustomText from "./component/DocAddByCustomText"
import DocDelete from "./component/DocDelete"
import DocSearch from "./component/DocSearch"
const Content = () => {
  const { kb_id } = useAppSelector(state => state.config)

  const timer = useRef<NodeJS.Timeout>(null)

  const [searchParams] = useURLSearchParams()
  const search = searchParams.get('search') || ''

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DocListItem[]>([])
  const [opraData, setOpraData] = useState<DocListItem | null>(null)
  const [delOpen, setDelOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)

  const columns = [
    {
      dataIndex: 'title',
      title: '标题',
      render: (text: string, record: DocListItem) => {
        return <Stack direction={'row'} alignItems={'center'} gap={1} className="primary-color"
          onClick={() => window.open(`/doc/editor/${record.id}`, '_blank')}
        >
          <Icon type='icon-bangzhuwendang1' sx={{ fontSize: 18, color: '#2f80f7' }} />
          <Ellipsis sx={{ cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {text || record.url || '-'}
          </Ellipsis>
        </Stack>
      },
    },
    {
      dataIndex: 'updated_at',
      title: '更新时间',
      width: 150,
      render: (text: string) => {
        return <Box>{dayjs(text).format('YYYY-MM-DD HH:mm')}</Box>
      }
    },
    {
      dataIndex: 'opra',
      width: 80,
      title: '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: any, record: DocListItem) => {
        return <MenuSelect list={[
          {
            key: 'copy',
            label: '复制',
            onClick: () => {
              getDocDetail({ doc_id: record.id }).then(res => {
                if (kb_id) {
                  createDoc({ title: record.title + ' [副本]', content: res.content, kb_id: kb_id, source: 3 }).then((res) => {
                    Message.success('复制成功')
                    getData()
                    window.open(`/doc/editor/${res.ids[0]}`, '_blank')
                  })
                }
              })
            }
          },
          {
            key: 'rename',
            label: '重命名',
            onClick: () => {
              setRenameOpen(true)
              setOpraData(record)
            }
          },
          {
            key: 'delete',
            label: '删除',
            onClick: () => {
              setDelOpen(true)
              setOpraData(record)
            }
          }
        ]} context={<IconButton size="small"><Icon type='icon-gengduo' /></IconButton>} />
      },
    },
  ]

  const getData = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setLoading(true)
    const params: DocListFilterData = { kb_id }
    if (search) params.search = search
    getDocList(params).then(res => {
      setData(res)
      const waitReq = res.some(it => (it.status === 1))
      if (waitReq) {
        timer.current = setTimeout(() => getData(), 3000)
      }
    }).finally(() => {
      setLoading(false)
    })
  }, [search, kb_id])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        getData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [getData]);

  useEffect(() => {
    if (kb_id) getData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, kb_id])

  return <>
    <Card>
      <Stack direction={'row'} alignItems={'center'} justifyContent={'space-between'} sx={{ p: 2 }}  >
        <DocSearch />
        <DocAdd refresh={getData} />
      </Stack>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        height="calc(100vh - 148px)"
        size='small'
        updateScrollTop={false}
        sx={{ overflow: 'hidden', ...tableSx }}
        pagination={false}
        renderEmpty={loading ? <Box></Box> : <Stack alignItems={'center'} sx={{ mt: 20 }}>
          <img src={NoData} width={174} />
          <Box>暂无数据</Box>
        </Stack>}
      />
    </Card>
    <DocAddByCustomText open={renameOpen} onClose={() => {
      setRenameOpen(false)
      setOpraData(null)
    }} data={opraData} refresh={getData} />
    <DocDelete open={delOpen} onClose={() => {
      setDelOpen(false)
      setOpraData(null)
    }} data={opraData} refresh={getData} />
  </>
}

export default Content