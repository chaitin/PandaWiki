import Card from '@/components/Card';
import DragTree from '@/components/Drag/DragTree';
import { Form, FormItem } from '@/pages/setting/component/Common';
import {
  getApiV1NodeDetail,
  getApiV1NodeList,
  postApiV1NodeSummary,
  putApiV1NodeDetail,
} from '@/request/Node';
import {
  getApiV1NodePermission,
  patchApiV1NodePermissionEdit,
} from '@/request/NodePermission';
import { getApiProV1AuthGroupList } from '@/request/pro/AuthGroup';
import {
  CategoryPromptItem,
  getApiV1CategoryPrompts,
} from '@/request/CategoryPrompt';
import {
  GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem,
  GithubComChaitinPandaWikiProApiAuthV1AuthGroupListResp,
} from '@/request/pro/types';
import {
  ConstsNodeAccessPerm,
  DomainNodeListItemResp,
  DomainNodeType,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { convertToTree } from '@/utils/drag';
import { filterEmptyFolders } from '@/utils/tree';
import { Modal, message } from '@ctzhian/ui';
import {
  Autocomplete,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
  styled,
} from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { BUSINESS_VERSION_PERMISSION } from '@/constant/version';
import { VersionCanUse } from '@/components/VersionMask';
import { IconShuaxin } from '@panda-wiki/icons';

interface DocPropertiesModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  isBatch?: boolean;
  data: DomainNodeListItemResp[];
}

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
    label: (
      <Stack direction={'row'} alignItems={'center'}>
        <span>部分开放</span>
        <VersionCanUse permission={BUSINESS_VERSION_PERMISSION} />
      </Stack>
    ),
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
  const [categoryItems, setCategoryItems] = useState<CategoryPromptItem[]>([]);
  const [inWorkModeDir, setInWorkModeDir] = useState(false);
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
      perm: null as ConstsNodeAccessPerm | null,
      summary: '',
      perm_groups:
        [] as GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem[],
      work_mode_category: '' as string,
      work_mode_attributes: {} as Record<string, string>,
    },
  });

  const watchPerm = watch('perm');
  const watchCategory = watch('work_mode_category');
  const watchAttrs = watch('work_mode_attributes');

  const splitCommaAttrs = (raw?: string): string[] => {
    if (!raw) return [];
    return raw
      .replace(/\uff0c/g, ',')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  };

  const currentCategory = useMemo(
    () =>
      categoryItems.find(c => c.name.trim() === (watchCategory || '').trim()),
    [categoryItems, watchCategory],
  );
  const currentAttrKeys = useMemo(
    () => splitCommaAttrs(currentCategory?.attributes),
    [currentCategory],
  );
  const isSingleDoc =
    !isBatch && data?.[0]?.type === DomainNodeType.NodeTypeDocument;
  const showWorkMode = isSingleDoc && inWorkModeDir;

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
    const permValue = values.perm as ConstsNodeAccessPerm;
    const groupIds = isBusiness
      ? values.perm_groups.map(item => item.id!)
      : undefined;

    let workModePayload: {
      work_mode_category?: string;
      attributes?: Record<string, string>;
    } = {};
    if (showWorkMode) {
      const cat = (values.work_mode_category || '').trim();
      const cleanAttrs: Record<string, string> = {};
      const allowed = new Set(currentAttrKeys);
      Object.entries(values.work_mode_attributes || {}).forEach(([k, v]) => {
        if (!allowed.has(k)) return;
        const sv = (v || '').trim();
        if (sv !== '') cleanAttrs[k] = sv;
      });
      workModePayload = {
        work_mode_category: cat,
        attributes: cleanAttrs,
      };
    }

    Promise.all([
      patchApiV1NodePermissionEdit({
        kb_id: kb_id!,
        ids: data
          .filter(item => item.type === DomainNodeType.NodeTypeDocument)
          .map(item => item.id!),
        permissions: {
          answerable: permValue,
          visitable: permValue,
          visible: permValue,
        },
        answerable_groups: groupIds,
        visitable_groups: groupIds,
        visible_groups: groupIds,
      }),

      !isBatch
        ? putApiV1NodeDetail({
            id: data[0].id!,
            name: values.name,
            summary: values.summary,
            kb_id: kb_id!,
            ...workModePayload,
          })
        : undefined,
    ]).then(() => {
      message.success('编辑成功');
      onOk();
    });
  });

  const isBusiness = useMemo(() => {
    return true;
  }, [license]);

  const tree = filterEmptyFolders(convertToTree(data));

  useEffect(() => {
    if (open && data) {
      if (isBusiness) {
        getApiProV1AuthGroupList({
          kb_id: kb_id!,
          page: 1,
          per_page: 9999,
        })
          .then(res => {
            // 后端返回的数据结构是 { data: { list: [...] } }
            const responseData:
              | GithubComChaitinPandaWikiProApiAuthV1AuthGroupListResp
              | undefined = res;
            if (responseData?.list) {
              setUserGroups(responseData.list);
            } else {
              setUserGroups([]);
            }
          })
          .catch(err => {
            console.error('获取用户组列表失败:', err);
            setUserGroups([]);
          });
      }
      if (isBatch) return;
      setValue('name', data[0].name!);
      setValue('summary', data[0].summary!);
      setValue('work_mode_category', '');
      setValue('work_mode_attributes', {});
      setInWorkModeDir(false);

      getApiV1NodePermission({
        kb_id: kb_id!,
        id: data[0].id!,
      }).then(res => {
        const permissions = res.permissions!;
        if (permissions) {
          setValue('perm', permissions.answerable!);
        }
        setValue(
          'perm_groups',
          (res.answerable_groups || []).map((item: any) => ({
            id: item.auth_group_id,
            path: item.path || item.name,
          })),
        );
      });

      // 仅文档节点考虑工作模式属性维护
      if (data[0].type === DomainNodeType.NodeTypeDocument) {
        getApiV1CategoryPrompts({ id: kb_id! })
          .then(res => setCategoryItems(res?.items || []))
          .catch(() => setCategoryItems([]));

        getApiV1NodeDetail({ kb_id: kb_id!, id: data[0].id! })
          .then(res => {
            const meta = res?.meta || {};
            setValue('work_mode_category', meta.work_mode_category || '');
            setValue('work_mode_attributes', { ...(meta.attributes || {}) });
          })
          .catch(() => {
            setValue('work_mode_category', '');
            setValue('work_mode_attributes', {});
          });

        getApiV1NodeList({ kb_id: kb_id! })
          .then(list => {
            const byId = new Map<string, DomainNodeListItemResp>();
            (list || []).forEach(n => {
              if (n.id) byId.set(n.id, n);
            });
            let cur: DomainNodeListItemResp | undefined = byId.get(data[0].id!);
            let pid = cur?.parent_id;
            const seen = new Set<string>();
            let hit = false;
            while (pid && !seen.has(pid)) {
              seen.add(pid);
              const p = byId.get(pid);
              if (!p) break;
              if (p.work_mode_directory) {
                hit = true;
                break;
              }
              pid = p.parent_id;
            }
            setInWorkModeDir(hit);
          })
          .catch(() => setInWorkModeDir(false));
      }
    }
  }, [open, data, isBusiness, kb_id, isBatch, setValue]);

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
              p: 2,
              maxHeight: '300px',
              overflowY: 'auto',
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
        <FormItem label='开放权限' sx={{ mt: isBatch ? 2 : 0 }}>
          <Controller
            name='perm'
            control={control}
            render={({ field }) => (
              <RadioGroup row {...field} sx={{ gap: 2 }}>
                {PER_OPTIONS.map(option => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio size='small' />}
                    label={option.label}
                    disabled={
                      !isBusiness &&
                      option.value ===
                        ConstsNodeAccessPerm.NodeAccessPermPartial
                    }
                  />
                ))}
              </RadioGroup>
            )}
          />
        </FormItem>
        {watchPerm === ConstsNodeAccessPerm.NodeAccessPermPartial && (
          <FormItem label='允许的用户组'>
            <Controller
              name='perm_groups'
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  fullWidth
                  multiple
                  options={userGroups}
                  getOptionLabel={option => option.path!}
                  onChange={(_, value) => field.onChange(value)}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={params => (
                    <TextField {...params} placeholder='选择允许的用户组' />
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
                      <IconShuaxin
                        sx={{
                          fontSize: '16px !important',
                          ...(loading
                            ? { animation: 'loadingRotate 1s linear infinite' }
                            : {}),
                        }}
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

        {showWorkMode && (
          <FormItem label='工作模式识别' sx={{ alignItems: 'flex-start' }}>
            <Stack sx={{ flex: 1 }} gap={2}>
              <Box>
                <Typography variant='caption' color='text.secondary'>
                  本文档位于「工作模式」检索目录下。请选择品类并按属性逐项填值，前台问答将优先按结构化属性精确匹配；为空时回退按摘要做语义判别。
                </Typography>
              </Box>
              <Controller
                name='work_mode_category'
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    size='small'
                    displayEmpty
                    value={field.value || ''}
                    onChange={e => {
                      field.onChange(e.target.value);
                      setValue('work_mode_attributes', {});
                    }}
                  >
                    <MenuItem value=''>
                      <em>未指定品类</em>
                    </MenuItem>
                    {categoryItems
                      .filter(c => (c.name || '').trim() !== '')
                      .map(c => (
                        <MenuItem key={c.id || c.name} value={c.name}>
                          {c.name}
                        </MenuItem>
                      ))}
                  </Select>
                )}
              />
              {watchCategory && currentAttrKeys.length === 0 && (
                <Typography variant='caption' color='warning.main'>
                  品类「{watchCategory}
                  」暂未在「提示词管理」中配置属性维护，无法填写属性。
                </Typography>
              )}
              {watchCategory && currentAttrKeys.length > 0 && (
                <Stack gap={1.5}>
                  {currentAttrKeys.map(attrKey => (
                    <TextField
                      key={attrKey}
                      label={attrKey}
                      size='small'
                      value={watchAttrs?.[attrKey] ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setValue('work_mode_attributes', {
                          ...(watchAttrs || {}),
                          [attrKey]: v,
                        });
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          </FormItem>
        )}
      </Form>
    </Modal>
  );
};

export default DocPropertiesModal;
