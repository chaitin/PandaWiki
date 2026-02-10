import { useEffect, useState } from 'react';
import { SettingCardItem } from '../Common';
import { Modal, message } from '@ctzhian/ui';
import { Box } from '@mui/material';
import { postApiProV1AuthGroupSync } from '@/request/pro/AuthOrg';
import {
  GithubComChaitinPandaWikiProApiAuthV1AuthItem,
  ConstsSourceType,
  GithubComChaitinPandaWikiProApiAuthV1AuthGroupTreeItem,
} from '@/request/pro/types';
import UserGroupModal from '../UserGroupModal';
import { useAppSelector } from '@/store';
import {
  getApiProV1AuthGroupTree,
  patchApiProV1AuthGroupMove,
  deleteApiProV1AuthGroupDelete,
} from '@/request/pro/AuthGroup';
import GroupTree from './GroupTree';
import { BUSINESS_VERSION_PERMISSION } from '@/constant/version';

interface UserGroupProps {
  enabled: string;
  memberList: GithubComChaitinPandaWikiProApiAuthV1AuthItem[];
  sourceType: ConstsSourceType;
  getAuth: () => void;
}

const UserGroup = ({
  enabled,
  memberList,
  sourceType,
  getAuth,
}: UserGroupProps) => {
  const { license, kb_id } = useAppSelector(state => state.config);
  const [userGroupModalOpen, setUserGroupModalOpen] = useState(false);
  const [userGroupModalType, setUserGroupModalType] = useState<'add' | 'edit'>(
    'add',
  );
  const [syncLoading, setSyncLoading] = useState(false);
  const [userGroupModalData, setUserGroupModalData] =
    useState<GithubComChaitinPandaWikiProApiAuthV1AuthGroupTreeItem>();
  const [userGroupTree, setUserGroupTree] = useState<
    GithubComChaitinPandaWikiProApiAuthV1AuthGroupTreeItem[]
  >([]);

  const onDeleteUserGroup = (id: number) => {
    Modal.confirm({
      title: '删除用户组',
      content: '确定要删除该用户组吗？',
      okButtonProps: {
        color: 'error',
      },
      onOk: () => {
        deleteApiProV1AuthGroupDelete({
          id,
          kb_id,
        }).then(() => {
          message.success('删除成功');
          getUserGroup();
        });
      },
    });
  };

  const getUserGroup = () => {
    getApiProV1AuthGroupTree({ kb_id }).then(res => {
      setUserGroupTree(res?.list || []);
    });
  };
  useEffect(() => {
    if (
      !kb_id ||
      enabled !== '2' ||
      !BUSINESS_VERSION_PERMISSION.includes(license.edition!)
    )
      return;
    getUserGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kb_id, enabled, license.edition!]);

  const handleMove = async ({
    id,
    newParentId,
    prev_id,
    next_id,
  }: {
    id: number;
    newParentId?: number;
    prev_id?: number;
    next_id?: number;
  }) => {
    await patchApiProV1AuthGroupMove({
      id,
      kb_id,
      parent_id: newParentId,
      prev_id,
      next_id,
    });
    getUserGroup();
  };

  const handleSync = () => {
    Modal.confirm({
      title: '同步组织架构和成员',
      content: '确定要同步组织架构和成员吗？',
      onOk: async () => {
        setSyncLoading(true);
        await postApiProV1AuthGroupSync({
          kb_id,
          source_type: sourceType as unknown as 'dingtalk' | 'wecom',
        })
          .then(() => {
            message.success('同步成功');
            getUserGroup();
            getAuth();
          })
          .finally(() => {
            setSyncLoading(false);
          });
      },
    });
  };

  return (
    <SettingCardItem title='用户组' permission={BUSINESS_VERSION_PERMISSION}>
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: '10px',
          p: 1,
          maxHeight: 400,
          overflow: 'auto',
        }}
      >
        <GroupTree
          data={userGroupTree.filter(it => !it.sync_id)}
          onMove={handleMove}
          onDelete={onDeleteUserGroup}
          onClickMembers={item => {
            setUserGroupModalData({
              id: item.id,
              name: item.name,
              auth_ids: item.auth_ids,
              sync_id: item.sync_id,
            });
            setUserGroupModalOpen(true);
            setUserGroupModalType('edit');
          }}
          onEdit={(item, type) => {
            setUserGroupModalData({
              id: item.id,
              name: item.name,
              auth_ids: item.auth_ids,
              sync_id: item.sync_id,
            });
            setUserGroupModalOpen(true);
            setUserGroupModalType(type);
          }}
        />
        <GroupTree
          data={userGroupTree.filter(it => it.sync_id)}
          sync
          onSync={handleSync}
          onClickMembers={item => {
            setUserGroupModalData({
              id: item.id,
              name: item.name,
              auth_ids: item.auth_ids,
              sync_id: item.sync_id,
            });
          }}
        />
      </Box>
      <UserGroupModal
        open={userGroupModalOpen}
        onCancel={() => {
          setUserGroupModalOpen(false);
          setUserGroupModalData(undefined);
        }}
        onOk={() => {
          getUserGroup();
          setUserGroupModalOpen(false);
          setUserGroupModalData(undefined);
        }}
        userList={memberList}
        data={userGroupModalData}
        type={userGroupModalType}
      />
    </SettingCardItem>
  );
};

export default UserGroup;
