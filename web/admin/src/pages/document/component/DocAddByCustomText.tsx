import Emoji from '@/components/Emoji';
import { DomainCreateNodeReq, V1NodeDetailResp } from '@/request';
import { postApiV1Node, putApiV1NodeDetail } from '@/request/Node';
import {
  getApiV1NodePermission,
  patchApiV1NodePermissionEdit,
} from '@/request/NodePermission';
import { getApiProV1AuthGroupList } from '@/request/pro/AuthGroup';
import type { GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem } from '@/request/pro/types';
import { ConstsNodeAccessPerm } from '@/request/types';
import { useAppSelector } from '@/store';
import { message, Modal } from '@ctzhian/ui';
import {
  Autocomplete,
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

type FormValues = {
  name: string;
  emoji: string;
  content_type: string;
  /** 仅文件夹：开放查看权限的用户组（部分开放时） */
  visible_groups: GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem[];
  /** 仅文件夹：可见性 完全开放 / 部分开放 / 完全禁止 */
  visible: ConstsNodeAccessPerm | null;
};

interface DocAddByCustomTextProps {
  open: boolean;
  data?: V1NodeDetailResp;
  autoJump?: boolean;
  onClose: () => void;
  parentId?: string;
  setDetail?: (data: V1NodeDetailResp) => void;
  refresh?: () => void;
  type?: 1 | 2;
  onCreated?: (node: {
    id: string;
    name: string;
    type: 1 | 2;
    content_type?: string;
    emoji?: string;
  }) => void;
}

const DocAddByCustomText = ({
  open,
  data,
  autoJump = true,
  parentId,
  onClose,
  refresh,
  setDetail,
  type = 2,
  onCreated,
}: DocAddByCustomTextProps) => {
  const { kb_id: id } = useAppSelector(state => state.config);
  const text = type === 1 ? '文件夹' : '文档';

  const [userGroups, setUserGroups] = useState<
    GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem[]
  >([]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      emoji: '',
      content_type: '',
      visible_groups: [],
      visible: ConstsNodeAccessPerm.NodeAccessPermOpen,
    },
  });

  const watchVisible = watch('visible');

  const handleClose = () => {
    reset();
    onClose();
  };

  const submitPermission = (
    nodeId: string,
    visible: ConstsNodeAccessPerm | null,
    visibleGroupIds: number[],
  ) => {
    if (!id) return Promise.resolve();
    return patchApiV1NodePermissionEdit({
      kb_id: id,
      ids: [nodeId],
      permissions: {
        visible: visible ?? ConstsNodeAccessPerm.NodeAccessPermOpen,
      },
      visible_groups:
        visible === ConstsNodeAccessPerm.NodeAccessPermPartial
          ? visibleGroupIds
          : [],
    });
  };

  const submit = (value: FormValues) => {
    if (data) {
      const basePromise = putApiV1NodeDetail({
        id: data.id || '',
        kb_id: id,
        name: value.name,
        emoji: value.emoji,
      });
      const permissionPromise =
        type === 1
          ? submitPermission(
              data.id || '',
              value.visible,
              (value.visible_groups || []).map(g => g.id!),
            )
          : Promise.resolve();
      Promise.all([basePromise, permissionPromise]).then(() => {
        message.success('修改成功');
        reset();
        handleClose();
        refresh?.();
        setDetail?.({
          name: value.name,
          meta: { ...data.meta, emoji: value.emoji },
          status: 1,
        });
      });
    } else {
      if (!id) return;
      const params: DomainCreateNodeReq = {
        name: value.name,
        content: '',
        kb_id: id,
        type,
        emoji: value.emoji,
        content_type: value.content_type,
      };
      if (parentId) {
        params.parent_id = parentId;
      }
      postApiV1Node(params).then(({ id: newId }) => {
        const permissionPromise =
          type === 1
            ? submitPermission(
                newId,
                value.visible,
                (value.visible_groups || []).map(g => g.id!),
              )
            : Promise.resolve();
        return permissionPromise.then(() => {
          message.success('创建成功');
          reset();
          handleClose();
          onCreated?.({
            id: newId,
            name: value.name,
            type,
            content_type: value.content_type,
            emoji: value.emoji,
          });
          if (type === 2 && autoJump) {
            window.open(`/doc/editor/${newId}`, '_blank');
          }
        });
      });
    }
  };

  useEffect(() => {
    if (!open) return;
    if (type === 1 && id) {
      getApiProV1AuthGroupList({ kb_id: id, page: 1, per_page: 9999 })
        .then(res => {
          if (res?.list) setUserGroups(res.list);
          else setUserGroups([]);
        })
        .catch(() => setUserGroups([]));
    }
    if (data) {
      reset({
        name: data.name || '',
        emoji: data.meta?.emoji || '',
        content_type: type === 1 ? '' : data.meta?.content_type || 'html',
        visible_groups: [],
        visible: ConstsNodeAccessPerm.NodeAccessPermOpen,
      });
      if (type === 1 && data.id && id) {
        getApiV1NodePermission({ kb_id: id, id: data.id }).then(res => {
          if (res?.permissions?.visible != null) {
            setValue('visible', res.permissions.visible);
          }
          const groups = (res?.visible_groups || []).map(
            (item: {
              auth_group_id?: number;
              name?: string;
              path?: string;
            }) => ({
              id: item.auth_group_id,
              path: item.path ?? item.name ?? '',
              name: item.name,
            }),
          );
          setValue('visible_groups', groups);
        });
      }
    } else {
      setValue('content_type', type === 1 ? '' : 'html');
      if (type === 1) {
        setValue('visible', ConstsNodeAccessPerm.NodeAccessPermOpen);
        setValue('visible_groups', []);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, type, open, id]);

  return (
    <Modal
      title={data ? `编辑${text}` : `创建${text}`}
      open={open}
      width={600}
      okText={data ? '保存' : '创建'}
      onCancel={handleClose}
      onOk={handleSubmit(submit)}
    >
      <Box sx={{ fontSize: 14, lineHeight: '36px' }}>{text}名称</Box>
      <Controller
        control={control}
        name='name'
        rules={{ required: `请输入${text}名称` }}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            autoFocus
            size='small'
            placeholder={`请输入${text}名称`}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
        )}
      />
      <Box sx={{ fontSize: 14, lineHeight: '36px', mt: 1 }}>{text}图标</Box>
      <Controller
        control={control}
        name='emoji'
        render={({ field }) => <Emoji {...field} type={type} />}
      />
      {type === 1 && (
        <>
          <Box sx={{ fontSize: 14, lineHeight: '36px', mt: 1 }}>
            开放查看权限
          </Box>
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
          {watchVisible === ConstsNodeAccessPerm.NodeAccessPermPartial && (
            <Box sx={{ mt: 1 }}>
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
            </Box>
          )}
        </>
      )}
      {type === 2 && !data && (
        <>
          <Box sx={{ fontSize: 14, lineHeight: '36px', mt: 1 }}>文档类型</Box>
          <Controller
            control={control}
            name='content_type'
            render={({ field }) => (
              <RadioGroup {...field} row>
                <FormControlLabel
                  value='html'
                  control={<Radio size='small' />}
                  label='富文本'
                />
                <FormControlLabel
                  value='md'
                  control={<Radio size='small' />}
                  label='Markdown'
                />
              </RadioGroup>
            )}
          />
        </>
      )}
    </Modal>
  );
};

export default DocAddByCustomText;
