import {
  createNode,
  getFeishuCloudDocs,
  getFeishuDocDetail,
  getFeishuKBDocById,
  getFeishuKnowledgeBase,
  ImportDocByFeishuFormData,
  ImportDocListItem,
  ImportDocProps,
} from '@/api';
import { useAppSelector } from '@/store';
import {
  Box,
  Button,
  Checkbox,
  Skeleton,
  Stack,
  TextField,
} from '@mui/material';
import { Ellipsis, Icon, Message, Modal } from 'ct-mui';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

const StepText = {
  pull: { okText: '拉取知识库', showCancel: true },
  import: { okText: '导入文档', showCancel: true },
  done: { okText: '完成', showCancel: false },
};

const FeishuImport = ({
  open,
  refresh,
  onCancel,
  parentId = null,
}: ImportDocProps) => {
  const { kb_id } = useAppSelector(state => state.config);

  const [step, setStep] = useState<keyof typeof StepText>('pull');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<
    { space_id: string; name: string; done: boolean; loading: boolean }[]
  >([]);
  const [items, setItems] = useState<
    (ImportDocListItem & {
      space_id: string;
      obj_token: string;
      obj_type: number;
    })[]
  >([]);
  const [selectIds, setSelectIds] = useState<string[]>([]);
  const [requestQueue, setRequestQueue] = useState<(() => Promise<any>)[]>([]);
  const [isCancelled, setIsCancelled] = useState(false);

  const {
    control,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<ImportDocByFeishuFormData>({
    defaultValues: {
      app_id: '',
      app_secret: '',
      user_access_token: '',
    },
  });

  const handleCancel = () => {
    setIsCancelled(false);
    setRequestQueue([]);
    setStep('pull');
    setItems([]);
    setSelectIds([]);
    setList([]);
    setLoading(false);
    onCancel();
    refresh?.();
  };

  const handleSelectedImportedData = async () => {
    const newQueue: (() => Promise<any>)[] = [];
    const newItems = [...items];
    setItems(
      newItems.map(it => {
        if (it.success === -1 && !it.id && selectIds.includes(it.url)) {
          return { ...it, success: 0 };
        }
        return it;
      }),
    );
    const feishuItems = newItems.filter(
      it => it.success === -1 && !it.id && selectIds.includes(it.url),
    );
    if (feishuItems.length === 0) {
      setStep('done');
      setLoading(false);
      return;
    }
    setTimeout(() => {
      for (const item of feishuItems) {
        newQueue.push(async () => {
          try {
            const res = await getFeishuDocDetail({
              sources: [
                {
                  url: item.url,
                  obj_token: item.obj_token,
                  obj_type: item.obj_type,
                },
              ],
              kb_id,
              ...getValues(),
            });
            const nodeRes = await createNode({
              name: res[0].title || item.url.toString() || '',
              content: res[0].content || '',
              parent_id: parentId,
              type: 2,
              kb_id,
            });
            Message.success(item?.title + '导入成功');
            setItems(prev => {
              const idx = prev.findIndex(it => it.url === item.url);
              if (idx === -1) {
                return prev;
              }
              return [
                ...prev.slice(0, idx),
                { ...prev[idx], ...res[0], success: 1, id: nodeRes.id },
                ...prev.slice(idx + 1),
              ];
            });
          } catch (error) {
            Message.success(item?.title + '导入失败');
          }
        });
      }
      setRequestQueue(newQueue);
    }, 0);
  };

  const onSubmit = (data: ImportDocByFeishuFormData) => {
    setLoading(true);
    Promise.all([getFeishuKnowledgeBase(data), getFeishuCloudDocs(data)])
      .then(([res1, res2]) => {
        if (res1.length > 0) {
          setList(
            res1.map(item => ({
              space_id: item.space_id,
              name: item.name,
              done: false,
              loading: false,
            })),
          );
        }
        if (res2.length > 0) {
          setItems(
            res2.map(item => ({
              title: item.name || item.url.toString(),
              content: '',
              url: item.url,
              success: -1,
              id: '',
              space_id: '',
              obj_token: item.obj_token,
              obj_type: item.obj_type,
            })),
          );
        }
        setStep('import');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleOk = () => {
    if (step === 'done') {
      handleCancel();
      return;
    }
    if (selectIds.length === 0) {
      Message.error('请选择要导入的文档');
      return;
    }
    setLoading(true);
    setIsCancelled(false);
    handleSelectedImportedData();
  };

  const renderItem = (
    item: ImportDocListItem & { space_id: string },
    idx: number,
  ) => {
    return (
      <Stack
        direction={'row'}
        alignItems={'center'}
        gap={1}
        key={item.url}
        sx={{
          px: 2,
          pl: '44px',
          py: 1,
          cursor: 'pointer',
          borderBottom: idx === items.length - 1 ? 'none' : '1px solid',
          borderColor: 'divider',
          ':hover': {
            bgcolor: 'background.paper2',
          },
        }}
      >
        {item.success === 0 ? (
          <Icon
            type='icon-shuaxin'
            sx={{
              fontSize: 18,
              color: 'text.auxiliary',
              animation: 'loadingRotate 1s linear infinite',
            }}
          />
        ) : item.id === '' ? (
          <Checkbox
            size='small'
            id={item.url}
            sx={{ flexShrink: 0, p: 0, m: 0 }}
            checked={selectIds.includes(item.url)}
            onChange={() => {
              setSelectIds(prev => {
                if (prev.includes(item.url)) {
                  return prev.filter(it => it !== item.url);
                }
                return [...prev, item.url];
              });
            }}
          />
        ) : (
          <Stack
            direction={'row'}
            justifyContent={'center'}
            alignItems={'center'}
            sx={{ flexShrink: 0, width: 20, height: 20 }}
          >
            {item.id === '-1' ? (
              <Icon
                type='icon-icon_tool_close'
                sx={{ fontSize: 18, color: 'error.main' }}
              />
            ) : (
              <Icon
                type='icon-duihao'
                sx={{ fontSize: 18, color: 'success.main' }}
              />
            )}
          </Stack>
        )}
        <Box
          component='label'
          sx={{ flexGrow: 1, cursor: 'pointer', width: 0 }}
          htmlFor={item.url}
        >
          <Ellipsis sx={{ fontSize: 14 }}>{item.title || item.url}</Ellipsis>
          {item.content && (
            <Ellipsis sx={{ fontSize: 12, color: 'text.auxiliary' }}>
              {item.content}
            </Ellipsis>
          )}
        </Box>
        {item.id === '-1' ? (
          <Button
            size='small'
            variant='outlined'
            onClick={() => {
              setItems(prev =>
                prev.map(it =>
                  it.url === item.url ? { ...it, success: 0, id: '' } : it,
                ),
              );
              createNode({
                name: item.title,
                content: item.content,
                parent_id: parentId,
                type: 2,
                kb_id,
              })
                .then(res => {
                  Message.success(item.title + '导入成功');
                  setItems(prev =>
                    prev.map(it =>
                      it.url === item.url
                        ? { ...it, success: 1, id: res.id }
                        : it,
                    ),
                  );
                })
                .catch(() => {
                  Message.error(item.title + '导入失败');
                });
            }}
          >
            重新导入
          </Button>
        ) : null}
      </Stack>
    );
  };

  const processUrl = async () => {
    if (isCancelled) {
      setItems([]);
    }
    if (requestQueue.length === 0 || isCancelled) {
      setLoading(false);
      setRequestQueue([]);
      return;
    }

    setLoading(true);
    const newQueue = [...requestQueue];
    const requests = newQueue.splice(0, 2);

    try {
      await Promise.all(requests.map(request => request()));
      if (newQueue.length > 0 && !isCancelled) {
        setRequestQueue(newQueue);
      } else {
        setLoading(false);
        setRequestQueue([]);
      }
    } catch (error) {
      console.error('请求执行出错:', error);
      if (newQueue.length > 0 && !isCancelled) {
        setRequestQueue(newQueue);
      } else {
        setLoading(false);
        setRequestQueue([]);
      }
    }
  };

  useEffect(() => {
    if (requestQueue.length > 0 && !isCancelled) {
      processUrl();
    }
    if (requestQueue.length === 0 && items.length > 0) {
      const allSuccess = items.every(
        item => item.success === 1 && item.id !== '-1' && item.id !== '',
      );
      if (allSuccess) {
        setStep('done');
      }
    }
  }, [requestQueue.length, isCancelled]);

  return (
    <Modal
      title='通过飞书文档导入'
      open={open}
      onCancel={handleCancel}
      okText={StepText[step].okText}
      showCancel={StepText[step].showCancel}
      okButtonProps={{
        loading: loading || list.some(it => it.loading),
        sx: {
          minWidth: '88px',
          width: 'auto !important',
        },
      }}
      onOk={step === 'pull' ? handleSubmit(onSubmit) : handleOk}
    >
      {step === 'pull' && (
        <Stack gap={1}>
          <Stack
            direction='row'
            alignItems={'center'}
            justifyContent={'space-between'}
            sx={{ fontSize: 14, lineHeight: '32px' }}
          >
            <Box sx={{ fontSize: 14, lineHeight: '32px' }}>
              App ID
              <Box component={'span'} sx={{ color: 'red', ml: 0.5 }}>
                *
              </Box>
            </Box>
            <Button
              size='small'
              component='a'
              href='https://pandawiki.docs.baizhi.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%E9%A3%9E%E4%B9%A6%E6%96%87%E6%A1%A3%E5%AF%BC%E5%85%A5'
              target='_blank'
            >
              使用方法
            </Button>
          </Stack>
          <Controller
            control={control}
            name='app_id'
            rules={{
              required: 'app_id',
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='> 飞书开放平台 > 凭证与基础信息 > 应用凭证 > App ID'
                onChange={e => {
                  field.onChange(e.target.value);
                }}
                error={!!errors.app_id}
                helperText={errors.app_id?.message}
              />
            )}
          />
          <Box sx={{ fontSize: 14, lineHeight: '32px' }}>
            Client Secret
            <Box component={'span'} sx={{ color: 'red', ml: 0.5 }}>
              *
            </Box>
          </Box>
          <Controller
            control={control}
            name='app_secret'
            rules={{
              required: 'app_secret',
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder='> 飞书开放平台 > 凭证与基础信息 > 应用凭证 > App Secret'
                onChange={e => {
                  field.onChange(e.target.value);
                }}
                error={!!errors.app_secret}
                helperText={errors.app_secret?.message}
              />
            )}
          />
          <Box sx={{ fontSize: 14, lineHeight: '32px' }}>
            User Access Token
            <Box component={'span'} sx={{ color: 'red', ml: 0.5 }}>
              *
            </Box>
          </Box>
          <Controller
            control={control}
            name='user_access_token'
            rules={{
              required: 'user_access_token',
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder=''
                onChange={e => {
                  field.onChange(e.target.value);
                }}
                error={!!errors.user_access_token}
                helperText={errors.user_access_token?.message}
              />
            )}
          />
        </Stack>
      )}
      {step !== 'pull' && (
        <Box
          sx={{
            cursor: 'pointer',
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'divider',
            maxHeight: 'calc(100vh - 300px)',
            overflowX: 'hidden',
            overflowY: 'auto',
          }}
        >
          {['import'].includes(step) && items.length > 0 && (
            <Stack
              direction={'row'}
              alignItems={'center'}
              gap={1}
              component={'label'}
              htmlFor='feishu-all-select-checkbox'
              sx={{
                px: 2,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
              }}
            >
              <Checkbox
                size='small'
                sx={{ flexShrink: 0, p: 0, m: 0 }}
                id='feishu-all-select-checkbox'
                checked={selectIds.length === items.length}
                onChange={() => {
                  if (selectIds.length === items.length) {
                    setSelectIds([]);
                  } else {
                    setSelectIds(items.map(item => item.url));
                  }
                }}
              />
              <Box sx={{ fontSize: 14 }}>全选</Box>
            </Stack>
          )}
          <Stack>
            {list.map((item, idx) => (
              <Box key={item.space_id}>
                <Stack
                  component={'label'}
                  htmlFor={`feishu-space-${item.space_id}-select-checkbox`}
                  direction={'row'}
                  alignItems={'center'}
                  justifyContent={'space-between'}
                  gap={1}
                  sx={{
                    px: 2,
                    cursor: 'pointer',
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper2',
                  }}
                >
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={1}
                    sx={{ fontSize: 14, flex: 1 }}
                  >
                    <Checkbox
                      size='small'
                      id={`feishu-space-${item.space_id}-select-checkbox`}
                      sx={{ flexShrink: 0, p: 0, m: 0 }}
                      disabled={
                        items.filter(it => it.space_id === item.space_id)
                          .length === 0
                      }
                      checked={
                        items.filter(it => it.space_id === item.space_id)
                          .length > 0 &&
                        items
                          .filter(it => it.space_id === item.space_id)
                          .every(it => selectIds.includes(it.url))
                      }
                      onChange={() => {
                        const spaceItems = items.filter(
                          it => it.space_id === item.space_id,
                        );
                        const spaceUrls = spaceItems.map(it => it.url);
                        const isAll = spaceItems.every(it =>
                          selectIds.includes(it.url),
                        );
                        if (isAll) {
                          setSelectIds(
                            selectIds.filter(it => !spaceUrls.includes(it)),
                          );
                        } else {
                          setSelectIds([
                            ...new Set([...selectIds, ...spaceUrls]),
                          ]);
                        }
                      }}
                    />
                    <Icon
                      type='icon-wenjianjia'
                      sx={{ fontSize: 14, flexShrink: 0, width: 20 }}
                    />
                    <Ellipsis
                      sx={{ fontSize: 14, width: 0, flex: 1, fontWeight: 500 }}
                    >
                      {item.name}
                    </Ellipsis>
                  </Stack>
                  {!item.done && (
                    <Button
                      size='small'
                      sx={{ p: 0, minWidth: 0, flexShrink: 0, height: 21 }}
                      onClick={event => {
                        event.stopPropagation();
                        setList(prev =>
                          prev.map(it =>
                            it.space_id === item.space_id
                              ? { ...it, loading: true }
                              : it,
                          ),
                        );
                        getFeishuKBDocById({
                          space_id: item.space_id,
                          ...getValues(),
                        })
                          .then(res => {
                            setItems(prev => [
                              ...prev,
                              ...(res || []).map(it => ({
                                title: it.title,
                                content: '',
                                url: it.url,
                                success: -1 as const,
                                id: '',
                                space_id: item.space_id,
                                obj_token: it.obj_token,
                                obj_type: it.obj_type,
                              })),
                            ]);
                            if ((res || []).length > 0) setStep('import');
                            setList(prev =>
                              prev.map(it =>
                                it.space_id === item.space_id
                                  ? { ...it, loading: false, done: true }
                                  : it,
                              ),
                            );
                          })
                          .finally(() => {
                            setList(prev =>
                              prev.map(it =>
                                it.space_id === item.space_id
                                  ? { ...it, loading: false }
                                  : it,
                              ),
                            );
                          });
                      }}
                    >
                      拉取文档
                    </Button>
                  )}
                </Stack>
                {item.loading && (
                  <Stack
                    direction={'row'}
                    alignItems={'center'}
                    gap={1}
                    sx={{
                      px: 2,
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Stack
                      direction={'row'}
                      justifyContent={'center'}
                      alignItems={'center'}
                      sx={{ flexShrink: 0, width: 20, height: 20 }}
                    >
                      <Icon
                        type='icon-shuaxin'
                        sx={{
                          fontSize: 18,
                          color: 'text.auxiliary',
                          animation: 'loadingRotate 1s linear infinite',
                        }}
                      />
                    </Stack>
                    <Box component='label' sx={{ flexGrow: 1 }}>
                      <Skeleton variant='text' width={200} height={21} />
                      <Skeleton variant='text' height={18} />
                    </Box>
                  </Stack>
                )}
                {items.filter(it => it.space_id === item.space_id).length > 0
                  ? items
                      .filter(it => it.space_id === item.space_id)
                      .map((it, idx) => renderItem(it, idx))
                  : item.done && (
                      <Box
                        sx={{
                          fontSize: 12,
                          py: 1,
                          textAlign: 'center',
                          color: 'text.auxiliary',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        知识库为空
                      </Box>
                    )}
              </Box>
            ))}
            <Stack
              direction={'row'}
              alignItems={'center'}
              justifyContent={'space-between'}
              gap={1}
              component={'label'}
              htmlFor='feishu-cloud-select-checkbox'
              sx={{
                cursor: 'pointer',
                pl: 2,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper2',
              }}
            >
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{ fontSize: 14, flex: 1 }}
              >
                <Checkbox
                  size='small'
                  sx={{ flexShrink: 0, p: 0, m: 0 }}
                  id='feishu-cloud-select-checkbox'
                  disabled={items.filter(it => it.space_id === '').length === 0}
                  checked={
                    items.filter(it => it.space_id === '').length > 0 &&
                    items
                      .filter(it => it.space_id === '')
                      .every(it => selectIds.includes(it.url))
                  }
                  onChange={() => {
                    const spaceItems = items.filter(it => it.space_id === '');
                    const spaceUrls = spaceItems.map(it => it.url);
                    const isAll = spaceItems.every(it =>
                      selectIds.includes(it.url),
                    );
                    if (isAll) {
                      setSelectIds(
                        selectIds.filter(it => !spaceUrls.includes(it)),
                      );
                    } else {
                      setSelectIds([...new Set([...selectIds, ...spaceUrls])]);
                    }
                  }}
                />
                <Icon
                  type='icon-yunpan'
                  sx={{ fontSize: 20, flexShrink: 0, color: 'primary.main' }}
                />
                <Ellipsis
                  sx={{ fontSize: 14, width: 0, flex: 1, fontWeight: 500 }}
                >
                  飞书云盘
                </Ellipsis>
              </Stack>
            </Stack>
            {items.filter(it => it.space_id === '').length > 0 ? (
              items
                .filter(it => it.space_id === '')
                .map((it, idx) => renderItem(it, idx))
            ) : (
              <Box
                sx={{
                  fontSize: 12,
                  py: 1,
                  textAlign: 'center',
                  color: 'text.auxiliary',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                暂无数据
              </Box>
            )}
          </Stack>
        </Box>
      )}
    </Modal>
  );
};

export default FeishuImport;
