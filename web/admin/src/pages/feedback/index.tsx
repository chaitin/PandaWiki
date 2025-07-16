import { ConversationListItem, getConversationList } from '@/api'
import Logo from '@/assets/images/logo.png'
import NoData from '@/assets/images/nodata.png'
import Card from '@/components/Card'
import { AppType, FeedbackType } from '@/constant/enums'
import { tableSx } from '@/constant/styles'
import { useURLSearchParams } from '@/hooks'
import { useAppSelector } from '@/store'
import { Box, Button, ButtonBase, Stack, Tooltip } from '@mui/material'
import { Ellipsis, Icon, Table, CusTabs } from 'ct-mui'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import Detail from './Detail'

const Feedback = () => {
  const { kb_id = '' } = useAppSelector((state) => state.config)
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

  const [tab, setTab] = useState('feedback')

  const columns = [
    {
      dataIndex: 'subject',
      title: '文档',
      render: (text: string, record: ConversationListItem) => {
        return (
          <Ellipsis
            className='primary-color'
            sx={{ cursor: 'pointer', flex: 1, width: 0 }}
            onClick={() => {
              setId(record.id)
              setOpen(true)
            }}
          >
            {text}
          </Ellipsis>
        )
      },
    },
    {
      dataIndex: 'feedback_info',
      title: '姓名',
      width: 160,
    },
    {
      dataIndex: 'info',
      title: '评论内容',
      width: 200,
      render: (text: ConversationListItem['info']) => {
        const user = text?.user_info
        return (
          <Box sx={{ fontSize: 12 }}>
            <Stack
              direction={'row'}
              alignItems={'center'}
              gap={0.5}
              sx={{ cursor: 'pointer' }}
            >
              <img src={user?.avatar || Logo} width={16} />
              <Box sx={{ fontSize: 14 }}>
                {user?.real_name || user?.name || '匿名用户'}
              </Box>
            </Stack>
            {user?.email && (
              <Box sx={{ color: 'text.auxiliary' }}>{user?.email}</Box>
            )}
          </Box>
        )
      },
    },

    {
      dataIndex: 'created_at',
      title: '发布时间',
      width: 120,
      render: (text: string) => {
        return dayjs(text).fromNow()
      },
    },

    {
      dataIndex: 'opt',
      title: '操作',
      width: 120,
      render: (text: string) => {
        return (
          <ButtonBase
            disableRipple
            sx={{
              color: 'error.main',
            }}
          >
            删除
          </ButtonBase>
        )
      },
    },
  ]

  const getData = () => {
    setLoading(true)
    getConversationList({
      page,
      per_page: pageSize,
      kb_id,
      subject,
      remote_ip: remoteIp,
    })
      .then((res) => {
        setData(res.data)
        setTotal(res.total)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    setPage(1)
  }, [subject, remoteIp, kb_id])

  useEffect(() => {
    if (kb_id) getData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, subject, remoteIp, kb_id])

  return (
    <Card>
      <Stack
        direction='row'
        alignItems={'center'}
        justifyContent={'space-between'}
        sx={{ p: 2 }}
      >
        <CusTabs
          value={tab}
          onChange={(value) => {
            setTab(value as string)
          }}
          size='small'
          list={[
            { label: 'AI 问答评价', value: 'ai_feedback', disabled: true },
            { label: '文档评论', value: 'feedback' },
            { label: '文档纠错', value: 'correction', disabled: true },
          ]}
        />
      </Stack>
      <Table
        columns={columns}
        dataSource={data}
        rowKey='id'
        height='calc(100vh - 148px)'
        size='small'
        sx={{
          overflow: 'hidden',
          ...tableSx,
          '.MuiTableContainer-root': {
            height: 'calc(100vh - 148px - 70px)',
          },
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
            },
          },
        }}
        renderEmpty={
          loading ? (
            <Box></Box>
          ) : (
            <Stack alignItems={'center'} sx={{ mt: 20 }}>
              <img src={NoData} width={174} />
              <Box>暂无数据</Box>
            </Stack>
          )
        }
      />
      <Detail
        id={id}
        open={open}
        onClose={() => {
          setOpen(false)
        }}
      />
    </Card>
  )
}

export default Feedback
