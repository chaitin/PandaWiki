import { useURLSearchParams } from '@/hooks';
import VersionPublish from '@/pages/release/components/VersionPublish';
import { postApiV1NavMove } from '@/request/Nav';
import { getApiV1NodeListGroupNav, postApiV1NodeMoveNav } from '@/request/Node';
import {
  GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp,
  V1NavListResp,
} from '@/request/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { setIsRefreshDocList, setNavId } from '@/store/slices/config';
import type { TreeDragHandlers } from '@/utils/drag';
import { message } from '@ctzhian/ui';
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Stack } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RagErrorReStart from '../component/RagErrorReStart';
import DocPageHeader from './DocPageHeader';
import DocPageList from './DocPageList';
import DocPageNavs from './DocPageNavs';

const Content = () => {
  const { kb_id, isRefreshDocList, kbList } = useAppSelector(
    state => state.config,
  );
  const dispatch = useAppDispatch();
  const nav_id = useAppSelector(state => state.config.nav_id) || undefined;

  const [searchParams] = useURLSearchParams();
  const search = searchParams.get('search') || '';

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishIds, setPublishIds] = useState<string[]>([]);
  const [ragOpen, setRagOpen] = useState(false);
  const [ragIds, setRagIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<
    GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp[]
  >([]);
  const [navList, setNavList] = useState<V1NavListResp[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const getData = useCallback(() => {
    if (!kb_id) {
      setLoading(false);
      return;
    }
    const params: { kb_id: string; search?: string } = { kb_id };
    if (search) params.search = search;
    setLoading(true);
    getApiV1NodeListGroupNav(params)
      .then(res => {
        const list = res || [];
        setGroups(list);
        const nextNavList = list
          .map(g => ({
            id: g.nav_id,
            name: g.nav_name,
            position: g.position ?? 0,
          }))
          .filter(n => n.id)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        setNavList(nextNavList);
        if (nextNavList.length > 0) {
          const storedNavId = kb_id
            ? localStorage.getItem(`nav_id_${kb_id}`)
            : null;
          const validInList =
            storedNavId && nextNavList.some(n => n.id === storedNavId);
          const idToUse = validInList ? storedNavId! : nextNavList[0].id!;
          dispatch(setNavId(idToUse));
        } else {
          dispatch(setNavId(''));
        }
        setHasLoadedOnce(true);
      })
      .finally(() => setLoading(false));
  }, [search, kb_id, dispatch]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refresh = useCallback(() => {
    getData();
    setRefreshTrigger(t => t + 1);
  }, [getData]);

  const currentKb = useMemo(() => {
    return kbList?.find(item => item.id === kb_id);
  }, [kbList, kb_id]);

  const [wikiUrl, setWikiUrl] = useState<string>('');
  const treeDragHandlersRef = useRef<TreeDragHandlers | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
  );

  const handleLayoutDragStart = useCallback((e: DragStartEvent) => {
    treeDragHandlersRef.current?.onDragStart?.(e);
  }, []);
  const handleLayoutDragMove = useCallback((e: DragMoveEvent) => {
    treeDragHandlersRef.current?.onDragMove?.(e);
  }, []);
  const handleLayoutDragOver = useCallback((e: DragOverEvent) => {
    treeDragHandlersRef.current?.onDragOver?.(e);
  }, []);
  const handleLayoutDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over) {
        treeDragHandlersRef.current?.onDragEnd?.(e);
        return;
      }
      const navIds = (navList || [])
        .map(n => n.id)
        .filter((id): id is string => !!id);
      const overIsNav = navIds.includes(over.id as string);
      const activeIsNav = navIds.includes(active.id as string);

      if (overIsNav && activeIsNav) {
        // 目录之间拖拽排序
        const sorted = [...(navList || [])].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0),
        );
        const oldIndex = sorted.findIndex(n => (n.id || '') === active.id);
        const newIndex = sorted.findIndex(n => (n.id || '') === over.id);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(sorted, oldIndex, newIndex);
          const next = reordered.map((item, index) => ({
            ...item,
            position: index,
          }));
          setNavList(next);
          const prevId = next[newIndex - 1]?.id;
          const nextId = next[newIndex + 1]?.id;
          postApiV1NavMove({
            id: active.id as string,
            kb_id: kb_id!,
            prev_id: prevId,
            next_id: nextId,
          }).then(() => {
            message.success('顺序已更新');
            refresh();
          });
        }
        return;
      }
      if (overIsNav && !activeIsNav) {
        // 如果文档/文件夹本来就在该目录中，则不调用移动接口
        const targetNavId = over.id as string;
        const isAlreadyInTargetNav = groups.some(
          g =>
            g.nav_id === targetNavId &&
            (g.list || []).some(item => item.id === active.id),
        );
        if (isAlreadyInTargetNav) {
          treeDragHandlersRef.current?.onDragCancel?.();
          return;
        }

        // 文档树节点拖到目录
        treeDragHandlersRef.current?.onDragCancel?.();
        postApiV1NodeMoveNav({
          ids: [active.id as string],
          kb_id: kb_id!,
          nav_id: over.id as string,
        }).then(() => {
          message.success('已移动到该目录');
          refresh();
        });
        return;
      }
      treeDragHandlersRef.current?.onDragEnd?.(e);
    },
    [kb_id, navList, refresh, groups],
  );
  const handleLayoutDragCancel = useCallback(() => {
    treeDragHandlersRef.current?.onDragCancel?.();
  }, []);

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
      refresh();
      dispatch(setIsRefreshDocList(false));
    }
  }, [isRefreshDocList, refresh, dispatch]);

  return (
    <>
      <DocPageHeader
        onPublishClick={() => {
          setPublishIds([]);
          setPublishOpen(true);
        }}
        onRagClick={() => {
          setRagIds([]);
          setRagOpen(true);
        }}
        refreshTrigger={refreshTrigger}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleLayoutDragStart}
        onDragMove={handleLayoutDragMove}
        onDragOver={handleLayoutDragOver}
        onDragEnd={handleLayoutDragEnd}
        onDragCancel={handleLayoutDragCancel}
      >
        <Stack direction={'row'} sx={{ mt: 2 }}>
          <DocPageNavs
            navList={navList}
            onNavListChange={setNavList}
            onNavDeleted={navId => {
              setGroups(prev => prev.filter(g => g.nav_id !== navId));
            }}
            refresh={refresh}
            isSearching={!!search}
            loading={loading && !hasLoadedOnce}
          />
          <DocPageList
            groups={groups}
            nav_id={nav_id}
            search={search}
            refresh={refresh}
            wikiUrl={wikiUrl}
            loading={loading && !hasLoadedOnce}
            onPublishOpen={ids => {
              setPublishIds(ids ?? []);
              setPublishOpen(true);
            }}
            onRagOpen={ids => {
              setRagIds(ids ?? []);
              setRagOpen(true);
            }}
            registerTreeDragHandlers={handlers => {
              treeDragHandlersRef.current = handlers;
            }}
          />
        </Stack>
      </DndContext>
      <VersionPublish
        open={publishOpen}
        defaultSelected={publishIds}
        onClose={() => {
          setPublishOpen(false);
          setPublishIds([]);
        }}
        refresh={refresh}
      />
      <RagErrorReStart
        open={ragOpen}
        defaultSelected={ragIds}
        onClose={() => {
          setRagOpen(false);
          setRagIds([]);
        }}
        refresh={refresh}
      />
    </>
  );
};

export default Content;
