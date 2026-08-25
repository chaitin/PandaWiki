import { ReleaseListItem } from '@/api';
import { getApiV1KnowledgeBaseReleaseList } from '@/request/KnowledgeBase';
import { DomainKBReleaseListItemResp } from '@/request/types';
import NoData from '@/assets/images/nodata.png';
import Card from '@/components/Card';
import { tableSx } from '@/constant/styles';
import { useAppSelector } from '@/store';
import { Box, Button, Stack } from '@mui/material';
import { Table } from '@ctzhian/ui';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import VersionDelete from './components/VersionDelete';
import VersionPublish from './components/VersionPublish';
import VersionReset from './components/VersionReset';

const Release = () => {
  const { kb_id } = useAppSelector(state => state.config);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [curData, setCurData] = useState<any>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [curVersionId, setCurVersionId] = useState('');

  const [data, setData] = useState<DomainKBReleaseListItemResp[]>([]);

  const columns = [
    {
      dataIndex: 'tag',
      title: '版本号',
      render: (text: string, record: ReleaseListItem) => {
        return (
          <Stack direction={'row'} alignItems={'center'} gap={1}>
            <Box>{text}</Box>
            {curVersionId === record.id && (
              <Box
                sx={{
                  fontSize: 12,
                  lineHeight: '16px',
                  border: '1px solid',
                  borderColor: 'success.main',
                  borderRadius: 1,
                  px: 0.5,
                  color: 'success.main',
                }}
              >
                当前版本
              </Box>
            )}
          </Stack>
        );
      },
    },
    {
      dataIndex: 'message',
      title: '备注',
    },
    {
      dataIndex: 'publisher_account',
      title: '发布者',
    },
    {
      dataIndex: 'created_at',
      title: '发布时间',
      width: 120,
      render: (text: string) => {
        return dayjs(text).fromNow();
      },
    },
    {
      dataIndex: 'action',
      title: '操作',
      width: 120,
      render: (text: string, record: ReleaseListItem) => {
        return (
          <Stack direction={'row'} gap={2}>
            <Button
              sx={{ minWidth: 0, p: 0 }}
              size='small'
              onClick={() => {
                setCurData(record);
                setResetOpen(true);
              }}
            >
              回滚
            </Button>
            <Button
              sx={{ minWidth: 0, p: 0 }}
              size='small'
              color='error'
              disabled={curVersionId === record.id}
              onClick={() => {
                setCurData(record);
                setDeleteOpen(true);
              }}
            >
              删除
            </Button>
          </Stack>
        );
      },
    },
  ];

  const getData = () => {
    setLoading(true);
    // @ts-expect-error 类型错误
    getApiV1KnowledgeBaseReleaseList({ kb_id, page, per_page: pageSize })
      .then(res => {
        // httpClient 拦截器已解包 success.data，res 即 { list, total }
        const list = res?.list || [];
        setData(list);
        setTotal(res?.total || 0);
        if (list.length > 0 && page === 1) setCurVersionId(list[0].id!);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (kb_id) getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, kb_id]);

  return (
    <Card>
      <Stack
        direction={'row'}
        alignItems={'center'}
        justifyContent={'space-between'}
        sx={{ p: 2, pl: 3 }}
      >
        <Box sx={{ color: 'text.tertiary', fontSize: 14 }}>
          共
          <Box
            component='span'
            sx={{ color: 'text.primary', mx: 0.5, fontWeight: 700 }}
          >
            {total}
          </Box>
          个历史版本
        </Box>
        <Button
          variant='contained'
          size='small'
          onClick={() => setPublishOpen(true)}
        >
          发布新版本
        </Button>
      </Stack>
      <Table
        columns={columns}
        dataSource={data}
        rowKey='id'
        height='calc(100vh - 144px)'
        size='small'
        sx={{
          overflow: 'hidden',
          ...tableSx,
          '.MuiTableContainer-root': {
            height: 'calc(100vh - 144px - 70px)',
          },
        }}
        pagination={{
          total,
          page,
          pageSize,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
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
      <VersionDelete
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        data={curData}
      />
      <VersionReset
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        data={curData}
      />
      <VersionPublish
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        refresh={getData}
      />
    </Card>
  );
};

export default Release;
