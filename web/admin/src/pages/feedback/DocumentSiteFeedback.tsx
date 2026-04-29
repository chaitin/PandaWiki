import {
  deleteApiProV1DocumentFeedback,
  getApiProV1DocumentList,
} from '@/request/pro/DocumentFeedback';
import { DomainDocumentFeedbackListItem } from '@/request/pro/types';
import { DocumentFeedbackCategory } from '@/constant/enums';
import { tableSx } from '@/constant/styles';
import { useAppSelector } from '@/store';
import {
  Box,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Ellipsis, message, Table } from '@ctzhian/ui';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';

const DocumentSiteFeedback = () => {
  const { kb_id = '' } = useAppSelector(state => state.config);
  const [filter, setFilter] = useState<'all' | 'document' | 'general'>('all');
  const [data, setData] = useState<DomainDocumentFeedbackListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const load = useCallback(async () => {
    if (!kb_id) return;
    setLoading(true);
    try {
      const body = (await getApiProV1DocumentList({
        kb_id,
        page,
        per_page: pageSize,
        ...(filter !== 'all' ? { feedback_category: filter } : {}),
      })) as {
        data?: DomainDocumentFeedbackListItem[];
        total?: number;
      };
      setData(body?.data ?? []);
      setTotal(body?.total ?? 0);
    } catch (e: unknown) {
      message.error((e as { message?: string })?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [kb_id, page, pageSize, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (id: string) => {
    try {
      await deleteApiProV1DocumentFeedback({ ids: [id] });
      message.success('已删除');
      void load();
    } catch (e: unknown) {
      message.error((e as { message?: string })?.message || '删除失败');
    }
  };

  const columns: ColumnsType<DomainDocumentFeedbackListItem> = [
    {
      dataIndex: 'feedback_category',
      title: '类型',
      width: 110,
      render: (v: string) =>
        DocumentFeedbackCategory[v as keyof typeof DocumentFeedbackCategory] ||
        v ||
        '-',
    },
    {
      title: '反馈人',
      width: 180,
      render: (_: unknown, row) => {
        const name = row.submitter_name?.trim();
        const uid = row.user_id?.trim();
        if (name) {
          return <Ellipsis sx={{ maxWidth: 168 }}>{name}</Ellipsis>;
        }
        if (uid) {
          return (
            <Ellipsis sx={{ maxWidth: 168 }} title={`会话 ID: ${uid}`}>
              访客 #{uid}
            </Ellipsis>
          );
        }
        const ip = row.remote_ip?.trim();
        return (
          <Box sx={{ color: 'text.secondary' }}>游客{ip ? ` · ${ip}` : ''}</Box>
        );
      },
    },
    {
      dataIndex: 'node_name',
      title: '关联文档',
      width: 180,
      render: (_: unknown, row) =>
        row.feedback_category === 'general' ? (
          <Box sx={{ color: 'text.secondary' }}>—</Box>
        ) : (
          <Ellipsis sx={{ maxWidth: 160 }}>
            {row.node_name || row.node_id}
          </Ellipsis>
        ),
    },
    {
      dataIndex: 'content',
      title: '内容',
      render: (t: string) => <Ellipsis sx={{ maxWidth: 420 }}>{t}</Ellipsis>,
    },
    {
      dataIndex: 'created_at',
      title: '时间',
      width: 170,
      render: (t: string) => (t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      width: 88,
      render: (_: unknown, row) => (
        <Button
          size='small'
          color='error'
          onClick={() => row.id && void onDelete(row.id)}
        >
          删除
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        sx={{ mb: 2 }}
      >
        <ToggleButtonGroup
          exclusive
          size='small'
          value={filter}
          onChange={(_, v) => v != null && setFilter(v)}
        >
          <ToggleButton value='all'>全部</ToggleButton>
          <ToggleButton value='document'>文档纠错</ToggleButton>
          <ToggleButton value='general'>站点问题</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Table
        rowKey='id'
        columns={columns}
        dataSource={data}
        size='small'
        sx={tableSx}
        pagination={{
          page,
          pageSize,
          total,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        renderEmpty={
          loading ? (
            <Box />
          ) : (
            <Stack alignItems='center' sx={{ mt: 6 }}>
              <Box color='text.secondary'>暂无数据</Box>
            </Stack>
          )
        }
      />
    </Box>
  );
};

export default DocumentSiteFeedback;
