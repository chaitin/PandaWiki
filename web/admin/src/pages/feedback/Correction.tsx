import { getApiV1KnowledgeBaseDetail } from '@/request';

import {
  deleteApiProV1DocumentFeedback,
  getApiProV1DocumentList,
  DomainDocumentFeedbackListItem,
} from '@/request/pro';
import NoData from '@/assets/images/nodata.png';
import { tableSx } from '@/constant/styles';
import { useAppSelector } from '@/store';
import { Box, Stack, ButtonBase, IconButton } from '@mui/material';
import { Ellipsis, Table, Modal, Icon, Message } from 'ct-mui';
import dayjs from 'dayjs';
import { useEffect, useState, useMemo } from 'react';

const Correction = () => {
  const { kb_id = '', license } = useAppSelector(state => state.config);
  const [data, setData] = useState<DomainDocumentFeedbackListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [baseUrl, setBaseUrl] = useState('');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const handleImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewImage('');
  };

  const onDeleteComment = (id: string) => {
    Modal.confirm({
      title: '删除反馈',
      content: '确定要删除该反馈吗？',
      okText: '删除',
      okButtonProps: {
        color: 'error',
      },
      cancelButtonProps: {
        color: 'primary',
      },
      onOk: () => {
        deleteApiProV1DocumentFeedback({ ids: [id] }).then(() => {
          Message.success('删除成功');
          if (page === 1) {
            getData({});
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
      render: (text: string, record: DomainDocumentFeedbackListItem) => {
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
    {
      dataIndex: 'content',
      title: '引用内容',
      render: (text: DomainDocumentFeedbackListItem['content']) => {
        return <Ellipsis>{text}</Ellipsis>;
      },
    },
    {
      dataIndex: 'correction_suggestion',
      title: '建议',
      render: (
        text: DomainDocumentFeedbackListItem['correction_suggestion'],
      ) => {
        return <Ellipsis>{text}</Ellipsis>;
      },
    },
    {
      dataIndex: 'info',
      title: '截图',
      width: 160,
      render: (text: DomainDocumentFeedbackListItem['info']) => {
        if (!text?.screen_shot) return '-';
        return (
          <Box
            component='img'
            src={text?.screen_shot}
            width={100}
            sx={{
              cursor: 'pointer',
              borderRadius: 1,
              maxWidth: 100,
              maxHeight: 60,
              objectFit: 'contain',
            }}
            onClick={() =>
              text.screen_shot && handleImagePreview(text.screen_shot)
            }
            alt='反馈截图'
          />
        );
      },
    },
    {
      dataIndex: 'ip_address',
      title: '来源 IP',
      width: 220,
      render: (ip_address: DomainDocumentFeedbackListItem['ip_address']) => {
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
      title: '时间',
      width: 220,
      render: (text: string) => {
        return text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '';
      },
    },

    {
      dataIndex: 'opt',
      title: '操作',
      width: 120,
      render: (text: string, record: DomainDocumentFeedbackListItem) => {
        return (
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

  const getData = ({
    paramKbId,
    paramPage,
    paramPageSize,
  }: {
    paramKbId?: string;
    paramPage?: number;
    paramPageSize?: number;
  }) => {
    setLoading(true);
    getApiProV1DocumentList({
      kb_id: paramKbId || kb_id,
      page: paramPage || page,
      per_page: paramPageSize || pageSize,
    })
      .then(res => {
        setData(res.data || []);
        setTotal(res.total || 0);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!kb_id) return;
    setPage(1);
    getData({
      paramPage: 1,
      paramKbId: kb_id,
    });
  }, [kb_id]);

  useEffect(() => {
    if (kb_id) {
      getApiV1KnowledgeBaseDetail({ id: kb_id }).then(res => {
        if (res.access_settings?.base_url) {
          setBaseUrl(res!.access_settings!.base_url!);
        } else {
          let defaultUrl: string = '';
          const host = res.access_settings?.hosts?.[0] || '';
          if (!host) return;

          if (
            res.access_settings?.ssl_ports &&
            res.access_settings?.ssl_ports.length > 0
          ) {
            defaultUrl = res.access_settings.ssl_ports.includes(443)
              ? `https://${host}`
              : `https://${host}:${res.access_settings.ssl_ports[0]}`;
          } else if (
            res.access_settings?.ports &&
            res.access_settings?.ports.length > 0
          ) {
            defaultUrl = res.access_settings.ports.includes(80)
              ? `http://${host}`
              : `http://${host}:${res.access_settings.ports[0]}`;
          }
          setBaseUrl(defaultUrl);
        }
      });
    }
  }, [kb_id]);

  return (
    <>
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
            getData({
              paramPage: page,
              paramPageSize: pageSize,
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

      {/* 图片预览模态框 */}
      <Modal
        title='图片预览'
        open={showPreview}
        onCancel={handleClosePreview}
        footer={null}
        width={800}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            minHeight: '50vh',
            borderRadius: 1,
          }}
        >
          {previewImage && (
            <img
              src={previewImage}
              alt='预览图片'
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 4,
              }}
            />
          )}
        </Box>
      </Modal>
    </>
  );
};

export default Correction;
