import {
  ConstsCrawlerSource,
  ConstsCrawlerStatus,
  postApiV1CrawlerExport,
  postApiV1CrawlerParse,
  postApiV1FileUpload,
  postApiV1Node,
} from '@/request';
import { useAppSelector } from '@/store';
import { message } from '@ctzhian/ui';
import {
  alpha,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Stack,
  useTheme,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ListDataItem } from '..';
import { useGlobalQueue } from '../hooks/useGlobalQueue';
import { pollCrawlerResults } from '../util';

interface BatchActionBarProps {
  loading: boolean;
  data: ListDataItem[];
  setData: React.Dispatch<React.SetStateAction<ListDataItem[]>>;
  checked: string[];
  setChecked: React.Dispatch<React.SetStateAction<string[]>>;
  type: ConstsCrawlerSource;
  isSupportSelect: boolean;
  parent_id: string | null;
  queue: ReturnType<typeof useGlobalQueue>;
}

const BatchActionBar = (props: BatchActionBarProps) => {
  const theme = useTheme();
  const { kb_id, nav_id } = useAppSelector(state => state.config);
  const {
    data,
    loading,
    setData,
    setChecked,
    checked,
    type,
    isSupportSelect,
    parent_id,
    queue,
  } = props;

  // 使用 ref 记录已经处理过的文件 UUID，避免重复上传
  const uploadedUuidsRef = useRef<Set<string>>(new Set());

  const {
    parseErrorCount,
    importErrorCount,
    parsedCount,
    importedCount,
    loadingCount,
  } = useMemo(() => {
    return {
      parseErrorCount: data.filter(item => item.status === 'parse-error')
        .length,
      parsedCount: data.filter(item => item.status === 'parsed').length,
      importErrorCount: data.filter(item => item.status === 'import-error')
        .length,
      importedCount: data.filter(item => item.status === 'imported').length,
      loadingCount: data.filter(item =>
        ['parsing', 'importing'].includes(item.status),
      ).length,
    };
  }, [data]);

  /**
   * 通用解析函数 - 用于解析文档
   * @param items 需要解析的文档列表
   * @param parseKey 解析时使用的 key 字段名，默认为 'title'
   */
  const handleParse = useCallback(
    async (items: ListDataItem[]) => {
      const itemUuids = items.map(item => item.uuid);

      // 将状态修改为 'parsing'
      setData(prev =>
        prev.map(item =>
          itemUuids.includes(item.uuid)
            ? { ...item, status: 'parsing', summary: '', progress: undefined }
            : item,
        ),
      );

      // 使用队列控制并发请求
      await Promise.all(
        items.map(item =>
          queue.enqueue(async () => {
            try {
              const resp = await postApiV1CrawlerParse({
                crawler_source: type,
                key: item.id!,
                kb_id,
                filename: item.file_type ? `file.${item.file_type}` : undefined,
              });

              const title =
                type === ConstsCrawlerSource.CrawlerSourceFile
                  ? item.title
                  : resp.docs?.value?.title || item.title;

              // 更新为解析成功状态
              setData(prev =>
                prev.map(prevItem =>
                  prevItem.uuid === item.uuid
                    ? {
                        ...prevItem,
                        platform_id: resp.id!,
                        id: resp.docs?.value?.id || '',
                        title,
                        summary: resp.docs?.value?.summary || '',
                        status: 'parsed',
                      }
                    : prevItem,
                ),
              );
            } catch (error) {
              // 更新为错误状态
              setData(prev =>
                prev.map(prevItem =>
                  prevItem.uuid === item.uuid
                    ? {
                        ...prevItem,
                        status: 'parse-error',
                        summary:
                          error instanceof Error
                            ? error.message
                            : '操作失败，请稍后重试',
                      }
                    : prevItem,
                ),
              );
            }
          }),
        ),
      );
    },
    [setData, type, kb_id, queue],
  );

  const handleBatchImport = useCallback(async () => {
    // 步骤1: 将所有状态为 'parsed' 或 'import-error' 的数据修改为 'importing'
    let itemsToImport = data.filter(item =>
      ['parsed', 'import-error'].includes(item.status),
    );

    // 如果支持选择，则只处理选中的数据
    if (isSupportSelect) {
      itemsToImport = itemsToImport.filter(item => checked.includes(item.uuid));
    }

    // 过滤掉文件夹中 folderReq 为 false 的项
    itemsToImport = itemsToImport.filter(
      item => item.file || item.folderReq !== false,
    );

    if (itemsToImport.length === 0) {
      message.warning('请选择需要导入的文档');
      return;
    }

    const importingFolderIds = new Set(
      itemsToImport
        .filter(item => !item.file && item.id)
        .map(item => item.id!) as string[],
    );

    const itemUuids = itemsToImport.map(item => item.uuid);

    setData(prev =>
      prev.map(item =>
        itemUuids.includes(item.uuid) &&
        ['parsed', 'import-error'].includes(item.status)
          ? { ...item, status: 'importing' }
          : item,
      ),
    );

    const idMapping = new Map<string, string>();

    for (const item of itemsToImport) {
      await queue.enqueue(async () => {
        try {
          let actualParentId: string | undefined = undefined;
          if (item.parent_id) {
            const mappedParentId = idMapping.get(item.parent_id);
            if (mappedParentId) {
              actualParentId = mappedParentId;
            } else {
              actualParentId = parent_id || undefined;
            }
          } else {
            actualParentId = parent_id || undefined;
          }

          if (!item.file) {
            const nodeResp = await postApiV1Node({
              name: item.title!,
              content: '',
              parent_id: actualParentId,
              type: 1, // 文件夹类型
              kb_id,
              nav_id: nav_id || '',
            });

            const oldId = item.id!; // 保存原平台 ID
            const newId = nodeResp.id; // 新系统节点 ID

            // 更新映射表
            idMapping.set(oldId, newId);

            setData(prev =>
              prev.map(prevItem => {
                if (prevItem.uuid === item.uuid) {
                  return { ...prevItem, status: 'imported', id: newId };
                } else if (prevItem.parent_id === oldId) {
                  return { ...prevItem, parent_id: newId };
                }
                return prevItem;
              }),
            );
          } else {
            const exportResp = await postApiV1CrawlerExport({
              id: item.platform_id!,
              doc_id: item.id!,
              kb_id,
              space_id: item.space_id,
              file_type: item.file_type,
            });

            setData(prev =>
              prev.map(prevItem =>
                prevItem.uuid === item.uuid
                  ? { ...prevItem, task_id: exportResp.task_id }
                  : prevItem,
              ),
            );

            const pollResult = await pollCrawlerResults(exportResp.task_id!);

            if (
              pollResult.status === ConstsCrawlerStatus.CrawlerStatusCompleted
            ) {
              setData(prev =>
                prev.map(prevItem =>
                  prevItem.uuid === item.uuid
                    ? { ...prevItem, summary: pollResult.content || '' }
                    : prevItem,
                ),
              );

              // 3. 创建文档节点
              const nodeResp = await postApiV1Node({
                name: item.title!,
                content: pollResult.content || '',
                content_type: item.file_type === 'md' ? 'md' : undefined,
                parent_id: actualParentId,
                type: 2, // 文件类型
                kb_id,
                nav_id: nav_id || '',
              });

              setData(prev =>
                prev.map(prevItem =>
                  prevItem.uuid === item.uuid
                    ? { ...prevItem, status: 'imported', id: nodeResp.id }
                    : prevItem,
                ),
              );
            } else if (
              pollResult.status === ConstsCrawlerStatus.CrawlerStatusFailed
            ) {
              setData(prev =>
                prev.map(prevItem =>
                  prevItem.uuid === item.uuid
                    ? {
                        ...prevItem,
                        status: 'import-error',
                        summary: '爬取失败',
                      }
                    : prevItem,
                ),
              );
            }
          }
        } catch (error) {
          setData(prev =>
            prev.map(prevItem =>
              prevItem.uuid === item.uuid
                ? {
                    ...prevItem,
                    status: 'import-error',
                    summary:
                      error instanceof Error
                        ? error.message
                        : item.file
                          ? '导入文件失败'
                          : '创建文件夹失败',
                  }
                : prevItem,
            ),
          );
        }
      });
    }
  }, [data, setData, kb_id, isSupportSelect, checked, parent_id, queue]);

  const handleBatchParse = useCallback(async () => {
    // 筛选所有状态为 'parse-error' 的数据
    let itemsToParse = data.filter(item => item.status === 'parse-error');

    // 如果支持选择，则只处理选中的数据
    if (isSupportSelect) {
      itemsToParse = itemsToParse.filter(item => checked.includes(item.uuid));
    }

    if (itemsToParse.length === 0) {
      message.warning('请选择需要解析的文档');
      return;
    }

    handleParse(itemsToParse);
  }, [data, handleParse, isSupportSelect, checked]);

  /**
   * 文件上传函数 - 上传文件到服务器
   * @param items 需要上传的文件列表
   */
  const handleUploadFile = useCallback(
    async (items: ListDataItem[]) => {
      const uploadedUuids: string[] = []; // 记录成功上传的文件 UUID

      // 批量上传文件
      await Promise.all(
        items.map(item =>
          queue.enqueue(async () => {
            if (!item.fileData) {
              return;
            }

            try {
              // 上传文件并监听进度
              const resp = await postApiV1FileUpload(
                { file: item.fileData },
                {
                  onUploadProgress: progressEvent => {
                    const percentCompleted = progressEvent.total
                      ? Math.round(
                          (progressEvent.loaded * 100) / progressEvent.total,
                        )
                      : 0;

                    // 更新进度
                    setData(prev =>
                      prev.map(prevItem =>
                        prevItem.uuid === item.uuid
                          ? { ...prevItem, progress: percentCompleted }
                          : prevItem,
                      ),
                    );
                  },
                },
              );

              // 上传成功，保存 key 和文件类型
              setData(prev =>
                prev.map(prevItem =>
                  prevItem.uuid === item.uuid
                    ? {
                        ...prevItem,
                        id: resp.key,
                        file_type: resp.filename?.split('.').pop(),
                        progress: 100,
                      }
                    : prevItem,
                ),
              );

              // 记录上传成功的 UUID
              uploadedUuids.push(item.uuid);
            } catch (error) {
              // 上传失败
              setData(prev =>
                prev.map(prevItem =>
                  prevItem.uuid === item.uuid
                    ? {
                        ...prevItem,
                        status: 'upload-error',
                        summary:
                          error instanceof Error
                            ? error.message
                            : '文件上传失败',
                        progress: undefined,
                      }
                    : prevItem,
                ),
              );
            }
          }),
        ),
      );

      // 文件上传完成后，筛选出成功上传的文件进行解析
      if (uploadedUuids.length > 0) {
        setData(prev => {
          const uploadedItems = prev.filter(
            item =>
              uploadedUuids.includes(item.uuid) &&
              !!item.id &&
              item.status === 'common',
          );

          if (uploadedItems.length > 0) {
            // 立即调用解析函数
            handleParse(uploadedItems);
          }

          return prev;
        });
      }
    },
    [setData, handleParse, queue],
  );

  const handleToggleSelectAll = useCallback(() => {
    const canSelectData = data.filter(item => item.folderReq);
    setChecked(prev => {
      if (prev.length === canSelectData.length && canSelectData.length > 0) {
        return [];
      }
      return canSelectData.map(item => item.uuid);
    });
  }, [data, setChecked]);

  // 计算全选状态
  const isAllChecked = useMemo(() => {
    return data.length > 0 && checked.length === data.length;
  }, [data.length, checked.length]);

  // 计算半选状态
  const isIndeterminate = useMemo(() => {
    return checked.length > 0 && checked.length < data.length;
  }, [data.length, checked.length]);

  // 当数据清空时，重置已上传记录
  useEffect(() => {
    if (data.length === 0) {
      uploadedUuidsRef.current.clear();
    }
  }, [data.length]);

  // 监听新文件，自动触发上传
  useEffect(() => {
    if (data.length > 0) {
      // 筛选出状态为 'common' 且未处理过的文件
      const unUploadData = data.filter(
        item =>
          item.status === 'common' && !uploadedUuidsRef.current.has(item.uuid),
      );

      if (unUploadData.length > 0) {
        // 标记这些文件为已处理，避免重复上传
        unUploadData.forEach(item => {
          uploadedUuidsRef.current.add(item.uuid);
        });

        handleUploadFile(unUploadData);
      }
    }
  }, [data, handleUploadFile]);

  return (
    <Stack
      direction='row'
      alignItems='center'
      justifyContent={'space-between'}
      gap='10px'
      sx={{
        p: 1,
        pr: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        bgcolor: 'background.default',
        zIndex: 1,
      }}
    >
      <Stack direction='row' gap={1} alignItems='center' sx={{ lineHeight: 1 }}>
        {isSupportSelect && (
          <Stack
            direction='row'
            gap={1}
            alignItems='center'
            sx={{
              fontSize: 14,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={handleToggleSelectAll}
          >
            <Checkbox
              aria-labelledby='checked-all-label'
              edge='start'
              size='small'
              checked={isAllChecked}
              indeterminate={isIndeterminate}
              tabIndex={-1}
              disableRipple
              sx={{ ml: '2px' }}
              inputProps={{ 'aria-labelledby': 'checked-all-label' }}
            />
            <Box>全选</Box>
          </Stack>
        )}
        {importedCount > 0 ? (
          <Box
            sx={{
              fontSize: 12,
              color: 'success.main',
              bgcolor: alpha(theme.palette.success.main, 0.1),
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            导入成功：{importedCount}{' '}
            {data.length - importedCount > 0 && <> / {data.length}</>}
          </Box>
        ) : (
          <Box
            sx={{
              fontSize: 12,
              color: 'text.disabled',
              bgcolor: 'background.paper2',
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            未导入：{data.length - importedCount}
          </Box>
        )}
        {parseErrorCount > 0 && (
          <Box
            sx={{
              fontSize: 12,
              color: 'error.main',
              bgcolor: alpha(theme.palette.error.main, 0.1),
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            解析失败：{parseErrorCount}
          </Box>
        )}
        {importErrorCount > 0 && (
          <Box
            sx={{
              fontSize: 12,
              color: 'error.main',
              bgcolor: alpha(theme.palette.error.main, 0.1),
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            导入失败：{importErrorCount}
          </Box>
        )}
        {loadingCount > 0 && (
          <Stack
            direction='row'
            gap={1}
            alignItems='center'
            sx={{
              fontSize: 12,
              color: 'warning.main',
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            <CircularProgress
              size={12}
              sx={{ color: theme.palette.warning.main }}
            />
            处理中：{loadingCount}
          </Stack>
        )}
      </Stack>
      <Stack direction='row' gap={2} alignItems='center'>
        <Button
          size='small'
          color='primary'
          disabled={parseErrorCount === 0 || loading}
          sx={{ minWidth: 0, p: 0, color: 'primary.main' }}
          onClick={handleBatchParse}
        >
          批量解析
        </Button>
        <Button
          size='small'
          color='primary'
          disabled={!(parsedCount > 0 || importErrorCount > 0) || loading}
          onClick={handleBatchImport}
          sx={{ minWidth: 0, p: 0, color: 'primary.main' }}
        >
          批量导入
        </Button>
      </Stack>
    </Stack>
  );
};

export default BatchActionBar;
