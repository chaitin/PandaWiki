import { Form, FormItem } from '@/pages/setting/component/Common';
import {
  getApiV1NodePermission,
  patchApiV1NodePermissionEdit,
} from '@/request/NodePermission';
import { getApiProV1AuthGroupList } from '@/request/pro/AuthGroup';
import type { GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem } from '@/request/pro/types';
import { ConstsNodeAccessPerm } from '@/request/types';
import { Modal, message } from '@ctzhian/ui';
import {
  Autocomplete,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

export interface FolderPermissionModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  nodeId: string;
  nodeName?: string;
  kbId: string;
}

type FormValues = {
  visible: ConstsNodeAccessPerm | null;
  visible_groups: GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem[];
};

const FolderPermissionModal = ({
  open,
  onCancel,
  onSuccess,
  nodeId,
  nodeName,
  kbId,
}: FolderPermissionModalProps) => {
  const [userGroups, setUserGroups] = useState<
    GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem[]
  >([]);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, setValue, reset, watch } = useForm<FormValues>(
    {
      defaultValues: {
        visible: ConstsNodeAccessPerm.NodeAccessPermOpen,
        visible_groups: [],
      },
    },
  );

  const watchVisible = watch('visible');

  useEffect(() => {
    if (!open || !nodeId || !kbId) return;
    getApiProV1AuthGroupList({ kb_id: kbId, page: 1, per_page: 9999 })
      .then(res => {
        if (res?.list) setUserGroups(res.list);
        else setUserGroups([]);
      })
      .catch(() => setUserGroups([]));

    getApiV1NodePermission({ kb_id: kbId, id: nodeId }).then(res => {
      if (res?.permissions?.visible != null) {
        setValue('visible', res.permissions.visible);
      }
      const groups = (res?.visible_groups || []).map(
        (item: { auth_group_id?: number; name?: string; path?: string }) => ({
          id: item.auth_group_id,
          path: item.path ?? item.name ?? '',
          name: item.name,
        }),
      );
      setValue('visible_groups', groups);
    });
  }, [open, nodeId, kbId, setValue]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = handleSubmit(values => {
    setLoading(true);
    patchApiV1NodePermissionEdit({
      kb_id: kbId,
      ids: [nodeId],
      permissions: {
        visible: values.visible ?? ConstsNodeAccessPerm.NodeAccessPermOpen,
      },
      visible_groups:
        values.visible === ConstsNodeAccessPerm.NodeAccessPermPartial
          ? (values.visible_groups || []).map(g => g.id!)
          : [],
    })
      .then(() => {
        message.success('保存成功');
        onSuccess();
        onCancel();
      })
      .finally(() => setLoading(false));
  });

  return (
    <Modal
      title={`编辑开放权限${nodeName ? `：${nodeName}` : ''}`}
      open={open}
      onCancel={onCancel}
      width={480}
      okButtonProps={{ loading: loading }}
      onOk={onSubmit}
    >
      <Form labelWidth={100} gap={3}>
        <FormItem label='开放查看权限' required>
          <Controller
            control={control}
            name='visible'
            render={({ field }) => (
              <RadioGroup row {...field} sx={{ gap: 2 }}>
                <FormControlLabel
                  value={ConstsNodeAccessPerm.NodeAccessPermOpen}
                  control={<Radio size='small' />}
                  label='完全开放'
                />
                <FormControlLabel
                  value={ConstsNodeAccessPerm.NodeAccessPermPartial}
                  control={<Radio size='small' />}
                  label='部分开放'
                />
                <FormControlLabel
                  value={ConstsNodeAccessPerm.NodeAccessPermClosed}
                  control={<Radio size='small' />}
                  label='完全禁止'
                />
              </RadioGroup>
            )}
          />
        </FormItem>
        {watchVisible === ConstsNodeAccessPerm.NodeAccessPermPartial && (
          <FormItem label='可见用户组'>
            <Controller
              control={control}
              name='visible_groups'
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  fullWidth
                  multiple
                  options={userGroups}
                  getOptionLabel={option => option.path ?? option.name ?? ''}
                  onChange={(_, value) => field.onChange(value)}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={params => (
                    <TextField
                      {...params}
                      size='small'
                      placeholder='选择可查看此文件夹的用户组'
                    />
                  )}
                />
              )}
            />
          </FormItem>
        )}
      </Form>
    </Modal>
  );
};

export default FolderPermissionModal;
