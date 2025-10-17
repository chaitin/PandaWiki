import { useEffect, useState, useMemo } from 'react';
import { Form, FormItem } from '@/pages/setting/component/Common';
import { Modal, Icon, message } from '@ctzhian/ui';
import { GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem } from '@/request/pro/types';
import { DomainNodeListItemResp, DomainNodeType } from '@/request/types';
import Card from '@/components/Card';
import DragTree from '@/components/Drag/DragTree';
import dayjs from 'dayjs';
import {
  RadioGroup,
  Radio,
  TextField,
  styled,
  Stack,
  Button,
  Autocomplete,
  Box,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { FormControlLabel } from '@mui/material';
import { ConstsNodeAccessPerm } from '@/request/types';
import { postApiV1NodeSummary, putApiV1NodeDetail } from '@/request/Node';
import { getApiProV1AuthGroupList } from '@/request/pro/AuthGroup';
import { convertToTree } from '@/utils/drag';
import { filterEmptyFolders } from '@/utils/tree';
import {
  getApiV1NodePermission,
  patchApiV1NodePermissionEdit,
} from '@/request/NodePermission';
import { useAppSelector } from '@/store';

interface DocPropertiesModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  isBatch?: boolean;
  data: DomainNodeListItemResp[];
}

const tips = '(企业版可用)';

const StyledText = styled('div')(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: 16,
}));

const PER_OPTIONS = [
  {
    label: '完全开放',
    value: ConstsNodeAccessPerm.NodeAccessPermOpen,
  },
  {
    label: '部分开放',
    value: ConstsNodeAccessPerm.NodeAccessPermPartial,
  },
  {
    label: '完全禁止',
    value: ConstsNodeAccessPerm.NodeAccessPermClosed,
  },
];

const DocPropertiesModal = ({
  open,
  onCancel,
  data,
  onOk,
  isBatch = false,
}: DocPropertiesModalProps) => {
  const { kb_id, license } = useAppSelector(state => state.config);
  const [loading, setLoading] = useState(false);
  const [userGroups, setUserGroups] = useState<
    GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem[]
  >([]);
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      name: '',
      answerable: null as ConstsNodeAccessPerm | null,
      visitable: null as ConstsNodeAccessPerm | null,
      visible: null as ConstsNodeAccessPerm | null,
      summary: '',
      answerable_groups:
        [] as GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem[],
      visitable_groups:
        [] as GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem[],
      visible_groups:
        [] as GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem[],
    },
  });

  const watchAnswerable = watch('answerable');
  const watchVisitable = watch('visitable');
  const watchVisible = watch('visible');

  const onGenerateSummary = () => {
    setLoading(true);
    postApiV1NodeSummary({
      ids: [data[0].id!],
      kb_id: kb_id!,
    })
      .then(res => {
        // @ts-expect-error 类型不匹配
        setValue('summary', res.summary);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const onSubmit = handleSubmit(values => {
    Promise.all([
      patchApiV1NodePermissionEdit({
        kb_id: kb_id!,
        ids: data
          .filter(item => item.type === DomainNodeType.NodeTypeDocument)
          .map(item => item.id!),
        permissions: {
          answerable: values.answerable as ConstsNodeAccessPerm,
          visitable: values.visitable as ConstsNodeAccessPerm,
          visible: values.visible as ConstsNodeAccessPerm,
        },
        answerable_groups: isEnterprise
          ? values.answerable_groups.map(item => item.id!)
          : undefined,
        visitable_groups: isEnterprise
          ? values.visitable_groups.map(item => item.id!)
          : undefined,
        visible_groups: isEnterprise
          ? values.visible_groups.map(item => item.id!)
          : undefined,
      }),

      !isBatch
        ? putApiV1NodeDetail({
            id: data[0].id!,
            name: values.name,
            summary: values.summary,
            kb_id: kb_id!,
          })
        : undefined,
    ]).then(() => {
      message.success('编辑成功');
      onOk();
    });
  });

  const isEnterprise = useMemo(() => {
    return license.edition === 2;
  }, [license]);

  const tree = filterEmptyFolders(convertToTree(data));

  useEffect(() => {
    if (open && data) {
      if (isEnterprise) {
        getApiProV1AuthGroupList({
          kb_id: kb_id!,
          page: 1,
          per_page: 9999,
        }).then(res => {
          setUserGroups(res.list || []);
        });
      }
      if (isBatch) return;
      setValue('name', data[0].name!);
      setValue('summary', data[0].summary!);
      getApiV1NodePermission({
        kb_id: kb_id!,
        id: data[0].id!,
      }).then(res => {
        const permissions = res.permissions!;
        if (permissions) {
          setValue('answerable', permissions.answerable!);
          setValue('visitable', permissions.visitable!);
          setValue('visible', permissions.visible!);
        }
        setValue(
          'answerable_groups',
          (res.answerable_groups || []).map((item: any) => ({
            id: item.auth_group_id,
            path: item.path || item.name,
          })),
        );
        setValue(
          'visitable_groups',
          (res.visitable_groups || []).map((item: any) => ({
            id: item.auth_group_id,
            path: item.path || item.name,
          })),
        );
        setValue(
          'visible_groups',
          (res.visible_groups || []).map((item: any) => ({
            id: item.auth_group_id,
            path: item.path || item.name,
          })),
        );
      });
    }
  }, [open, data, isEnterprise]);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open]);

  return (
    <Modal
      title={isBatch ? '批量设置权限' : '文档属性'}
      open={open}
      onCancel={onCancel}
      width={700}
      okButtonProps={{
        loading: loading,
      }}
      onOk={onSubmit}
    >
      {isBatch && (
        <>
          <Box sx={{ fontSize: 14, mb: 1, color: 'text.secondary' }}>
            已选中
            <Box
              component={'span'}
              sx={{ fontWeight: 700, color: 'primary.main', px: 0.5 }}
            >
              {
                data.filter(
                  item => item.type === DomainNodeType.NodeTypeDocument,
                ).length
              }
            </Box>
            个文档，设置权限
          </Box>
          <Card
            sx={{
              py: 1,
              bgcolor: 'background.paper3',
              '& .dndkit-drag-handle': {
                top: '-2px !important',
              },
            }}
          >
            <DragTree data={tree} readOnly={true} supportSelect={false} />
          </Card>
        </>
      )}

      <Form labelWidth={100} gap={3}>
        {!isBatch && (
          <>
            <FormItem label='文档名称' required>
              <Controller
                name='name'
                control={control}
                rules={{ required: '文档名称不能为空' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message as string}
                  />
                )}
              />
            </FormItem>
            <FormItem label='创建时间'>
              <StyledText>
                {data?.[0]?.created_at
                  ? dayjs(data[0].created_at).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </StyledText>
            </FormItem>
            <FormItem label='创建者'>
              <StyledText>{data?.[0]?.creator}</StyledText>
            </FormItem>
            <FormItem label='修改时间'>
              <StyledText>
                {data?.[0]?.updated_at
                  ? dayjs(data[0].updated_at).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </StyledText>
            </FormItem>
            <FormItem label='修改者'>
              <StyledText>{data?.[0]?.editor}</StyledText>
            </FormItem>
          </>
        )}
        <FormItem label='可被问答' sx={{ mt: isBatch ? 2 : 0 }}>
          <Controller
            name='answerable'
            control={control}
            render={({ field }) => (
              <RadioGroup row {...field}>
                {PER_OPTIONS.map(option => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio size='small' />}
                    label={
                      option.label +
                      (!isEnterprise &&
                      option.value ===
                        ConstsNodeAccessPerm.NodeAccessPermPartial
                        ? tips
                        : '')
                    }
                    disabled={
                      !isEnterprise &&
                      option.value ===
                        ConstsNodeAccessPerm.NodeAccessPermPartial
                    }
                  />
                ))}
              </RadioGroup>
            )}
          />
        </FormItem>
        {watchAnswerable === ConstsNodeAccessPerm.NodeAccessPermPartial && (
          <FormItem label=' '>
            <Controller
              name='answerable_groups'
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  fullWidth
                  multiple
                  options={userGroups}
                  getOptionLabel={option => option.path!}
                  onChange={(_, value) => {
                    field.onChange(value);
                  }}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={params => (
                    <TextField {...params} placeholder='可被问答的用户组' />
                  )}
                />
              )}
            />
          </FormItem>
        )}

        <FormItem label='可被访问'>
          <Controller
            name='visitable'
            control={control}
            render={({ field }) => (
              <RadioGroup row {...field}>
                {PER_OPTIONS.map(option => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio size='small' />}
                    label={
                      option.label +
                      (!isEnterprise &&
                      option.value ===
                        ConstsNodeAccessPerm.NodeAccessPermPartial
                        ? tips
                        : '')
                    }
                    disabled={
                      !isEnterprise &&
                      option.value ===
                        ConstsNodeAccessPerm.NodeAccessPermPartial
                    }
                  />
                ))}
              </RadioGroup>
            )}
          />
        </FormItem>
        {watchVisitable === ConstsNodeAccessPerm.NodeAccessPermPartial && (
          <FormItem label=' '>
            <Controller
              name='visitable_groups'
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  fullWidth
                  multiple
                  options={userGroups}
                  getOptionLabel={option => option.path!}
                  onChange={(_, value) => {
                    field.onChange(value);
                  }}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={params => (
                    <TextField {...params} placeholder='可被访问的用户组' />
                  )}
                />
              )}
            />
          </FormItem>
        )}

        <FormItem label='导航内可见'>
          <Controller
            name='visible'
            control={control}
            render={({ field }) => (
              <RadioGroup row {...field}>
                {PER_OPTIONS.map(option => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio size='small' />}
                    label={
                      option.label +
                      (!isEnterprise &&
                      option.value ===
                        ConstsNodeAccessPerm.NodeAccessPermPartial
                        ? tips
                        : '')
                    }
                    disabled={
                      !isEnterprise &&
                      option.value ===
                        ConstsNodeAccessPerm.NodeAccessPermPartial
                    }
                  />
                ))}
              </RadioGroup>
            )}
          />
        </FormItem>
        {watchVisible === ConstsNodeAccessPerm.NodeAccessPermPartial && (
          <FormItem label=' '>
            <Controller
              name='visible_groups'
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  fullWidth
                  multiple
                  options={userGroups}
                  getOptionLabel={option => option.path!}
                  onChange={(_, value) => {
                    field.onChange(value);
                  }}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={params => (
                    <TextField {...params} placeholder='导航内可见的用户组' />
                  )}
                />
              )}
            />
          </FormItem>
        )}

        {!isBatch && (
          <FormItem label='内容摘要' sx={{ alignItems: 'flex-start' }}>
            <Controller
              name='summary'
              control={control}
              render={({ field }) => (
                <Stack sx={{ flex: 1 }} alignItems='flex-start'>
                  <TextField
                    {...field}
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message as string}
                    multiline
                    minRows={4}
                  />
                  <Button
                    sx={{ minWidth: 'auto', mt: 1 }}
                    onClick={onGenerateSummary}
                    disabled={loading}
                    startIcon={
                      <Icon
                        type='icon-shuaxin'
                        sx={
                          loading
                            ? { animation: 'loadingRotate 1s linear infinite' }
                            : {}
                        }
                      />
                    }
                  >
                    AI 生成
                  </Button>
                </Stack>
              )}
            />
          </FormItem>
        )}
      </Form>
    </Modal>
  );
};

export default DocPropertiesModal;
