import {
  getApiV1KnowledgeBaseDetail,
  getApiV1Comment,
  deleteApiV1CommentList,
  postApiV1CommentModerate,
  getApiV1AppDetail,
} from '@/request';
import {
  DomainCommentListItem,
  GithubComChaitinPandaWikiProDomainCommentStatus,
  DomainWebAppCommentSettings,
} from '@/request/types';
import NoData from '@/assets/images/nodata.png';
import { tableSx } from '@/constant/styles';
import { useURLSearchParams } from '@/hooks';
import { useAppSelector } from '@/store';
import {
  Box,
  IconButton,
  Stack,
  Menu,
  MenuItem,
  useTheme,
  alpha,
  ButtonBase,
} from '@mui/material';
import { Ellipsis, Table, Modal, Icon, Message } from 'ct-mui';
import dayjs from 'dayjs';
import { useEffect, useState, useMemo } from 'react';

// 自定义状态标签组件
const StatusTag = ({ status }: { status: number }) => {
  const theme = useTheme();
  const getStatusConfig = (status: number) => {
    switch (status) {
      case 1:
        return {
          label: '已通过',
          bgColor: alpha(theme.palette.success.main, 0.8),
          textColor: theme.palette.text.secondary,
          borderColor: alpha(theme.palette.success.main, 0.0001),
        };
      case -1:
        return {
          label: '已拒绝',
          bgColor: alpha(theme.palette.error.main, 0.8),
          textColor: theme.palette.text.secondary,
          borderColor: alpha(theme.palette.error.main, 0.0001),
        };
      case 0:
      default:
        return {
          label: '待审核',
          bgColor: '#f8f9fa',
          textColor: theme.palette.text.secondary,
          borderColor: '#dee2e6',
        };
    }
  };

  const { label, bgColor, textColor, borderColor } = getStatusConfig(status);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bgColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        padding: '2px 4px',
        fontSize: '12px',
        fontWeight: 500,
        height: '20px',
        textAlign: 'center',
      }}
    >
      {label}
    </Box>
  );
};

const ActionMenu = ({
  record,
  onDeleteComment,
  onRejectComment,
  onApproveComment,
}: {
  record: DomainCommentListItem;
  onRefreshData: () => void;
  onDeleteComment: (id: string) => void;
  onRejectComment: (id: string) => void;
  onApproveComment: (id: string) => void;
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleApprove = () => {
    onApproveComment(record.id!);
    handleClose();
  };

  const handleReject = () => {
    onRejectComment(record.id!);
    handleClose();
  };

  const handleDelete = () => {
    if (record.id) {
      onDeleteComment(record.id);
    }
    handleClose();
  };

  return (
    <>
      <IconButton size='small' onClick={handleClick}>
        <Icon type='icon-gengduo' />
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {record.status! !== 1 && (
          <MenuItem onClick={handleApprove}>通过</MenuItem>
        )}
        {record.status! !== -1 && (
          <MenuItem onClick={handleReject}>拒绝</MenuItem>
        )}
        <MenuItem color='error' onClick={handleDelete}>
          删除
        </MenuItem>
      </Menu>
    </>
  );
};

const Comments = () => {
  const { kb_id = '', license } = useAppSelector((state) => state.config);
  const [searchParams] = useURLSearchParams();
  const subject = searchParams.get('subject') || '';
  const remoteIp = searchParams.get('remote_ip') || '';
  const [data, setData] = useState<DomainCommentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [baseUrl, setBaseUrl] = useState('');

  const [appSetting, setAppSetting] =
    useState<DomainWebAppCommentSettings | null>(null);

  const isEnableReview = useMemo(() => {
    return appSetting?.moderation_enable;
  }, [appSetting]);

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

  const onRejectComment = (id: string) => {
    Modal.confirm({
      title: '拒绝评论',
      content: '确定要拒绝该评论吗？',
      okText: '拒绝',
      onOk: () => {
        postApiV1CommentModerate({
          ids: [id],
          status:
            GithubComChaitinPandaWikiProDomainCommentStatus.CommentStatusReject,
        }).then(() => {
          Message.success('拒绝成功');
          getData();
        });
      },
    });
  };

  const onApproveComment = (id: string) => {
    Modal.confirm({
      title: '通过评论',
      content: '确定要通过该评论吗？',
      okText: '通过',
      onOk: () => {
        postApiV1CommentModerate({
          ids: [id],
          status:
            GithubComChaitinPandaWikiProDomainCommentStatus.CommentStatusAccepted,
        }).then(() => {
          Message.success('通过成功');
          getData();
        });
      },
    });
  };

  const columns = [
    {
      dataIndex: 'node_name',
      title: '文档',
      width: 300,
      render: (text: string, record: DomainCommentListItem) => {
        return (
          <Ellipsis
            className='primary-color'
            sx={{ cursor: 'pointer' }}
            onClick={() => {
              if (record.node_id) {
                window.open(`${baseUrl}/node/${record.node_id}`, '_blank');
              }
            }}
          >
            {text || record.node_name || ''}
          </Ellipsis>
        );
      },
    },
    isEnableReview && {
      dataIndex: 'status',
      title: '状态',
      width: 160,
      render: (status: number) => {
        return <StatusTag status={status} />;
      },
    },
    {
      dataIndex: 'info',
      title: '姓名',
      width: 160,
      render: (text: DomainCommentListItem['info']) => {
        return <Box>{text?.user_name}</Box>;
      },
    },
    {
      dataIndex: 'content',
      title: '评论内容',
      render: (text: DomainCommentListItem['content']) => {
        return text;
      },
    },
    {
      dataIndex: 'ip_address',
      title: '来源 IP',
      width: 220,
      render: (ip_address: DomainCommentListItem['ip_address']) => {
        const {
          city = '',
          country = '',
          province = '',
          ip = '',
        } = ip_address || {};
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
        return text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '';
      },
    },

    {
      dataIndex: 'opt',
      title: '操作',
      width: 120,
      render: (text: string, record: DomainCommentListItem) => {
        return isEnableReview ? (
          <ActionMenu
            record={record}
            onDeleteComment={onDeleteComment}
            onRefreshData={getData}
            onRejectComment={onRejectComment}
            onApproveComment={onApproveComment}
          />
        ) : (
          <ButtonBase
            disableRipple
            sx={{
              color: 'error.main',
            }}
            onClick={() => {
              onDeleteComment(record.id!);
            }}
          >
            删除
          </ButtonBase>
        );
      },
    },
  ].filter(Boolean);

  const getData = () => {
    setLoading(true);
    getApiV1Comment({
      kb_id,
      page,
      per_page: pageSize,
    })
      .then((res) => {
        setData(res.data || []);
        setTotal(res.total || 0);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const getAppSetting = () => {
    getApiV1AppDetail({
      kb_id: kb_id,
      type: '1',
    }).then((res) => {
      setAppSetting(res.settings?.web_app_comment_settings || {});
    });
  };

  useEffect(() => {
    setPage(1);
  }, [subject, remoteIp, kb_id]);

  useEffect(() => {
    if (kb_id) {
      getAppSetting();
    }
  }, [kb_id]);

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

  if (!appSetting) return null;

  return (
    <Table
      // @ts-expect-error 忽略类型错误
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
