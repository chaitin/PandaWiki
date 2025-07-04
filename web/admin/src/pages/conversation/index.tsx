import { ConversationListItem, getConversationList } from "@/api"
import NoData from '@/assets/images/nodata.png'
import Card from "@/components/Card"
import { tableSx } from "@/constant/styles"
import { useURLSearchParams } from "@/hooks"
import { useAppSelector } from "@/store"
import { Box, Stack } from "@mui/material"
import { Ellipsis, Table } from "ct-mui"
import dayjs from "dayjs"
import { useEffect, useState } from "react"
import Detail from "./Detail"
import Search from "./Search"

const Conversation = () => {
  const { kb_id = '' } = useAppSelector(state => state.config)
  const [searchParams] = useURLSearchParams()
  const subject = searchParams.get('subject') || ''
  const remoteIp = searchParams.get('remote_ip') || ''
  const [data, setData] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [open, setOpen] = useState(false)
  const [id, setId] = useState('')

  const columns = [
    {
      dataIndex: 'subject',
      title: '问题',
      render: (text: string, record: ConversationListItem) => {
        return <Ellipsis className="primary-color" sx={{ cursor: 'pointer' }} onClick={() => {
          setId(record.id)
          setOpen(true)
        }}>
          {text}
        </Ellipsis>
      },
    },
    {
      dataIndex: 'app_type',
      title: '来源用户',
      width: 160,
      render: (text: number, record: ConversationListItem) => {
        const typeName = ['', 'Wiki 网站', '网页挂件', '钉钉机器人', '飞书机器人', '企业微信机器人', '企业微信客服', 'Discord 机器人']
        return <>
          <Box>匿名用户</Box>
          <Box sx={{ color: 'text.auxiliary', fontSize: 12 }}>{typeName[text] || ''}</Box>
        </>
      }
    },
    {
      dataIndex: 'remote_ip',
      title: '来源 IP',
      width: 160,
      render: (text: string, record: ConversationListItem) => {
        const { city = '', country = '', province = '' } = record.ip_address
        return <>
          <Box>{text}</Box>
          <Box sx={{ color: 'text.auxiliary', fontSize: 12 }}>{country === '中国' ? `${province}-${city}` : `${country}`}</Box>
        </>
      }
    },
    {
      dataIndex: 'created_at',
      title: '对话时间',
      width: 170,
      render: (text: string) => {
        return dayjs(text).fromNow()
      }
    },
  ]

  const getData = () => {
    setLoading(true)
    getConversationList({ page, per_page: pageSize, kb_id, subject, remote_ip: remoteIp }).then(res => {
      setData(res.data)
      setTotal(res.total)
    }).finally(() => {
      setLoading(false)
    })
  }

  useEffect(() => {
    if (kb_id) getData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, subject, remoteIp, kb_id])

  return <Card>
    <Stack direction='row' alignItems={'center'} justifyContent={'space-between'} sx={{ mb: 2, p: 2, pb: 0 }}>
      <Search />
    </Stack>
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      height="calc(100vh - 148px)"
      size='small'
      sx={{
        overflow: 'hidden',
        ...tableSx,
        '.MuiTableContainer-root': {
          height: 'calc(100vh - 148px - 70px)',
        }
      }}
      pagination={{
        total,
        page,
        pageSize,
        onChange: (page, pageSize) => {
          setPage(page)
          setPageSize(pageSize)
        },
      }}
      PaginationProps={{
        sx: {
          borderTop: '1px solid',
          borderColor: 'divider',
          p: 2,
          '.MuiSelect-root': {
            width: 100,
          }
        }
      }}
      renderEmpty={loading ? <Box></Box> : <Stack alignItems={'center'} sx={{ mt: 20 }}>
        <img src={NoData} width={174} />
        <Box>暂无数据</Box>
      </Stack>}
    />
    <Detail id={id} open={open} onClose={() => {
      setOpen(false)
    }} />
  </Card>
}

export default Conversation
