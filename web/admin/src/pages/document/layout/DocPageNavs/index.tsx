import Card from '@/components/Card';
import Cascader from '@/components/Cascader';
import EmptyState from '@/components/EmptyState';
import Loading from '@/components/Loading';
import { useURLSearchParams } from '@/hooks';
import { deleteApiV1NavDelete } from '@/request/Nav';
import type { V1NavListResp } from '@/request/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { setIsRefreshDocList, setNavId } from '@/store/slices/config';
import { addOpacityToColor } from '@/utils';
import { Ellipsis, message, Modal } from '@ctzhian/ui';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  useTheme,
} from '@mui/material';
import {
  IconDrag,
  IconGengduo,
  IconJiahao,
  IconXiajiantou,
} from '@panda-wiki/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import NavEditModal from './NavEditModal';

const SortableNavItem = ({
  nav,
  selected,
  onSelect,
  onEdit,
  onDelete,
  showDelete,
  isLast,
  selectedItemRef,
}: {
  nav: V1NavListResp;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showDelete: boolean;
  isLast: boolean;
  selectedItemRef?: React.RefObject<HTMLDivElement | null>;
}) => {
  const theme = useTheme();
  const id = nav.id || '';
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id });

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el);
      if (selected && selectedItemRef) {
        (
          selectedItemRef as React.MutableRefObject<HTMLDivElement | null>
        ).current = el;
      }
    },
    [setNodeRef, selected, selectedItemRef],
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const menuItems = [
    {
      key: 'edit',
      label: (
        <Stack
          direction='row'
          alignItems='center'
          sx={{
            fontSize: 14,
            px: 2,
            lineHeight: '40px',
            height: 40,
            width: 140,
            borderRadius: '5px',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1),
            },
          }}
        >
          修改目录
        </Stack>
      ),
      onClick: onEdit,
    },
    ...(showDelete
      ? [
          {
            key: 'delete',
            label: (
              <Stack
                direction='row'
                alignItems='center'
                sx={{
                  fontSize: 14,
                  px: 2,
                  lineHeight: '40px',
                  height: 40,
                  width: 140,
                  borderRadius: '5px',
                  cursor: 'pointer',
                  color: 'error.main',
                  '&:hover': {
                    bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                删除目录
              </Stack>
            ),
            onClick: onDelete,
          },
        ]
      : []),
  ];

  return (
    <Box
      ref={setRef}
      style={style}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 2,
        cursor: 'pointer',
        ...(!isLast && {
          borderBottom: '1px dashed',
          borderColor: 'divider',
        }),
        '&:hover .nav-name': {
          color: 'primary.main',
        },
        opacity: isDragging ? 0.5 : 1,
        ...(isOver && {
          bgcolor: addOpacityToColor(theme.palette.primary.main, 0.12),
          borderRadius: 1,
        }),
      }}
      onClick={onSelect}
    >
      {selected && (
        <Box
          sx={{
            position: 'absolute',
            left: -2,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 4,
            height: 24,
            borderRadius: 1,
            bgcolor: 'primary.main',
          }}
        />
      )}
      <Box
        {...attributes}
        {...listeners}
        component='span'
        onClick={e => e.stopPropagation()}
        sx={{
          display: 'flex',
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <IconDrag sx={{ fontSize: 16 }} />
      </Box>
      <Ellipsis
        className='nav-name'
        sx={{
          flex: 1,
          width: 0,
          fontSize: 14,
          fontWeight: selected ? 600 : 400,
          color: selected ? 'primary.main' : 'text.primary',
        }}
      >
        {nav.name || '未命名'}
      </Ellipsis>
      <Box onClick={e => e.stopPropagation()} sx={{ display: 'inline-flex' }}>
        <Cascader
          list={menuItems}
          context={
            <IconButton size='small'>
              <IconGengduo sx={{ fontSize: 16 }} />
            </IconButton>
          }
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        />
      </Box>
    </Box>
  );
};

interface DocPageNavsProps {
  navList: V1NavListResp[];
  onNavListChange: React.Dispatch<React.SetStateAction<V1NavListResp[]>>;
  onNavDeleted?: (navId: string) => void;
  /** 目录修改/移动后刷新 Header 统计 */
  refresh?: () => void;
  isSearching?: boolean;
  loading?: boolean;
}

const DocPageNavs = ({
  navList: navListProp,
  onNavListChange,
  onNavDeleted,
  refresh,
  isSearching = false,
  loading = false,
}: DocPageNavsProps) => {
  const dispatch = useAppDispatch();
  const { kb_id } = useAppSelector(state => state.config);
  const [searchParams, setSearchParams] = useURLSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingNav, setEditingNav] = useState<V1NavListResp | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingNav, setDeletingNav] = useState<V1NavListResp | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const selectedItemRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToSelectedRef = useRef(false);
  const [expend, setExpend] = useState(
    localStorage.getItem(`doc_nav_expend_${kb_id}`) !== '0',
  );

  useEffect(() => {
    if (!kb_id) return;
    const stored = localStorage.getItem(`doc_nav_expend_${kb_id}`);
    if (stored === '0') {
      setExpend(false);
    } else if (stored === '1') {
      setExpend(true);
    }
  }, [kb_id]);

  useEffect(() => {
    if (!kb_id) return;
    localStorage.setItem(`doc_nav_expend_${kb_id}`, expend ? '1' : '0');
  }, [kb_id, expend]);

  const navs = navListProp || [];
  const sortedNavs = [...navs].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );

  useEffect(() => {
    const navIdFromStorage = kb_id
      ? localStorage.getItem(`nav_id_${kb_id}`)
      : null;
    const validInList = (id: string | null) =>
      id && sortedNavs.some(n => n.id === id);
    if (sortedNavs.length > 0) {
      const idToUse = validInList(navIdFromStorage)
        ? navIdFromStorage!
        : sortedNavs[0]?.id || null;
      if (idToUse) {
        setSelectedId(idToUse);
        dispatch(setNavId(idToUse));
      }
    } else {
      setSelectedId(null);
      const rest: Record<string, string> = {};
      searchParams.forEach((v, k) => {
        if (k !== 'nav_id') rest[k] = v;
      });
      setSearchParams(Object.keys(rest).length ? rest : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kb_id, navListProp]);

  useEffect(() => {
    if (
      !selectedId ||
      !sortedNavs.length ||
      hasScrolledToSelectedRef.current ||
      !selectedItemRef.current
    ) {
      return;
    }
    hasScrolledToSelectedRef.current = true;
    selectedItemRef.current.scrollIntoView({
      behavior: 'auto',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [selectedId, sortedNavs.length]);

  useEffect(() => {
    hasScrolledToSelectedRef.current = false;
  }, [kb_id]);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      dispatch(setNavId(id));
    },
    [dispatch],
  );

  const handleEdit = useCallback((nav: V1NavListResp) => {
    setEditingNav(nav);
    setEditOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingNav(null);
    setEditOpen(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setEditOpen(false);
    setEditingNav(null);
  }, []);

  const handleEditSuccess = useCallback(
    (updated?: { id: string; name: string }) => {
      if (updated) {
        onNavListChange(prev =>
          prev.map(n =>
            n.id === updated.id ? { ...n, name: updated.name } : n,
          ),
        );
        refresh?.();
      } else {
        dispatch(setIsRefreshDocList(true));
      }
      handleEditClose();
    },
    [onNavListChange, handleEditClose, dispatch, refresh],
  );

  const handleDeleteClick = useCallback((nav: V1NavListResp) => {
    setDeletingNav(nav);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirmClose = useCallback(() => {
    setDeleteConfirmOpen(false);
    setDeletingNav(null);
    setDeleteConfirmInput('');
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deletingNav) return;
    const nav = deletingNav;
    deleteApiV1NavDelete({ id: nav.id!, kb_id }).then(() => {
      message.success('删除成功');
      handleDeleteConfirmClose();
      const next = (navListProp || []).filter(n => n.id !== nav.id);
      onNavListChange(next);
      onNavDeleted?.(nav.id!);
      refresh?.();
      if (selectedId === nav.id && next.length > 0) {
        const first = next[0];
        if (first?.id) {
          setSelectedId(first.id);
          dispatch(setNavId(first.id));
        }
      } else if (next.length === 0) {
        setSelectedId(null);
        dispatch(setNavId(''));
        const rest: Record<string, string> = {};
        searchParams.forEach((v, k) => {
          if (k !== 'nav_id') rest[k] = v;
        });
        setSearchParams(Object.keys(rest).length ? rest : null);
      }
    });
  }, [
    deletingNav,
    kb_id,
    selectedId,
    navListProp,
    searchParams,
    setSearchParams,
    handleDeleteConfirmClose,
    onNavListChange,
    onNavDeleted,
    refresh,
    dispatch,
  ]);

  const showEmptySearch = isSearching && sortedNavs.length === 0;

  return (
    <Box sx={{ position: 'relative' }}>
      <Card
        sx={{
          width: expend ? 220 : 0,
          height: '100%',
          mr: expend ? 2 : 0,
          transition: 'width 0.1s ease-in-out, mr 0.1s ease-in-out',
        }}
      >
        {loading ? (
          <Loading sx={{ py: 4 }} />
        ) : showEmptySearch ? (
          <EmptyState text='无搜索结果' sx={{ p: 4 }} />
        ) : (
          <>
            <SortableContext
              items={sortedNavs.map(n => n.id || '')}
              strategy={verticalListSortingStrategy}
            >
              <Stack
                sx={{ maxHeight: 'calc(100vh - 216px)', overflowY: 'auto' }}
              >
                {sortedNavs.map((nav, i) => (
                  <SortableNavItem
                    key={nav.id}
                    nav={nav}
                    selected={selectedId === nav.id}
                    onSelect={() => handleSelect(nav.id!)}
                    onEdit={() => handleEdit(nav)}
                    onDelete={() => handleDeleteClick(nav)}
                    showDelete={sortedNavs.length > 1}
                    isLast={i === sortedNavs.length - 1}
                    selectedItemRef={selectedItemRef}
                  />
                ))}
              </Stack>
            </SortableContext>
            {!isSearching && (
              <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}>
                <Button
                  fullWidth
                  variant='text'
                  startIcon={
                    <IconJiahao sx={{ fontSize: '10px !important' }} />
                  }
                  onClick={handleAdd}
                  sx={{
                    justifyContent: 'center',
                    textTransform: 'none',
                  }}
                >
                  添加目录
                </Button>
              </Box>
            )}
          </>
        )}
      </Card>
      <Box
        sx={{
          position: 'absolute',
          height: '40px',
          width: '10px',
          bgcolor: 'background.paper3',
          borderRadius: '5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          right: 3,
          top: '50%',
          transform: 'translateY(-50%)',
          ':hover': {
            bgcolor: 'background.paper',
            svg: {
              color: 'text.tertiary',
            },
          },
        }}
        onClick={() => setExpend(!expend)}
      >
        <IconXiajiantou
          sx={{
            fontSize: 16,
            color: '#cccccc',
            transform: 'rotate(-90deg)',
            transition: 'all 0.1s ease-in-out',
            ...(expend && {
              transform: 'rotate(90deg)',
            }),
          }}
        />
      </Box>
      <NavEditModal
        open={editOpen}
        onClose={handleEditClose}
        onSuccess={handleEditSuccess}
        nav={editingNav}
        kb_id={kb_id}
      />
      <Modal
        title={
          <Stack direction='row' alignItems='center' gap={1}>
            <ErrorOutlineIcon sx={{ color: 'warning.main' }} />
            确认删除目录？
          </Stack>
        }
        open={deleteConfirmOpen}
        width={480}
        okText='确认删除'
        okButtonProps={{
          sx: { bgcolor: 'error.main' },
          disabled: deleteConfirmInput !== (deletingNav?.name || '未命名'),
        }}
        onCancel={handleDeleteConfirmClose}
        onOk={handleDeleteConfirm}
      >
        <Box sx={{ fontSize: 14, lineHeight: 1.6, color: 'text.secondary' }}>
          <Box component='p' sx={{ m: 0, mb: 1 }}>
            删除目录「
            <Box component='span' sx={{ fontWeight: 600 }}>
              {deletingNav?.name || '未命名'}
            </Box>
            」后，将
            <Box component='span' sx={{ color: 'error.main', fontWeight: 600 }}>
              同步删除该目录下所有文档
            </Box>
            ，且
            <Box component='span' sx={{ color: 'error.main', fontWeight: 600 }}>
              不可恢复
            </Box>
            ，请谨慎操作。
          </Box>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              size='small'
              placeholder={`请输入当前目录名称，并确认删除`}
              value={deleteConfirmInput}
              onChange={e => setDeleteConfirmInput(e.target.value)}
              error={
                deleteConfirmInput.length > 0 &&
                deleteConfirmInput !== (deletingNav?.name || '未命名')
              }
              helperText={
                deleteConfirmInput.length > 0 &&
                deleteConfirmInput !== (deletingNav?.name || '未命名')
                  ? '名称不正确，请输入正确的目录名称'
                  : ''
              }
              sx={{ '& .MuiFormHelperText-root': { m: 0, mt: 0.5 } }}
            />
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default DocPageNavs;
