import {
  createNode,
  getNotionIntegration,
  getNotionIntegrationDetail,
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

const StepText = {
  pull: {
    okText: '拉取数据',
    showCancel: true,
  },
  'pull-done': {
    okText: '拉取数据',
    showCancel: true,
  },
  import: {
    okText: '导入数据',
    showCancel: true,
  },
  done: {
    okText: '完成',
    showCancel: false,
  },
};

const NotionImport = ({
  open,
  refresh,
  onCancel,
  parentId = null,
}: ImportDocProps) => {
  const { kb_id } = useAppSelector(state => state.config);
  const [step, setStep] = useState<keyof typeof StepText>('pull');
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<ImportDocListItem[]>([]);
  const [selectIds, setSelectIds] = useState<string[]>([]);
  const [requestQueue, setRequestQueue] = useState<(() => Promise<any>)[]>([]);
  const [isCancelled, setIsCancelled] = useState(false);

  const handleCancel = () => {
    setIsCancelled(true);
    setRequestQueue([]);
    setStep('pull');
    setUrl('');
    setItems([]);
    setSelectIds([]);
    setLoading(false);
    onCancel();
    refresh?.();
  };

  const handleURL = async () => {
    const data = await getNotionIntegration({ integration: url });
    setItems(
      data.map(item => ({
        title: item.title,
        content: '',
        url: item.id,
        success: -1,
        id: '',
      })),
    );
    setStep('pull-done');
    setLoading(false);
  };

  const handleSelectedExportedData = async () => {
    const newQueue: (() => Promise<any>)[] = [];
    const notionData = items.filter(item => selectIds.includes(item.url));
    for (const item of notionData) {
      newQueue.push(async () => {
        const res = await getNotionIntegrationDetail({
          pages: [{ id: item.url, title: item.title }],
          integration: url,
          kb_id,
        });
        setItems(prev => [
          { ...item, ...res[0], success: -1, id: '' },
          ...prev,
        ]);
      });
    }
    setStep('import');
    setRequestQueue(newQueue);
  };

  const handleOk = async () => {
    if (step === 'done') {
      handleCancel();
      refresh?.();
    } else if (step === 'pull') {
      setLoading(true);
      setIsCancelled(false);
      handleURL();
    } else if (step === 'pull-done') {
      setLoading(true);
      setItems([]);
      setIsCancelled(false);
      handleSelectedExportedData();
    } else if (step === 'import') {
      if (selectIds.length === 0) {
        Message.error('请选择要导入的文档');
        return;
      }
      setItems(prev => prev.map(item => ({ ...item, success: 0 })));
      const newItems = [...items];
      for (const url of selectIds) {
        try {
          const curItem = items.find(item => item.url === url);
          if (!curItem || (curItem.id !== '' && curItem.id !== '-1')) {
            continue;
          }
          const res = await createNode({
            name: curItem?.title || '',
            content: curItem?.content || '',
            parent_id: parentId,
            type: 2,
            kb_id,
          });
          const index = newItems.findIndex(item => item.url === url);
          if (index !== -1) {
            Message.success(newItems[index].title + '导入成功');
            newItems[index] = {
              ...newItems[index],
              success: 1,
              id: res.id,
            };
          }
        } catch (error) {
          const index = newItems.findIndex(item => item.url === url);
          if (index !== -1) {
            Message.error(newItems[index].title + '导入失败');
            newItems[index] = {
              ...newItems[index],
              success: 1,
              id: '-1',
            };
          }
        }
      }
      const allSuccess = newItems.every(
        item => item.success === 1 && item.id !== '-1' && item.id !== '',
      );
      setItems(newItems);
      if (allSuccess) {
        setStep('done');
      }
    }
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
    processUrl();
  }, [requestQueue.length, isCancelled]);

  return (
    <Modal
      title={`通过 Notion 导入`}
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      disableEscapeKeyDown
      okText={StepText[step].okText}
      showCancel={StepText[step].showCancel}
      okButtonProps={{ loading }}
    >
      {step === 'pull' && (
        <>
          <Stack
            direction={'row'}
            alignItems={'center'}
            justifyContent={'space-between'}
            sx={{
              fontSize: 14,
              lineHeight: '32px',
              mb: 1,
            }}
          >
            Integration Secret
            <Box
              component='a'
              href='https://pandawiki.docs.baizhi.cloud/node/01976929-0e76-77a9-aed9-842e60933464#%E9%80%9A%E8%BF%87%20Notion%20%E5%AF%BC%E5%85%A5'
              target='_blank'
              sx={{ fontSize: 12, color: 'primary.main' }}
            >
              使用方法
            </Box>
          </Stack>
          <TextField
            fullWidth
            multiline={false}
            rows={1}
            value={url}
            placeholder={'Integration Secret'}
            autoFocus
            onChange={e => setUrl(e.target.value)}
          />
        </>
      )}
      {step !== 'pull' && (
        <Box
          sx={{
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'divider',
            maxHeight: 'calc(100vh - 300px)',
            overflowX: 'hidden',
            overflowY: 'auto',
          }}
        >
          {['pull-done', 'import'].includes(step) && (
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
              <Checkbox
                size='small'
                sx={{ flexShrink: 0, p: 0, m: 0 }}
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
            {loading && (
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{
                  px: 2,
                  py: 1,
                  cursor: 'pointer',
                  bgcolor: 'background.paper2',
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
            {items.map((item, idx) => (
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                key={item.url}
                sx={{
                  px: 2,
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
                  <Ellipsis sx={{ fontSize: 14 }}>
                    {item.title || item.url}
                  </Ellipsis>
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
                          it.url === item.url
                            ? { ...it, success: 0, id: '' }
                            : it,
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
            ))}
          </Stack>
        </Box>
      )}
    </Modal>
  );
};

export default NotionImport;
