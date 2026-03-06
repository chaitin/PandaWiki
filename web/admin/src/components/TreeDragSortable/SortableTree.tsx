import {
  Announcements,
  closestCenter,
  defaultDropAnimation,
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  Modifier,
  PointerSensor,
  PointerSensorOptions,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  UseSortableArguments,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { SortableTreeItem } from './SortableTreeItem';
import { customListSortingStrategy } from './SortingStrategy';
import type {
  FlattenedItem,
  ItemChangedReason,
  SensorContext,
  TreeItemComponentType,
  TreeItems,
} from './types';
import {
  buildTree,
  findItemDeep,
  flattenTree,
  getChildCount,
  getProjection,
  removeChildrenOf,
  removeItem,
  setProperty,
} from './utilities';

export type TreeDragHandlers = {
  onDragStart: (e: DragStartEvent) => void;
  onDragMove: (e: DragMoveEvent) => void;
  onDragOver: (e: DragOverEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  onDragCancel: () => void;
};

export type SortableTreeProps<
  TData extends Record<string, any>,
  TElement extends HTMLElement,
> = {
  items: TreeItems<TData>;
  onItemsChanged(
    items: TreeItems<TData>,
    reason: ItemChangedReason<TData>,
  ): void;
  TreeItemComponent: TreeItemComponentType<TData, TElement>;
  indentationWidth?: number;
  indicator?: boolean;
  pointerSensorOptions?: PointerSensorOptions;
  disableSorting?: boolean;
  dropAnimation?: DropAnimation | null;
  dndContextProps?: React.ComponentProps<typeof DndContext>;
  sortableProps?: Omit<UseSortableArguments, 'id'>;
  keepGhostInPlace?: boolean;
  canRootHaveChildren?: boolean | ((dragItem: FlattenedItem<TData>) => boolean);
  virtualized?: boolean;
  virtualizedHeight?: number | string;
  /** 当使用外部 DndContext 时传入，注册拖拽回调以便父级统一处理 onDragEnd 等 */
  registerDragHandlers?: (handlers: TreeDragHandlers | null) => void;
};

export type SortableTreeHandle = {
  scrollToItem: (itemId: UniqueIdentifier) => void;
};
const defaultPointerSensorOptions: PointerSensorOptions = {
  activationConstraint: {
    distance: 3,
  },
};

export const dropAnimationDefaultConfig: DropAnimation = {
  keyframes({ transform }) {
    return [
      { opacity: 1, transform: CSS.Transform.toString(transform.initial) },
      {
        opacity: 0,
        transform: CSS.Transform.toString({
          ...transform.final,
          x: transform.final.x + 5,
          y: transform.final.y + 5,
        }),
      },
    ];
  },
  easing: 'ease-out',
  sideEffects({ active }) {
    active.node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: defaultDropAnimation.duration,
      easing: defaultDropAnimation.easing,
    });
  },
};

function SortableTreeInner<
  TreeItemData extends Record<string, any>,
  TElement extends HTMLElement = HTMLDivElement,
>(
  {
    items,
    indicator,
    indentationWidth = 20,
    onItemsChanged,
    TreeItemComponent,
    pointerSensorOptions,
    disableSorting,
    dropAnimation,
    dndContextProps,
    sortableProps,
    keepGhostInPlace,
    canRootHaveChildren,
    virtualized = false,
    virtualizedHeight = '100%',
    registerDragHandlers,
    ...rest
  }: SortableTreeProps<TreeItemData, TElement>,
  ref: React.Ref<SortableTreeHandle>,
) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<{
    parentId: UniqueIdentifier | null;
    overId: UniqueIdentifier;
  } | null>(null);

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const flattenedItems = useMemo(() => {
    const flattenedTree = flattenTree(items);
    const collapsedItems = flattenedTree.reduce<UniqueIdentifier[]>(
      (acc, { children, collapsed, id }) =>
        collapsed && children?.length ? [...acc, id] : acc,
      [],
    );

    const result = removeChildrenOf(
      flattenedTree,
      activeId ? [activeId, ...collapsedItems] : collapsedItems,
    );
    return result;
  }, [activeId, items]);
  const projected = getProjection(
    flattenedItems,
    activeId,
    overId,
    offsetLeft,
    indentationWidth,
    keepGhostInPlace ?? false,
    canRootHaveChildren,
  );
  const sensorContext: SensorContext<TreeItemData> = useRef({
    items: flattenedItems,
    offset: offsetLeft,
  });
  const sensors = useSensors(
    useSensor(
      PointerSensor,
      pointerSensorOptions ?? defaultPointerSensorOptions,
    ),
  );

  const sortedIds = useMemo(
    () => flattenedItems.map(({ id }) => id),
    [flattenedItems],
  );
  const activeItem = activeId
    ? flattenedItems.find(({ id }) => id === activeId)
    : null;

  useEffect(() => {
    sensorContext.current = {
      items: flattenedItems,
      offset: offsetLeft,
    };
  }, [flattenedItems, offsetLeft]);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Refs for handlers when using external DndContext (registerDragHandlers)
  const handleDragStartRef = useRef<(e: DragStartEvent) => void>(() => {});
  const handleDragMoveRef = useRef<(e: DragMoveEvent) => void>(() => {});
  const handleDragOverRef = useRef<(e: DragOverEvent) => void>(() => {});
  const handleDragEndRef = useRef<(e: DragEndEvent) => void>(() => {});
  const handleDragCancelRef = useRef<() => void>(() => {});

  const handleRemove = useCallback(
    (id: string) => {
      const item = findItemDeep(itemsRef.current, id)!;
      onItemsChanged(removeItem(itemsRef.current, id), {
        type: 'removed',
        item,
      });
    },
    [onItemsChanged],
  );

  const handleCollapse = useCallback(
    function handleCollapse(id: string) {
      const item = findItemDeep(itemsRef.current, id)!;
      onItemsChanged(
        setProperty(itemsRef.current, id, 'collapsed', ((value: boolean) => {
          return !value;
        }) as any),
        {
          type: item.collapsed ? 'collapsed' : 'expanded',
          item: item,
        },
      );
    },
    [onItemsChanged],
  );

  const announcements: Announcements = useMemo(
    () => ({
      onDragStart({ active }) {
        return `Picked up ${active.id}.`;
      },
      onDragMove({ active, over }) {
        return getMovementAnnouncement('onDragMove', active.id, over?.id);
      },
      onDragOver({ active, over }) {
        return getMovementAnnouncement('onDragOver', active.id, over?.id);
      },
      onDragEnd({ active, over }) {
        return getMovementAnnouncement('onDragEnd', active.id, over?.id);
      },
      onDragCancel({ active }) {
        return `Moving was cancelled. ${active.id} was dropped in its original position.`;
      },
    }),
    [],
  );

  const strategyCallback = useCallback(() => {
    return !!projected;
  }, [projected]);

  // 暴露滚动到指定项的方法
  useImperativeHandle(
    ref,
    () => ({
      scrollToItem: (itemId: UniqueIdentifier) => {
        const index = flattenedItems.findIndex(item => item.id === itemId);
        if (index !== -1 && virtuosoRef.current) {
          virtuosoRef.current.scrollToIndex({
            index,
            align: 'center',
            behavior: 'smooth',
          });
        }
      },
    }),
    [flattenedItems],
  );

  const renderItem = useCallback(
    (index: number) => {
      const item = flattenedItems[index];
      return (
        <SortableTreeItem
          {...rest}
          key={item.id}
          id={item.id as any}
          item={item}
          childCount={item.children?.length}
          depth={
            item.id === activeId && projected && !keepGhostInPlace
              ? projected.depth
              : item.depth
          }
          indentationWidth={indentationWidth}
          indicator={indicator}
          collapsed={Boolean(item.collapsed && item.children?.length)}
          onCollapse={item.children?.length ? handleCollapse : undefined}
          onRemove={handleRemove}
          isLast={
            item.id === activeId && projected ? projected.isLast : item.isLast
          }
          parent={
            item.id === activeId && projected ? projected.parent : item.parent
          }
          TreeItemComponent={TreeItemComponent}
          disableSorting={disableSorting}
          sortableProps={sortableProps}
          keepGhostInPlace={keepGhostInPlace}
        />
      );
    },
    [
      flattenedItems,
      rest,
      activeId,
      projected,
      keepGhostInPlace,
      indentationWidth,
      indicator,
      handleCollapse,
      handleRemove,
      TreeItemComponent,
      disableSorting,
      sortableProps,
    ],
  );

  const treeContent = (
    <SortableContext
      items={sortedIds}
      strategy={
        disableSorting ? undefined : customListSortingStrategy(strategyCallback)
      }
    >
      {virtualized ? (
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: virtualizedHeight }}
          totalCount={flattenedItems.length}
          itemContent={renderItem}
          increaseViewportBy={{ top: 200, bottom: 200 }}
          overscan={5}
        />
      ) : (
        flattenedItems.map(item => {
          return (
            <SortableTreeItem
              {...rest}
              key={item.id}
              id={item.id as any}
              item={item}
              childCount={item.children?.length}
              depth={
                item.id === activeId && projected && !keepGhostInPlace
                  ? projected.depth
                  : item.depth
              }
              indentationWidth={indentationWidth}
              indicator={indicator}
              collapsed={Boolean(item.collapsed && item.children?.length)}
              onCollapse={item.children?.length ? handleCollapse : undefined}
              onRemove={handleRemove}
              isLast={
                item.id === activeId && projected
                  ? projected.isLast
                  : item.isLast
              }
              parent={
                item.id === activeId && projected
                  ? projected.parent
                  : item.parent
              }
              TreeItemComponent={TreeItemComponent}
              disableSorting={disableSorting}
              sortableProps={sortableProps}
              keepGhostInPlace={keepGhostInPlace}
            />
          );
        })
      )}
      {createPortal(
        <DragOverlay
          dropAnimation={
            dropAnimation === undefined
              ? dropAnimationDefaultConfig
              : dropAnimation
          }
        >
          {activeId && activeItem ? (
            <TreeItemComponent
              {...rest}
              item={activeItem}
              children={[]}
              depth={activeItem.depth}
              clone
              childCount={getChildCount(items, activeId) + 1}
              indentationWidth={indentationWidth}
              isLast={false}
              parent={activeItem.parent}
              isOver={false}
              isOverParent={false}
            />
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </SortableContext>
  );

  function resetState() {
    setOverId(null);
    setActiveId(null);
    setOffsetLeft(0);
    setCurrentPosition(null);
    document.body.style.setProperty('cursor', '');
  }

  function handleDragStart(event: DragStartEvent) {
    const activeId = event.active.id;
    setActiveId(activeId);
    setOverId(activeId);
    const activeItem = flattenedItems.find(({ id }) => id === activeId);
    if (activeItem) {
      setCurrentPosition({
        parentId: activeItem.parentId,
        overId: activeId,
      });
    }
    document.body.style.setProperty('cursor', 'grabbing');
  }
  handleDragStartRef.current = handleDragStart;

  function handleDragMove(event: DragMoveEvent) {
    setOffsetLeft(event.delta.x);
  }
  handleDragMoveRef.current = handleDragMove;

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over?.id ?? null);
  }
  handleDragOverRef.current = handleDragOver;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    resetState();
    if (projected && over) {
      const { depth, parentId } = projected;
      if (keepGhostInPlace && over.id === active.id) return;
      const clonedItems: FlattenedItem<TreeItemData>[] = flattenTree(items);
      const overIndex = clonedItems.findIndex(({ id }) => id === over.id);
      const activeIndex = clonedItems.findIndex(({ id }) => id === active.id);
      const activeTreeItem = clonedItems[activeIndex];
      clonedItems[activeIndex] = { ...activeTreeItem, depth, parentId };
      const draggedFromParent = activeTreeItem.parent;
      const sortedItems = arrayMove(clonedItems, activeIndex, overIndex);
      const newItems = buildTree(sortedItems);
      const newActiveItem = sortedItems.find(x => x.id === active.id)!;
      const currentParent = newActiveItem.parentId
        ? sortedItems.find(x => x.id === newActiveItem.parentId)!
        : null;
      setTimeout(() =>
        onItemsChanged(newItems, {
          type: 'dropped',
          draggedItem: newActiveItem,
          draggedFromParent: draggedFromParent,
          droppedToParent: currentParent,
        }),
      );
    }
  }
  handleDragEndRef.current = handleDragEnd;

  function handleDragCancel() {
    resetState();
  }
  handleDragCancelRef.current = handleDragCancel;

  useEffect(() => {
    if (!registerDragHandlers) return;
    registerDragHandlers({
      onDragStart: (e: DragStartEvent) => handleDragStartRef.current(e),
      onDragMove: (e: DragMoveEvent) => handleDragMoveRef.current(e),
      onDragOver: (e: DragOverEvent) => handleDragOverRef.current(e),
      onDragEnd: (e: DragEndEvent) => handleDragEndRef.current(e),
      onDragCancel: () => handleDragCancelRef.current(),
    });
    return () => registerDragHandlers(null);
  }, [registerDragHandlers]);

  if (registerDragHandlers) {
    return treeContent;
  }

  return (
    <DndContext
      accessibility={{ announcements }}
      sensors={disableSorting ? undefined : sensors}
      modifiers={indicator ? modifiersArray : undefined}
      collisionDetection={closestCenter}
      onDragStart={disableSorting ? undefined : handleDragStart}
      onDragMove={disableSorting ? undefined : handleDragMove}
      onDragOver={disableSorting ? undefined : handleDragOver}
      onDragEnd={disableSorting ? undefined : handleDragEnd}
      onDragCancel={disableSorting ? undefined : handleDragCancel}
      {...dndContextProps}
    >
      {treeContent}
    </DndContext>
  );

  function getMovementAnnouncement(
    eventName: string,
    activeId: UniqueIdentifier,
    overId?: UniqueIdentifier,
  ) {
    if (overId && projected) {
      if (eventName !== 'onDragEnd') {
        if (
          currentPosition &&
          projected.parentId === currentPosition.parentId &&
          overId === currentPosition.overId
        ) {
          return;
        } else {
          setCurrentPosition({
            parentId: projected.parentId,
            overId,
          });
        }
      }

      const clonedItems: FlattenedItem<TreeItemData>[] = flattenTree(items);
      const overIndex = clonedItems.findIndex(({ id }) => id === overId);
      const activeIndex = clonedItems.findIndex(({ id }) => id === activeId);
      const sortedItems = arrayMove(clonedItems, activeIndex, overIndex);

      const previousItem = sortedItems[overIndex - 1];

      let announcement;
      const movedVerb = eventName === 'onDragEnd' ? 'dropped' : 'moved';
      const nestedVerb = eventName === 'onDragEnd' ? 'dropped' : 'nested';

      if (!previousItem) {
        const nextItem = sortedItems[overIndex + 1];
        announcement = `${activeId} was ${movedVerb} before ${nextItem.id}.`;
      } else {
        if (projected.depth > previousItem.depth) {
          announcement = `${activeId} was ${nestedVerb} under ${previousItem.id}.`;
        } else {
          let previousSibling: FlattenedItem<TreeItemData> | undefined =
            previousItem;
          while (previousSibling && projected.depth < previousSibling.depth) {
            const parentId: UniqueIdentifier | null = previousSibling.parentId;
            previousSibling = sortedItems.find(({ id }) => id === parentId);
          }

          if (previousSibling) {
            announcement = `${activeId} was ${movedVerb} after ${previousSibling.id}.`;
          }
        }
      }

      return announcement;
    }

    return;
  }
}

const adjustTranslate: Modifier = ({ transform }) => {
  return {
    ...transform,
    y: transform.y - 25,
  };
};
const modifiersArray = [adjustTranslate];

export const SortableTree = React.forwardRef(SortableTreeInner) as <
  TreeItemData extends Record<string, any>,
  TElement extends HTMLElement = HTMLDivElement,
>(
  props: SortableTreeProps<TreeItemData, TElement> & {
    ref?: React.Ref<SortableTreeHandle>;
  },
) => React.ReactElement;
