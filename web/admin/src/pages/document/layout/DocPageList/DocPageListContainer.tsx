import { ITreeItem } from '@/api';
import { type DragTreeHandle } from '@/components/Drag/DragTree';
import { postApiV1NodeRestudy } from '@/request/Node';
import {
  ConstsNodeRagInfoStatus,
  DomainNodeListItemResp,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { collapseAllFolders, convertToTree } from '@/utils/drag';
import { message } from '@ctzhian/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import DocListModals from './DocListModals';
import DocPageListContent from './DocPageListContent';
import type { DocPageListContainerProps } from './types';
import { useDocTreeMenu } from './useDocTreeMenu';
import {
  collectOpenFolderIds,
  findItemInTree,
  removeDeep,
  reopenFolders,
} from './utils';

const DocPageListContainer = ({
  groups,
  nav_id,
  search,
  refresh,
  wikiUrl,
  loading = false,
  onPublishOpen,
  onRagOpen,
  registerTreeDragHandlers,
}: DocPageListContainerProps) => {
  const { kb_id } = useAppSelector(state => state.config);
  const dragTreeRef = useRef<DragTreeHandle>(null);

  const [supportSelect, setBatchOpen] = useState(false);
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
  const [key, setKey] = useState<string | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [isBatch, setIsBatch] = useState(false);

  const getOperationData = useCallback(
    (item: ITreeItem): DomainNodeListItemResp[] => {
      const fromList = list.filter(it => it.id === item.id);
      if (fromList.length > 0) return fromList;
      const fromTree = findItemInTree(data, item.id);
      return fromTree ? [fromTree] : [];
    },
    [list, data],
  );

  const handleUrl = useCallback(
    (item: ITreeItem, k: import('@/request/types').ConstsCrawlerSource) => {
      setKey(k);
      setUrlOpen(true);
      setOpraData(getOperationData(item));
    },
    [getOperationData],
  );

  const handleDelete = useCallback(
    (item: ITreeItem) => {
      setDeleteOpen(true);
      setOpraData(getOperationData(item));
    },
    [getOperationData],
  );

  const handlePublish = useCallback(
    (item: ITreeItem) => onPublishOpen([item.id]),
    [onPublishOpen],
  );

  const handleRestudy = useCallback(
    (item: ITreeItem) => {
      const ragStatus = item.rag_status;
      const needModal =
        ragStatus &&
        [
          ConstsNodeRagInfoStatus.NodeRagStatusFailed,
          ConstsNodeRagInfoStatus.NodeRagStatusPending,
        ].includes(ragStatus);
      if (needModal) {
        onRagOpen([item.id]);
      } else {
        postApiV1NodeRestudy({
          kb_id,
          node_ids: [item.id],
        }).then(() => {
          message.success('正在学习');
          refresh();
        });
      }
    },
    [kb_id, refresh, onRagOpen],
  );

  const handleProperties = useCallback(
    (item: ITreeItem) => {
      setPropertiesOpen(true);
      setOpraData(getOperationData(item));
      setIsBatch(false);
    },
    [getOperationData],
  );

  const handleFrontDoc = useCallback(
    (id: string) => {
      const currentNode = list.find(item => item.id === id);
      if (currentNode?.status !== 2 && !currentNode?.publisher_id) {
        message.warning('当前文档未发布，无法查看前台文档');
        return;
      }
      window.open(`${wikiUrl}/node/${id}`, '_blank');
    },
    [list, wikiUrl],
  );

  const menu = useDocTreeMenu({
    handleUrl,
    handleDelete,
    handlePublish,
    handleRestudy,
    handleProperties,
    handleFrontDoc,
  });

  const updateLocalData = useCallback((newData: ITreeItem[]) => {
    setData([...newData]);
  }, []);

  useEffect(() => {
    if (groups.length === 0) {
      setList([]);
      setData([]);
      setSelected([]);
      setOpraData([]);
      setBatchOpen(false);
      return;
    }
    const curGroup = groups.find(g => g.nav_id === nav_id) || groups[0];
    const nodeList = curGroup?.list || [];
    setList(nodeList);
    const openIds = collectOpenFolderIds(data);
    const collapsedAll = collapseAllFolders(convertToTree(nodeList), true);
    const next = openIds.size
      ? reopenFolders(collapsedAll, openIds)
      : collapsedAll;
    setData(next);
    // 切换目录时清空全选数据
    setSelected([]);
    setOpraData([]);
    setBatchOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav_id, groups]);

  const createLocal = useCallback(
    (node: {
      id: string;
      name: string;
      type: 1 | 2;
      emoji?: string;
      content_type?: string;
    }) => {
      setData(prev => [
        ...prev,
        {
          id: node.id,
          name: node.name,
          level: 0,
          order: prev.length ? (prev[prev.length - 1].order ?? 0) + 1 : 0,
          emoji: node.emoji,
          content_type: node.content_type,
          parentId: undefined,
          children: node.type === 1 ? [] : undefined,
          type: node.type,
          status: 1,
        } as ITreeItem,
      ]);
    },
    [],
  );

  const scrollTo = useCallback((id: string) => {
    setTimeout(() => dragTreeRef.current?.scrollToItem(id), 120);
  }, []);

  const setOpraDataFromSelected = useCallback(() => {
    setOpraData(list.filter(item => selected.includes(item.id!)));
  }, [list, selected]);

  return (
    <>
      <DocPageListContent
        data={data}
        list={list}
        search={search}
        loading={loading}
        selected={selected}
        supportSelect={supportSelect}
        menu={menu}
        updateLocalData={updateLocalData}
        onSelectChange={setSelected}
        onBatchOpen={() => setBatchOpen(true)}
        onMoreSummaryOpen={() => {
          setMoreSummaryOpen(true);
          setOpraDataFromSelected();
        }}
        onMoveOpen={() => {
          setMoveOpen(true);
          setOpraDataFromSelected();
        }}
        onDeleteOpen={() => {
          setDeleteOpen(true);
          setOpraDataFromSelected();
        }}
        onPropertiesOpen={() => {
          setPropertiesOpen(true);
          setIsBatch(true);
          setOpraDataFromSelected();
        }}
        onBatchClose={() => {
          setSelected([]);
          setBatchOpen(false);
        }}
        setOpraData={setOpraData}
        dragTreeRef={dragTreeRef}
        refresh={refresh}
        createLocal={createLocal}
        scrollTo={scrollTo}
        registerTreeDragHandlers={registerTreeDragHandlers}
      />
      <DocListModals
        kb_id={kb_id}
        deleteOpen={deleteOpen}
        opraData={opraData}
        data={data}
        list={list}
        dragTreeRef={dragTreeRef}
        importKey={key}
        urlOpen={urlOpen}
        summaryOpen={summaryOpen}
        moreSummaryOpen={moreSummaryOpen}
        statusOpen={statusOpen}
        moveOpen={moveOpen}
        propertiesOpen={propertiesOpen}
        isBatch={isBatch}
        refresh={refresh}
        setData={setData}
        onCloseDelete={() => {
          setDeleteOpen(false);
          setOpraData([]);
          setSelected([]);
          setBatchOpen(false);
        }}
        onCancelAddDoc={() => {
          setUrlOpen(false);
          setOpraData([]);
        }}
        onCloseSummary={() => {
          setSummaryOpen(false);
          setOpraData([]);
        }}
        onCloseMoreSummary={() => {
          setMoreSummaryOpen(false);
          setOpraData([]);
        }}
        onCloseStatus={() => {
          setStatusOpen(null);
          setOpraData([]);
        }}
        onCloseMove={() => {
          setMoveOpen(false);
          setOpraData([]);
        }}
        onCloseProperties={() => {
          setPropertiesOpen(false);
          setOpraData([]);
        }}
        onOkProperties={() => {
          refresh();
          setPropertiesOpen(false);
          setOpraData([]);
        }}
        removeDeep={removeDeep}
      />
    </>
  );
};

export default DocPageListContainer;
