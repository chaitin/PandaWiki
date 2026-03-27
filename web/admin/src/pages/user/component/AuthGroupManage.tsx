import NoData from '@/assets/images/nodata.png';
import { tableSx } from '@/constant/styles';
import { Table } from '@ctzhian/ui';
import { ColumnType } from '@ctzhian/ui/dist/Table';
import {
  Box,
  Button,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import { getApiV1UserAuthGroupList } from '@/request/User';
import AuthGroupAdd from './AuthGroupAdd';
import AuthGroupUpdate from './AuthGroupUpdate';
import AuthGroupDelete from './AuthGroupDelete';

interface AuthGroup {
  id: number;
  name: string;
  kb_id: string;
  parent_id?: number;
  position: number;
  auth_ids: number[];
  user_ids: string[];
  created_at: string;
  updated_at: string;
}

const AuthGroupManage = () => {
  const { kbList } = useAppSelector(state => state.config);
  const [selectedKbId, setSelectedKbId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [groupList, setGroupList] = useState<AuthGroup[]>([]);
  const [curGroup, setCurGroup] = useState<AuthGroup | null>(null);
  const [curType, setCurType] = useState<'delete' | 'update' | null>(null);

  useEffect(() => {
    if (kbList && kbList.length > 0 && !selectedKbId) {
      setSelectedKbId(kbList[0].id);
    }
  }, [kbList, selectedKbId]);

  useEffect(() => {
    if (selectedKbId) {
      getData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKbId]);

  const getData = () => {
    if (!selectedKbId) return;
    setLoading(true);
    getApiV1UserAuthGroupList({ kb_id: selectedKbId })
      .then((data: any) => {
        const res = data?.groups || [];
        setGroupList(res);
      })
      .catch((err: any) => {
        console.error('获取用户组列表失败:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const columns: ColumnType<AuthGroup>[] = [
    {
      title: '用户组名称',
      dataIndex: 'name',
      render: (text: string) => <Box>{text}</Box>,
    },
    {
      title: '知识库',
      dataIndex: 'kb_id',
      render: (kbId: string) => {
        const kb = kbList?.find(k => k.id === kbId);
        return <Box>{kb?.name || kbId}</Box>;
      },
    },
    {
      title: '成员数量',
      dataIndex: 'user_ids',
      render: (userIds: string[]) => <Box>{userIds?.length || 0}</Box>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      render: (text: string) => (
        <Box>{text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'}</Box>
      ),
    },
    {
      title: '',
      dataIndex: 'action',
      width: 140,
      render: (_, record) => (
        <Stack direction={'row'} gap={2}>
          <Button
            size='small'
            sx={{ p: 0, minWidth: 'auto' }}
            color='primary'
            onClick={() => {
              setCurGroup(record);
              setCurType('update');
            }}
          >
            编辑
          </Button>
          <Button
            size='small'
            color='error'
            sx={{ p: 0, minWidth: 'auto' }}
            onClick={() => {
              setCurGroup(record);
              setCurType('delete');
            }}
          >
            删除
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ px: 2 }}>
      <Stack
        direction={'row'}
        justifyContent={'space-between'}
        alignItems={'center'}
        sx={{ mb: 2 }}
      >
        <FormControl size='small' sx={{ minWidth: 200 }}>
          <InputLabel>选择知识库</InputLabel>
          <Select
            value={selectedKbId}
            label='选择知识库'
            onChange={e => setSelectedKbId(e.target.value)}
          >
            {kbList?.map(kb => (
              <MenuItem key={kb.id} value={kb.id}>
                {kb.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <AuthGroupAdd refresh={getData} kbId={selectedKbId} />
      </Stack>
      <Table
        columns={columns}
        dataSource={groupList}
        rowKey='id'
        size='small'
        updateScrollTop={false}
        height='calc(100vh - 300px)'
        sx={{ overflow: 'hidden', ...tableSx }}
        pagination={false}
        renderEmpty={
          loading ? (
            <Box></Box>
          ) : (
            <Stack alignItems={'center'}>
              <img src={NoData} width={150} />
              <Box
                sx={{
                  fontSize: 12,
                  lineHeight: '20px',
                  color: 'text.tertiary',
                }}
              >
                暂无数据
              </Box>
            </Stack>
          )
        }
      />
      {curGroup && curType === 'update' && (
        <AuthGroupUpdate
          group={curGroup}
          refresh={getData}
          onClose={() => {
            setCurType(null);
            setCurGroup(null);
          }}
        />
      )}
      <AuthGroupDelete
        open={!!curGroup && curType === 'delete'}
        onClose={() => {
          setCurType(null);
          setCurGroup(null);
        }}
        group={curGroup}
        refresh={getData}
      />
    </Box>
  );
};

export default AuthGroupManage;
