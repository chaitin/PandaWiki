import { ITreeItem, NodeListFilterData } from '@/api';
import Card from '@/components/Card';
import Cascader from '@/components/Cascader';
import DragTree, { type DragTreeHandle } from '@/components/Drag/DragTree';
import {
  TreeMenuItem,
  TreeMenuOptions,
} from '@/components/Drag/DragTree/TreeMenu';
import { useURLSearchParams } from '@/hooks';
import { getApiV1NodeList } from '@/request/Node';
import {
  ConstsCrawlerSource,
  ConstsNodeRagInfoStatus,
  DomainNodeListItemResp,
} from '@/request/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { setIsRefreshDocList } from '@/store/slices/config';
import { addOpacityToColor } from '@/utils';
import { collapseAllFolders, convertToTree } from '@/utils/drag';
import { message } from '@ctzhian/ui';
import {
  Box,
  Button,
  ButtonBase,
  Checkbox,
  IconButton,
  Stack,
  useTheme,
} from '@mui/material';
import { IconGengduo } from '@panda-wiki/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VersionPublish from '../release/components/VersionPublish';
import AddDocBtn from './component/AddDocBtn';
import AddDocByType from './component/AddDocByType';
import DocDelete from './component/DocDelete';
import DocPropertiesModal from './component/DocPropertiesModal';
import DocSearch from './component/DocSearch';
import DocStatus from './component/DocStatus';
import DocSummary from './component/DocSummary';
import MoveDocs from './component/MoveDocs';
import RagErrorReStart from './component/RagErrorReStart';
import Summary from './component/Summary';

const Content = () => {
  const { kb_id, isRefreshDocList, kbList } = useAppSelector(
    state => state.config,
  );
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const dragTreeRef = useRef<DragTreeHandle>(null);

  const [searchParams] = useURLSearchParams();
  const search = searchParams.get('search') || '';
  const [supportSelect, setBatchOpen] = useState(false);
  const [wikiUrl, setWikiUrl] = useState<string>('');

  const [ragReStartCount, setRagStartCount] = useState(0);
  const [ragIds, setRagIds] = useState<string[]>([]);
  const [ragOpen, setRagOpen] = useState(false);
  const [publish, setPublish] = useState({
    // published: 0,
    unpublished: 0,
  });
  const [publishIds, setPublishIds] = useState<string[]>([]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [list, setList] = useState<DomainNodeListItemResp[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [data, setData] = useState<ITreeItem[]>([]);
  const [opraData, setOpraData] = useState<DomainNodeListItemResp[]>([]);
  const [statusOpen, setStatusOpen] = useState<'delete' | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [moreSummaryOpen, setMoreSummaryOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [key, setKey] = useState<ConstsCrawlerSource | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [isBatch, setIsBatch] = useState(false);

  // 从树形数据中查找节点并转换为列表格式
  const findItemInTree = (
    items: ITreeItem[],
    id: string,
  ): DomainNodeListItemResp | null => {
    for (const item of items) {
      if (item.id === id) {
        // 将 ITreeItem 转换为 DomainNodeListItemResp
        return {
          id: item.id,
          name: item.name,
          emoji: item.emoji,
          parent_id: item.parentId,
          summary: item.summary,
          type: item.type,
          status: item.status,
          permissions: item.permissions,
          updated_at: item.updated_at,
        } as DomainNodeListItemResp;
      }
      if (item.children?.length) {
        const found = findItemInTree(item.children as ITreeItem[], id);
        if (found) return found;
      }
    }
    return null;
  };

  // 优先从 list 查找，如果找不到则从 data 树中查找（用于新创建的节点）
  const getOperationData = (item: ITreeItem): DomainNodeListItemResp[] => {
    const fromList = list.filter(it => it.id === item.id);
    if (fromList.length > 0) {
      return fromList;
    }
    // 从树中查找
    const fromTree = findItemInTree(data, item.id);
    return fromTree ? [fromTree] : [];
  };

  const handleUrl = (item: ITreeItem, key: ConstsCrawlerSource) => {
    setKey(key);
    setUrlOpen(true);
    setOpraData(getOperationData(item));
  };

  const handleDelete = (item: ITreeItem) => {
    setDeleteOpen(true);
    setOpraData(getOperationData(item));
  };

  const handlePublish = (item: ITreeItem) => {
    setPublishOpen(true);
    setPublishIds([item.id]);
  };

  const handleRestudy = (item: ITreeItem) => {
    setRagOpen(true);
    setRagIds([item.id]);
  };

  const handleProperties = (item: ITreeItem) => {
    setPropertiesOpen(true);
    setOpraData(getOperationData(item));
    setIsBatch(false);
  };

  const handleFrontDoc = (id: string) => {
    const currentNode = list.find(item => item.id === id);
    if (currentNode?.status !== 2 && !currentNode?.publisher_id) {
      message.warning('当前文档未发布，无法查看前台文档');
      return;
    }
    window.open(`${wikiUrl}/node/${id}`, '_blank');
  };

  const menu = (opra: TreeMenuOptions): TreeMenuItem[] => {
    const { item, createItem, renameItem, isEditing: isEditing } = opra;
    return [
      ...(item.type === 1
        ? [
            {
              label: '创建文件夹',
              key: 'folder',
              onClick: () => createItem(1),
            },
            {
              label: '创建文档',
              key: 'doc',
              children: [
                {
                  label: '创建富文本',
                  key: 'rich_text',
                  onClick: () => createItem(2, 'html'),
                },
                {
                  label: '创建 Markdown',
                  key: 'md',
                  onClick: () => createItem(2, 'md'),
                },
              ],
            },
            {
              label: '导入文档',
              key: 'next-line',
              children: [
                {
                  label: '通过离线文件导入',
                  key: ConstsCrawlerSource.CrawlerSourceFile,
                  onClick: () =>
                    handleUrl(item, ConstsCrawlerSource.CrawlerSourceFile),
                },
                {
                  label: '通过 URL 导入',
                  key: ConstsCrawlerSource.CrawlerSourceUrl,
                  onClick: () =>
                    handleUrl(item, ConstsCrawlerSource.CrawlerSourceUrl),
                },
                {
                  label: '通过 RSS 导入',
                  key: ConstsCrawlerSource.CrawlerSourceRSS,
                  onClick: () =>
                    handleUrl(item, ConstsCrawlerSource.CrawlerSourceRSS),
                },
                {
                  label: '通过 Sitemap 导入',
                  key: ConstsCrawlerSource.CrawlerSourceSitemap,
                  onClick: () =>
                    handleUrl(item, ConstsCrawlerSource.CrawlerSourceSitemap),
                },
                {
                  label: '通过 Notion 导入',
                  key: ConstsCrawlerSource.CrawlerSourceNotion,
                  onClick: () =>
                    handleUrl(item, ConstsCrawlerSource.CrawlerSourceNotion),
                },
                {
                  label: '通过 Epub 导入',
                  key: ConstsCrawlerSource.CrawlerSourceEpub,
                  onClick: () =>
                    handleUrl(item, ConstsCrawlerSource.CrawlerSourceEpub),
                },
                {
                  label: '通过 Wiki.js 导入',
                  key: ConstsCrawlerSource.CrawlerSourceWikijs,
                  onClick: () =>
                    handleUrl(item, ConstsCrawlerSource.CrawlerSourceWikijs),
                },
                {
                  label: '通过 语雀 导入',
                  key: ConstsCrawlerSource.CrawlerSourceYuque,
                  onClick: () =>
                    handleUrl(item, ConstsCrawlerSource.CrawlerSourceYuque),
                },
                {
                  label: '通过 思源笔记 导入',
                  key: ConstsCrawlerSource.CrawlerSourceSiyuan,
                  onClick: () =>
                    handleUrl(item, ConstsCrawlerSource.CrawlerSourceSiyuan),
                },
                {
                  label: '通过 MinDoc 导入',
                  key: ConstsCrawlerSource.CrawlerSourceMindoc,
                  onClick: () =>
                    handleUrl(item, ConstsCrawlerSource.CrawlerSourceMindoc),
                },
                {
                  label: '通过飞书文档导入',
                  key: ConstsCrawlerSource.CrawlerSourceFeishu,
                  onClick: () =>
                    handleUrl(item, ConstsCrawlerSource.CrawlerSourceFeishu),
                },
                {
                  label: '通过 Confluence 导入',
                  key: ConstsCrawlerSource.CrawlerSourceConfluence,
                  onClick: () =>
                    handleUrl(
                      item,
                      ConstsCrawlerSource.CrawlerSourceConfluence,
                    ),
                },
              ],
            },
          ]
        : []),
      ...(item.type === 2
        ? [
            ...(item.status === 1
              ? [
                  {
                    label: '更新发布',
                    key: 'update_publish',
                    onClick: () => handlePublish(item),
                  },
                ]
              : []),
            // {
            //   label: item.summary ? '查看摘要' : '生成摘要',
            //   key: 'summary',
            //   onClick: () => handleSummary(item),
            // },
          ]
        : []),
      ...(item.type === 2 &&
      item.rag_status &&
      [
        ConstsNodeRagInfoStatus.NodeRagStatusFailed,
        ConstsNodeRagInfoStatus.NodeRagStatusPending,
      ].includes(item.rag_status)
        ? [
            {
              label:
                item.rag_status === ConstsNodeRagInfoStatus.NodeRagStatusPending
                  ? '学习文档'
                  : '重新学习',
              key: 'restudy',
              onClick: () => handleRestudy(item),
            },
          ]
        : []),
      ...(item.type === 2
        ? [
            {
              label: '文档属性',
              key: 'properties',
              onClick: () => handleProperties(item),
            },
            {
              label: '前台查看',
              key: 'front_doc',
              onClick: () => handleFrontDoc(item.id),
            },
          ]
        : []),
      ...(!isEditing
        ? [{ label: '重命名', key: 'rename', onClick: renameItem }]
        : []),
      { label: '删除', key: 'delete', onClick: () => handleDelete(item) },
    ];
  };

  // 收集当前已展开的文件夹 id（collapsed === false）
  const collectOpenFolderIds = useCallback(
    (items: ITreeItem[]): Set<string> => {
      const openIds = new Set<string>();
      const dfs = (nodes: ITreeItem[]) => {
        nodes.forEach(n => {
          if (n.type === 1 && n.collapsed === false) openIds.add(n.id);
          if (n.children?.length) dfs(n.children as ITreeItem[]);
        });
      };
      dfs(items);
      return openIds;
    },
    [],
  );

  // 重新打开指定的文件夹 ids
  const reopenFolders = useCallback(
    (items: ITreeItem[], openIds: Set<string>): ITreeItem[] => {
      return items.map(n => {
        const children = n.children?.length
          ? reopenFolders(n.children as ITreeItem[], openIds)
          : n.children;
        const collapsed =
          n.type === 1 && openIds.has(n.id) ? false : n.collapsed;
        return { ...n, collapsed, children } as ITreeItem;
      });
    },
    [],
  );

  const getData = useCallback(() => {
    const params: NodeListFilterData = { kb_id };
    if (search) params.search = search;
    // 记录当前展开的文件夹
    const openIds = collectOpenFolderIds(data);
    getApiV1NodeList(params).then(res => {
      setList(res || []);
      setPublish({
        unpublished: res.filter(it => it.status === 1).length,
      });
      setRagStartCount(
        res.filter(
          it =>
            it.type === 2 &&
            it.rag_info?.status &&
            [
              ConstsNodeRagInfoStatus.NodeRagStatusFailed,
              ConstsNodeRagInfoStatus.NodeRagStatusPending,
            ].includes(it.rag_info.status),
        ).length,
      );
      const collapsedAll = collapseAllFolders(convertToTree(res || []), true);
      const next = openIds.size
        ? reopenFolders(collapsedAll, openIds)
        : collapsedAll;
      setData(next);
    });
  }, [search, kb_id, data, collectOpenFolderIds, reopenFolders]);

  // 本地更新数据，不重新请求
  const updateLocalData = useCallback((newData: ITreeItem[]) => {
    setData([...newData]);
  }, []);

  const currentKb = useMemo(() => {
    return kbList?.find(item => item.id === kb_id);
  }, [kbList, kb_id]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && kb_id) {
        getData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [getData, kb_id]);

  useEffect(() => {
    if (currentKb?.access_settings?.base_url) {
      setWikiUrl(currentKb.access_settings.base_url);
      return;
    }
    const host = currentKb?.access_settings?.hosts?.[0] || '';
    if (host === '') return;
    const { ssl_ports = [], ports = [] } = currentKb?.access_settings || {};

    if (ssl_ports) {
      if (ssl_ports.includes(443)) setWikiUrl(`https://${host}`);
      else if (ssl_ports.length > 0)
        setWikiUrl(`https://${host}:${ssl_ports[0]}`);
    } else if (ports) {
      if (ports.includes(80)) setWikiUrl(`http://${host}`);
      else if (ports.length > 0) setWikiUrl(`http://${host}:${ports[0]}`);
    }
  }, [currentKb]);

  useEffect(() => {
    if (kb_id) getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, kb_id]);

  useEffect(() => {
    if (isRefreshDocList) {
      getData();
      dispatch(setIsRefreshDocList(false));
    }
  }, [isRefreshDocList, getData]);

  return (
    <>
      <Card>
        <Stack
          direction={'row'}
          alignItems={'center'}
          justifyContent={'space-between'}
          sx={{ p: 2 }}
        >
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={0}
            sx={{ fontSize: 16, fontWeight: 700 }}
          >
            <Box>目录</Box>
            {publish.unpublished > 0 && (
              <>
                <Box
                  sx={{
                    color: 'error.main',
                    fontSize: 12,
                    fontWeight: 'normal',
                    ml: 2,
                  }}
                >
                  {publish.unpublished} 个 文档/文件夹未发布，
                </Box>
                <ButtonBase
                  disableRipple
                  sx={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: 'primary.main',
                  }}
                  onClick={() => {
                    setPublishOpen(true);
                  }}
                >
                  去发布
                </ButtonBase>
              </>
            )}
            {ragReStartCount > 0 && (
              <>
                <Box
                  sx={{
                    color: 'error.main',
                    fontSize: 12,
                    fontWeight: 'normal',
                    ml: 2,
                  }}
                >
                  {ragReStartCount} 个文档未学习，
                </Box>
                <ButtonBase
                  disableRipple
                  sx={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: 'primary.main',
                  }}
                  onClick={() => {
                    setRagOpen(true);
                  }}
                >
                  去学习
                </ButtonBase>
              </>
            )}
          </Stack>
          <Stack direction={'row'} alignItems={'center'} gap={2}>
            <DocSearch />
            <AddDocBtn
              refresh={getData}
              createLocal={node => {
                setData(prev => {
                  // 追加到根末尾
                  const next = [
                    ...prev,
                    {
                      id: node.id,
                      name: node.name,
                      level: 0,
                      order: prev.length
                        ? (prev[prev.length - 1].order ?? 0) + 1
                        : 0,
                      emoji: node.emoji,
                      content_type: node.content_type,
                      parentId: undefined,
                      children: node.type === 1 ? [] : undefined,
                      type: node.type,
                      status: 1,
                    } as ITreeItem,
                  ];
                  return next;
                });
              }}
              scrollTo={id => {
                // 滚动到新创建项
                setTimeout(() => {
                  dragTreeRef.current?.scrollToItem(id);
                }, 120);
              }}
            />
            <Cascader
              list={[
                {
                  key: 'batch',
                  label: (
                    <Stack
                      direction={'row'}
                      alignItems={'center'}
                      gap={1}
                      sx={{
                        fontSize: 14,
                        px: 2,
                        lineHeight: '40px',
                        height: 40,
                        width: 180,
                        borderRadius: '5px',
                        cursor: 'pointer',
                        ':hover': {
                          bgcolor: addOpacityToColor(
                            theme.palette.primary.main,
                            0.1,
                          ),
                        },
                      }}
                      onClick={() => setBatchOpen(true)}
                    >
                      批量操作
                    </Stack>
                  ),
                },
              ]}
              context={
                <Box>
                  <IconButton size='small'>
                    <IconGengduo sx={{ fontSize: '16px' }} />
                  </IconButton>
                </Box>
              }
            />
          </Stack>
        </Stack>
        {supportSelect && (
          <Stack
            direction={'row'}
            alignItems={'center'}
            sx={{ pr: 2, pl: 6.5, lineHeight: '35px' }}
          >
            <Checkbox
              sx={{
                color: 'text.disabled',
                width: '35px',
                height: '35px',
              }}
              checked={selected.length === list.length}
              onChange={e => {
                e.stopPropagation();
                if (selected.length === list.length) {
                  setSelected([]);
                  setOpraData([]);
                } else {
                  setSelected(list.map(item => item.id!));
                  setOpraData(list);
                }
              }}
            />
            {selected.length > 0 ? (
              <>
                <Box sx={{ fontSize: 13, color: 'text.secondary', mr: 2 }}>
                  已选中 {selected.length} 项
                </Box>
                <Stack direction={'row'} alignItems={'center'} gap={1}>
                  <Button
                    size='small'
                    color='primary'
                    sx={{ minWidth: 0, p: 0, lineHeight: 1 }}
                    onClick={() => {
                      setMoreSummaryOpen(true);
                      setOpraData(
                        list.filter(item => selected.includes(item.id!)),
                      );
                    }}
                  >
                    生成摘要
                  </Button>
                  <Button
                    size='small'
                    color='primary'
                    sx={{ minWidth: 0, p: 0, lineHeight: 1 }}
                    onClick={() => {
                      setMoveOpen(true);
                      setOpraData(
                        list.filter(item => selected.includes(item.id!)),
                      );
                    }}
                  >
                    批量移动
                  </Button>
                  <Button
                    size='small'
                    color='primary'
                    sx={{ minWidth: 0, p: 0, lineHeight: 1 }}
                    onClick={() => {
                      setDeleteOpen(true);
                      setOpraData(
                        list.filter(item => selected.includes(item.id!)),
                      );
                    }}
                  >
                    批量删除
                  </Button>
                  <Button
                    size='small'
                    color='primary'
                    sx={{ minWidth: 0, p: 0, lineHeight: 1 }}
                    onClick={() => {
                      setPropertiesOpen(true);
                      setIsBatch(true);
                      setOpraData(
                        list.filter(item => selected.includes(item.id!)),
                      );
                    }}
                  >
                    批量设置权限
                  </Button>
                </Stack>
              </>
            ) : (
              <Box sx={{ fontSize: 13, color: 'text.secondary' }}>全选</Box>
            )}
            <Button
              size='small'
              sx={{
                color: 'text.secondary',
                minWidth: 0,
                p: 0,
                ml: 2,
                lineHeight: 1,
              }}
              onClick={() => {
                setSelected([]);
                setBatchOpen(false);
              }}
            >
              取消
            </Button>
          </Stack>
        )}
        <Stack
          sx={{
            height: supportSelect
              ? 'calc(100vh - 183px)'
              : 'calc(100vh - 148px)',
            overflow: 'hidden',
            overflowY: 'auto',
            px: 2,
            pb: 2,
          }}
        >
          <DragTree
            ref={dragTreeRef}
            data={data}
            menu={menu}
            updateData={updateLocalData}
            selected={selected}
            onSelectChange={value => {
              setSelected(value);
            }}
            supportSelect={supportSelect}
            virtualized={true}
          />
        </Stack>
      </Card>
      <DocDelete
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setOpraData([]);
          setSelected([]);
          setBatchOpen(false);
        }}
        data={opraData}
        onDeleted={ids => {
          // 本地删除：从 data 移除这些 id 及其所有子节点
          const removeIds = new Set(ids);
          const removeDeep = (items: ITreeItem[]): ITreeItem[] => {
            const result: ITreeItem[] = [];
            for (const it of items) {
              if (removeIds.has(it.id)) continue;
              const children = it.children?.length
                ? removeDeep(it.children as ITreeItem[])
                : undefined;
              result.push({ ...it, children });
            }
            return result;
          };
          setData(prev => removeDeep(prev));
        }}
      />
      {key && (
        <AddDocByType
          type={key}
          open={urlOpen}
          onCancel={() => {
            setUrlOpen(false);
            setOpraData([]);
          }}
          parentId={opraData[0]?.id || null}
          refresh={getData}
        />
      )}
      <Summary
        data={opraData[0]}
        kb_id={kb_id}
        open={summaryOpen}
        refresh={getData}
        onClose={() => {
          setSummaryOpen(false);
          setOpraData([]);
        }}
      />
      <DocSummary
        data={opraData}
        kb_id={kb_id}
        open={moreSummaryOpen}
        refresh={getData}
        onClose={() => {
          setMoreSummaryOpen(false);
          setOpraData([]);
        }}
      />
      <DocStatus
        status={statusOpen || 'delete'}
        data={opraData}
        kb_id={kb_id}
        open={!!statusOpen}
        refresh={getData}
        onClose={() => {
          setStatusOpen(null);
          setOpraData([]);
        }}
      />
      <VersionPublish
        open={publishOpen}
        defaultSelected={publishIds}
        onClose={() => {
          setPublishOpen(false);
          setPublishIds([]);
        }}
        refresh={getData}
      />
      <RagErrorReStart
        open={ragOpen}
        defaultSelected={ragIds}
        onClose={() => {
          setRagOpen(false);
          setRagIds([]);
        }}
        refresh={getData}
      />
      <MoveDocs
        open={moveOpen}
        data={list}
        selected={opraData}
        onMoved={({ ids, parentId }) => {
          // 本地移动：将 ids 对应节点移动到 parentId 下
          setData(prev => {
            // 1) 取出所有被移动节点
            const idSet = new Set(ids);
            const picked: ITreeItem[] = [];
            const removePicked = (items: ITreeItem[]): ITreeItem[] => {
              const res: ITreeItem[] = [];
              for (const it of items) {
                if (idSet.has(it.id)) {
                  picked.push({ ...it });
                  continue;
                }
                const children = it.children?.length
                  ? removePicked(it.children as ITreeItem[])
                  : it.children;
                res.push({ ...it, children });
              }
              return res;
            };
            let next = removePicked(prev);

            // 2) 找到目标父节点（空字符串或 'root' 表示根）
            const findNode = (
              items: ITreeItem[],
              id: string,
            ): ITreeItem | null => {
              for (const it of items) {
                if (it.id === id) return it;
                if (it.children?.length) {
                  const f = findNode(it.children as ITreeItem[], id);
                  if (f) return f;
                }
              }
              return null;
            };

            if (!parentId) {
              // 移动到根
              next = [
                ...next,
                ...picked.map(p => ({ ...p, parentId: undefined })),
              ];
            } else {
              const parent = findNode(next, parentId);
              if (parent) {
                const children =
                  (parent.children as ITreeItem[] | undefined) ?? [];
                parent.children = [
                  ...children,
                  ...picked.map(p => ({ ...p, parentId: parentId })),
                ];
                // 展开目标父及其祖先
                parent.collapsed = false;
                const expandAncestors = (
                  items: ITreeItem[],
                  targetId: string,
                ) => {
                  const dfs = (
                    nodes: ITreeItem[],
                    trail: ITreeItem[],
                  ): boolean => {
                    for (const n of nodes) {
                      const nextTrail = [...trail, n];
                      if (n.id === targetId) {
                        nextTrail.forEach(t => {
                          if (t.type === 1) t.collapsed = false;
                        });
                        return true;
                      }
                      if (
                        n.children?.length &&
                        dfs(n.children as ITreeItem[], nextTrail)
                      )
                        return true;
                    }
                    return false;
                  };
                  dfs(items, []);
                };
                expandAncestors(next, parentId);
              }
            }
            return [...next];
          });
          // 滚动到第一个移动的节点位置
          setTimeout(() => {
            const targetId = ids[0];
            if (targetId) {
              dragTreeRef.current?.scrollToItem(targetId);
            }
          }, 120);
        }}
        onClose={() => {
          setMoveOpen(false);
          setOpraData([]);
        }}
      />
      <DocPropertiesModal
        open={propertiesOpen}
        onCancel={() => {
          setPropertiesOpen(false);
          setOpraData([]);
        }}
        onOk={() => {
          getData();
          setPropertiesOpen(false);
          setOpraData([]);
        }}
        data={opraData}
        isBatch={isBatch}
      />
    </>
  );
};

export default Content;
