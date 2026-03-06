import Logo from '@/assets/images/logo.png';
import Card from '@/components/Card';
import { tableSx } from '@/constant/styles';
import { Ellipsis, message, Modal, Table } from '@ctzhian/ui';
import type { ColumnType } from '@ctzhian/ui/dist/Table';
import { Box, Chip, Stack, TextField } from '@mui/material';
import { styled } from '@mui/material/styles';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import DocModal from './DocModal';
import VersionMask from '@/components/VersionMask';
import { PROFESSION_VERSION_PERMISSION } from '@/constant/version';

import { useURLSearchParams } from '@/hooks';
import {
  getApiProV1ContributeList,
  postApiProV1ContributeAudit,
} from '@/request/pro/Contribute';
import {
  ConstsContributeStatus,
  ConstsContributeType,
  GithubComChaitinPandaWikiProApiContributeV1ContributeItem,
} from '@/request/pro/types';
import { useAppSelector } from '@/store';
import ContributePreviewModal from './ContributePreviewModal';
import MarkdownPreviewModal from './MarkdownPreviewModal';

const StyledSearchRow = styled(Stack)(({ theme }) => ({
  padding: theme.spacing(2),
  gap: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
}));

const statusColorMap = {
  [ConstsContributeStatus.ContributeStatusApproved]: {
    label: '已采纳',
    color: 'success',
  },
  [ConstsContributeStatus.ContributeStatusRejected]: {
    label: '已拒绝',
    color: 'error',
  },
  [ConstsContributeStatus.ContributeStatusPending]: {
    label: '等待处理',
    color: 'warning',
  },
} as const;

export default function ContributionPage() {
  const {
    kb_id = '',
    nav_id = '',
    license,
  } = useAppSelector(state => state.config);
  const [searchParams, setSearchParams] = useURLSearchParams();
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('page_size') || '20');
  const nodeNameParam = searchParams.get('node_name') || '';
  const authNameParam = searchParams.get('auth_name') || '';
  const [searchDoc, setSearchDoc] = useState(nodeNameParam);
  const [searchUser, setSearchUser] = useState(authNameParam);
  const [data, setData] = useState<
    GithubComChaitinPandaWikiProApiContributeV1ContributeItem[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const [docModalOpen, setDocModalOpen] = useState(false);

  const [previewRow, setPreviewRow] =
    useState<GithubComChaitinPandaWikiProApiContributeV1ContributeItem | null>(
      null,
    );
  const [open, setOpen] = useState(false);

  const closeDialog = () => {
    setOpen(false);
    setPreviewRow(null);
  };

  const handleDocModalOk = (params: { nav_id: string; parent_id: string }) => {
    setDocModalOpen(false);
    setPreviewRow(null);
    postApiProV1ContributeAudit({
      id: previewRow!.id!,
      kb_id,
      nav_id: params.nav_id,
      parent_id: params.parent_id,
      status: 'approved',
    }).then(() => {
      getData();
      closeDialog();
      message.success('采纳成功');
    });
  };

  const handleAccept = () => {
    if (previewRow?.type === ConstsContributeType.ContributeTypeAdd) {
      setDocModalOpen(true);
    } else {
      Modal.confirm({
        title: '采纳',
        content: '确定要采纳该修改吗？',
        okText: '采纳',
        onOk: () => {
          postApiProV1ContributeAudit({
            id: previewRow!.id!,
            kb_id,
            nav_id,
            status: 'approved',
          }).then(() => {
            getData();
            closeDialog();
            message.success('采纳成功');
          });
        },
      });
    }
  };
  const handleReject = () => {
    Modal.confirm({
      title: '拒绝',
      content: '确定要拒绝该修改吗？',
      okText: '拒绝',
      onOk: () => {
        postApiProV1ContributeAudit({
          id: previewRow!.id!,
          kb_id,
          nav_id,
          status: 'rejected',
        }).then(() => {
          getData();
          closeDialog();
          message.success('拒绝成功');
        });
      },
    });
  };

  const columns: ColumnType<GithubComChaitinPandaWikiProApiContributeV1ContributeItem>[] =
    [
      {
        dataIndex: 'node_name',
        title: '文档',
        width: 280,
        render: (text: string, record) => {
          return (
            <Stack direction='row' alignItems='center' gap={1}>
              <Box
                sx={{
                  transform: 'scale(0.85)',
                  fontSize: 12,
                  color: 'light.main',
                  p: '2px 4px',
                  borderRadius: 1,
                  flexShrink: 0,
                  lineHeight: 1,
                  bgcolor:
                    record.type !== ConstsContributeType.ContributeTypeAdd
                      ? 'error.main'
                      : 'info.main',
                }}
              >
                {record.type === ConstsContributeType.ContributeTypeAdd
                  ? '新增'
                  : '编辑'}
              </Box>

              <Ellipsis
                className='primary-color'
                sx={{ cursor: 'pointer' }}
                onClick={() => {
                  setPreviewRow(record);
                  setOpen(true);
                }}
              >
                {text || record.node_name || ''}
              </Ellipsis>
            </Stack>
          );
        },
      },
      {
        dataIndex: 'reason',
        title: '更新说明',
        render: (text: string) => {
          return <>{text || '-'}</>;
        },
      },
      {
        dataIndex: 'auth_name',
        title: '用户',
        width: 160,
        render: (text: string, record) => {
          return (
            <Box sx={{ fontSize: 12 }}>
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={0.5}
                sx={{ cursor: 'pointer' }}
              >
                {/* @ts-expect-error 类型不匹配 */}
                <img src={record?.avatar || Logo} width={16} />
                <Box sx={{ fontSize: 14 }}>{text || '匿名用户'}</Box>
              </Stack>
            </Box>
          );
        },
      },
      {
        dataIndex: 'remote_ip',
        title: '来源 IP',
        width: 200,
        render: (text: string, record) => {
          const { city = '', country = '', province = '' } = record.ip_address!;
          return (
            <>
              <Box>{text}</Box>
              <Box sx={{ color: 'text.tertiary', fontSize: 12 }}>
                {country === '中国' ? `${province}-${city}` : `${country}`}
              </Box>
            </>
          );
        },
      },
      {
        dataIndex: 'created_at',
        title: '时间',
        width: 180,
        render: (text: string, record) => {
          return (
            <Stack>
              <Box>{dayjs(text).fromNow()}</Box>
              <Box sx={{ fontSize: 12, color: 'text.tertiary' }}>
                {dayjs(text).format('YYYY-MM-DD HH:mm:ss')}
              </Box>
            </Stack>
          );
        },
      },
      {
        dataIndex: 'status',
        title: '操作选项',
        width: 120,
        render: (text, record) => {
          const s =
            statusColorMap[record.status as keyof typeof statusColorMap];
          return record.status !==
            ConstsContributeStatus.ContributeStatusPending ? (
            <Chip
              label={s.label}
              color={s.color}
              variant='outlined'
              size='small'
              onClick={() => {
                setPreviewRow(record);
                setOpen(true);
              }}
              sx={{ cursor: 'pointer' }}
            />
          ) : (
            <Box
              sx={{ color: 'info.main', cursor: 'pointer' }}
              onClick={() => {
                setPreviewRow(record);
                setOpen(true);
              }}
            >
              {s.label}
            </Box>
          );
        },
      },
    ];

  const getData = () => {
    setLoading(true);
    getApiProV1ContributeList({
      page,
      per_page: pageSize,
      kb_id,
      node_name: nodeNameParam,
      auth_name: authNameParam,
    })
      .then(res => {
        setData(res.list || []);
        setTotal(res.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (kb_id && PROFESSION_VERSION_PERMISSION.includes(license.edition!))
      getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, nodeNameParam, authNameParam, kb_id, license.edition]);

  return (
    <Card>
      <VersionMask permission={PROFESSION_VERSION_PERMISSION}>
        <Stack
          direction='row'
          alignItems={'center'}
          justifyContent={'space-between'}
          sx={{ p: 2 }}
        >
          <StyledSearchRow direction='row' sx={{ p: 0, flex: 1 }}>
            <TextField
              fullWidth
              size='small'
              label='文档'
              value={searchDoc}
              onKeyUp={e => {
                if (e.key === 'Enter') {
                  setSearchParams({ node_name: searchDoc || '', page: '1' });
                }
              }}
              onBlur={e => {
                setSearchParams({ node_name: e.target.value, page: '1' });
              }}
              onChange={e => setSearchDoc(e.target.value)}
              sx={{ width: 200 }}
            />
            <TextField
              fullWidth
              size='small'
              label='用户'
              value={searchUser}
              onKeyUp={e => {
                if (e.key === 'Enter') {
                  setSearchParams({ auth_name: searchUser || '', page: '1' });
                }
              }}
              onBlur={e => {
                setSearchParams({ auth_name: e.target.value, page: '1' });
              }}
              onChange={e => setSearchUser(e.target.value)}
              sx={{ width: 200 }}
            />
          </StyledSearchRow>
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
              setSearchParams({
                page: String(page),
                page_size: String(pageSize),
              });
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
        />

        {previewRow?.meta?.content_type === 'md' ? (
          <MarkdownPreviewModal
            open={open}
            row={previewRow}
            onClose={closeDialog}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        ) : (
          <ContributePreviewModal
            open={open}
            row={previewRow}
            onClose={closeDialog}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}
        <DocModal
          open={docModalOpen}
          onClose={() => setDocModalOpen(false)}
          onOk={handleDocModalOk}
        />
      </VersionMask>
    </Card>
  );
}
