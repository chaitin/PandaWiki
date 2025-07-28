import { FeedbackListItem } from '@/api';
import {
  getApiV1KnowledgeBaseDetail,
  getApiV1Comment,
  deleteApiV1CommentList,
} from '@/request';
import NoData from '@/assets/images/nodata.png';
import { tableSx } from '@/constant/styles';
import { useURLSearchParams } from '@/hooks';
import { useAppSelector } from '@/store';
import { Box, ButtonBase, Stack } from '@mui/material';
import { Ellipsis, Table, Modal, Message } from 'ct-mui';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

const Comments = () => {
  const { kb_id = '' } = useAppSelector((state) => state.config);
  const [searchParams] = useURLSearchParams();
  const subject = searchParams.get('subject') || '';
  const remoteIp = searchParams.get('remote_ip') || '';
  const [data, setData] = useState<FeedbackListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [baseUrl, setBaseUrl] = useState('');

  const onDeleteComment = (id: string) => {
    Modal.confirm({
      title: '删除评论',
      content: '确定要删除该评论吗？',
      okText: '删除',
      okButtonProps: {
        color: 'error',
      },
      cancelButtonProps: {
        color: 'primary',
      },
      onOk: () => {
        deleteApiV1CommentList({ ids: [id] }).then(() => {
          Message.success('删除成功');
          if (page === 1) {
            getData();
          } else {
            setPage(1);
          }
        });
      },
    });
  };

  const columns = [
    {
      dataIndex: 'node_name',
      title: '文档',
      width: 300,
      render: (text: string, record: FeedbackListItem) => {
        return (
          <Ellipsis
            className='primary-color'
            sx={{ cursor: 'pointer' }}
            onClick={() => {
              window.open(`${baseUrl}/node/${record.node_id}`, '_blank');
            }}
          >
            {text}
          </Ellipsis>
        );
      },
    },
    {
      dataIndex: 'info',
      title: '姓名',
      width: 160,
      render: (text: FeedbackListItem['info']) => {
        return <Box>{text?.user_name}</Box>;
      },
    },
    {
      dataIndex: 'content',
      title: '评论内容',
      render: (text: FeedbackListItem['content']) => {
        return text;
      },
    },
    {
      dataIndex: 'ip_address',
      title: '来源 IP',
      width: 220,
      render: (ip_address: FeedbackListItem['ip_address']) => {
        const { city = '', country = '', province = '', ip } = ip_address;
        return (
          <>
            <Box>{ip}</Box>
            <Box sx={{ color: 'text.auxiliary', fontSize: 12 }}>
              {country === '中国' ? `${province}-${city}` : `${country}`}
            </Box>
          </>
        );
      },
    },
    {
      dataIndex: 'created_at',
      title: '发布时间',
      width: 220,
      render: (text: string) => {
        return dayjs(text).format('YYYY-MM-DD HH:mm:ss');
      },
    },

    {
      dataIndex: 'opt',
      title: '操作',
      width: 120,
      render: (text: string, record: FeedbackListItem) => {
        return (
          <ButtonBase
            disableRipple
            sx={{
              color: 'error.main',
            }}
            onClick={() => {
              onDeleteComment(record.id);
            }}
          >
            删除
          </ButtonBase>
        );
      },
    },
  ];

  const getData = () => {
    setLoading(true);
    getApiV1Comment({
      kb_id,
      page,
      per_page: pageSize,
    })
      .then((res) => {
        setData(res.data);
        setTotal(res.total);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    setPage(1);
  }, [subject, remoteIp, kb_id]);

  useEffect(() => {
    if (kb_id) getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, subject, remoteIp, kb_id]);

  useEffect(() => {
    if (kb_id) {
      getApiV1KnowledgeBaseDetail({ id: kb_id }).then((res) => {
        setBaseUrl(res!.access_settings!.base_url!);
      });
    }
  }, [kb_id]);

  return (
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
  );
};

export default Comments;
