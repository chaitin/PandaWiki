import { ITreeItem } from '@/api';
import Cascader from '@/components/Cascader';
import Loading from '@/components/Loading';
import { setProperty } from '@/components/TreeDragSortable/utilities';
import {
  DomainNodeListItemResp,
  GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp,
  V1NodeDetailResp,
} from '@/request/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { setNavId } from '@/store/slices/config';
import { addOpacityToColor } from '@/utils';
import { convertToTree } from '@/utils/drag';
import { Ellipsis } from '@ctzhian/ui';
import {
  alpha,
  Box,
  Button,
  IconButton,
  Popover,
  Stack,
  useTheme,
} from '@mui/material';
import {
  IconIcon_tool_close,
  IconJiahao,
  IconMulushouqi,
  IconWenjian,
  IconWenjianjia,
  IconXiajiantou,
  IconXiala,
} from '@panda-wiki/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DocAddByCustomText from '../../component/DocAddByCustomText';
import KBSwitch from './KBSwitch';

function getFirstDocIdInTree(items: ITreeItem[]): string | undefined {
  for (const item of items) {
    if (item.type === 2) return item.id;
    if (item.children?.length) {
      const found = getFirstDocIdInTree(item.children);
      if (found) return found;
    }
  }
  return undefined;
}

function getFirstDocId(
  list: DomainNodeListItemResp[] = [],
): string | undefined {
  const tree = convertToTree(list);
  return getFirstDocIdInTree(tree);
}

interface CatalogProps {
  curNode: V1NodeDetailResp;
  setCatalogOpen: (open: boolean) => void;
  catalogData: ITreeItem[];
  groups: GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp[];
  nav_id: string;
  loading?: boolean;
  onRefresh: () => Promise<
    GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp[]
  >;
  onSaveCurrentDoc?: () => Promise<void>;
}

const Catalog = ({
  curNode,
  setCatalogOpen,
  catalogData: externalData,
  groups,
  nav_id,
  loading = false,
  onRefresh,
  onSaveCurrentDoc,
}: CatalogProps) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { pathname } = useLocation();
  const { kb_id = '' } = useAppSelector(state => state.config);

  const isHistory = useMemo(() => {
    return pathname.includes('/doc/editor/history');
  }, [pathname]);

  const [data, setData] = useState<ITreeItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );

  const [opraParentId, setOpraParentId] = useState<string>('');
  const [docFileKey, setDocFileKey] = useState<1 | 2>(1);
  const [customDocOpen, setCustomDocOpen] = useState(false);
  const [navPopoverAnchor, setNavPopoverAnchor] = useState<HTMLElement | null>(
    null,
  );

  const navList = useMemo(
    () =>
      [...groups]
        .map(g => ({
          id: g.nav_id,
          name: g.nav_name,
          position: g.position ?? 0,
        }))
        .filter(n => n.id)
        .sort((a, b) => a.position - b.position),
    [groups],
  );
  const currentNav = navList.find(n => n.id === nav_id) || navList[0];

  const handleNavSelect = useCallback(
    (targetNavId: string) => {
      if (targetNavId === nav_id) {
        setNavPopoverAnchor(null);
        return;
      }
      dispatch(setNavId(targetNavId));
      setNavPopoverAnchor(null);
      const targetGroup = groups.find(g => g.nav_id === targetNavId);
      const firstDocId = getFirstDocId(targetGroup?.list);
      if (firstDocId) {
        if (isHistory) {
          navigate(`/doc/editor/history/${firstDocId}`);
        } else {
          navigate(`/doc/editor/${firstDocId}`);
        }
      } else {
        navigate('/doc/editor/space');
      }
    },
    [nav_id, groups, dispatch, navigate, isHistory],
  );

  const ImportContentWays = {
    docFile: {
      label: '创建文件夹',
      onClick: (parentId: string) => {
        setOpraParentId(parentId);
        setDocFileKey(1);
        setCustomDocOpen(true);
      },
    },
    customDoc: {
      label: '创建文档',
      onClick: (parentId: string) => {
        setOpraParentId(parentId);
        setDocFileKey(2);
        setCustomDocOpen(true);
      },
    },
  };

  const getCatalogData = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  // 同步外部数据到内部状态，并计算展开的文件夹
  useEffect(() => {
    setData(externalData);
    if (externalData.length > 0) {
      try {
        const currentId = id as string;
        if (!currentId) {
          setExpandedFolders(new Set());
          return;
        }
        const buildMap = (items: ITreeItem[], map: Map<string, ITreeItem>) => {
          items.forEach(item => {
            map.set(item.id, item);
            if (item.children && item.children.length > 0) {
              buildMap(item.children, map);
            }
          });
        };
        const map = new Map<string, ITreeItem>();
        buildMap(externalData, map);
        const expanded = new Set<string>();
        let cur = map.get(currentId);
        while (cur && cur.parentId) {
          const parent = map.get(cur.parentId);
          if (!parent) break;
          if (parent.type === 1 && parent.id) {
            expanded.add(parent.id);
          }
          cur = parent;
        }
        setExpandedFolders(expanded);
      } catch (e) {
        setExpandedFolders(new Set());
      }
    } else {
      setExpandedFolders(new Set());
    }
  }, [externalData, id]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const renderAdd = (parentId: string) => {
    return (
      <Box sx={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <Cascader
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          context={
            <IconButton>
              <IconIcon_tool_close
                className='catalog-folder-add-icon'
                sx={{
                  fontSize: 16,
                  color: 'action.selected',
                  transform: 'rotate(45deg)',
                }}
              />
            </IconButton>
          }
          list={Object.entries(ImportContentWays).map(([key, value]) => ({
            key,
            label: (
              <Box key={key}>
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
                  onClick={() => value.onClick(parentId)}
                >
                  {value.label}
                </Stack>
                {key === 'OfflineFile' && (
                  <Box
                    sx={{
                      borderTop: '1px solid',
                      borderColor: theme.palette.divider,
                      my: 0.5,
                    }}
                  />
                )}
              </Box>
            ),
          }))}
        />
      </Box>
    );
  };

  const renderTree = (items: ITreeItem[], pl = 2.5, depth = 1) => {
    const sortedItems = [...items].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    return sortedItems.map(item => (
      <Stack
        key={item.id}
        sx={{
          position: 'relative',
        }}
      >
        <Stack
          direction={'row'}
          alignItems={'center'}
          gap={1}
          sx={{
            pl: pl * depth,
            py: 0.75,
            borderRadius: 1,
            cursor: 'pointer',
            fontWeight: item.type === 1 ? 'bold' : 'normal',
            color: id === item.id ? 'primary.main' : 'text.primary',
            bgcolor:
              id === item.id
                ? alpha(theme.palette.primary.main, 0.1)
                : 'transparent',
            '&:hover .catalog-folder-add-icon': {
              color: 'text.tertiary',
            },
            '&:hover': {
              bgcolor:
                id === item.id
                  ? alpha(theme.palette.primary.main, 0.1)
                  : 'action.hover',
            },
          }}
          onClick={async () => {
            if (item.type === 1) {
              toggleFolder(item.id);
            } else {
              // if (edited) await save(true);
              if (isHistory) {
                navigate(`/doc/editor/history/${item.id}`);
              } else {
                navigate(`/doc/editor/${item.id}`);
              }
            }
          }}
        >
          {item.type === 1 && (
            <Box
              sx={{
                position: 'absolute',
                left: -18 + (pl || 0) * 8 * depth,
                top: 13,
              }}
            >
              <IconXiajiantou
                sx={{
                  fontSize: 16,
                  color: 'text.disabled',
                  flexShrink: 0,
                  transform: expandedFolders.has(item.id)
                    ? 'none'
                    : 'rotate(-90deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </Box>
          )}
          {item.emoji ? (
            <Box sx={{ fontSize: 14, flexShrink: 0 }}>{item.emoji}</Box>
          ) : item.type === 1 ? (
            <IconWenjianjia
              sx={{ color: '#2f80f7', flexShrink: 0, fontSize: 14 }}
            />
          ) : (
            <IconWenjian
              sx={{ color: '#2f80f7', flexShrink: 0, fontSize: 14 }}
            />
          )}
          <Ellipsis>{item.name}</Ellipsis>
          {item.content_type === 'md' && (
            <Box
              sx={{
                flexShrink: 0,
                fontSize: 10,
                // color: 'text.primary',
                color: 'white',
                background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                px: 1,
                mr: 1,
                fontWeight: '500',
                borderRadius: '4px',
                height: '14px',
                lineHeight: '14px',
                display: 'inline-block',
              }}
            >
              MD
            </Box>
          )}
          {item.type === 1 && renderAdd(item.id)}
        </Stack>
        {item.children &&
          item.children.length > 0 &&
          expandedFolders.has(item.id) && (
            <Stack>{renderTree(item.children, 2.5, depth + 1)}</Stack>
          )}
      </Stack>
    ));
  };

  useEffect(() => {
    if (curNode.id) {
      setData(prev => {
        let next = setProperty(prev, curNode.id!, 'name', val =>
          curNode.name !== undefined ? curNode.name : (val as string),
        ) as ITreeItem[];
        next = setProperty(next, curNode.id!, 'emoji', val =>
          curNode.meta?.emoji !== undefined
            ? curNode.meta.emoji
            : (val as string | undefined),
        ) as ITreeItem[];
        return [...next];
      });
    }
  }, [curNode]);

  useEffect(() => {
    getCatalogData();
  }, [kb_id]);

  return (
    <Stack
      sx={{
        bgcolor: 'background.paper3',
        height: '100%',
        color: 'text.primary',
      }}
    >
      <Stack
        direction='row'
        justifyContent='space-between'
        sx={{ p: 2 }}
        gap={1}
      >
        <KBSwitch />
        <Stack
          alignItems='center'
          justifyContent='space-between'
          onClick={() => setCatalogOpen(false)}
          sx={{
            cursor: 'pointer',
            color: 'text.tertiary',
            ':hover': {
              color: 'text.primary',
            },
          }}
        >
          <IconMulushouqi
            sx={{
              fontSize: 24,
            }}
          />
        </Stack>
      </Stack>
      <Stack
        direction={'row'}
        alignItems={'center'}
        justifyContent={'space-between'}
        sx={{ px: 1 }}
      >
        <Button
          onClick={e =>
            navList.length > 0 && setNavPopoverAnchor(e.currentTarget)
          }
          disabled={navList.length === 0}
          endIcon={
            navList.length > 1 ? (
              <IconXiala
                sx={{
                  fontSize: 16,
                  transform: navPopoverAnchor ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            ) : null
          }
          sx={{
            px: 1.5,
            py: 0.5,
            minWidth: 0,
            fontSize: 14,
            fontWeight: 'bold',
            color: 'text.tertiary',
            textTransform: 'none',
            '&:hover':
              navList.length > 0
                ? { color: 'text.primary', bgcolor: 'action.hover' }
                : {},
          }}
        >
          <Ellipsis sx={{ maxWidth: 140 }}>
            {currentNav?.name || '目录'}
          </Ellipsis>
        </Button>
        {renderAdd('')}
        <Popover
          open={!!navPopoverAnchor}
          anchorEl={navPopoverAnchor}
          onClose={() => setNavPopoverAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: { mt: 1, minWidth: 180, maxHeight: 320, p: 0.5 },
            },
          }}
        >
          <Stack sx={{ py: 0 }}>
            {navList.map(nav => (
              <Stack
                key={nav.id}
                direction='row'
                alignItems='center'
                onClick={() => nav.id && handleNavSelect(nav.id)}
                sx={{
                  fontSize: 14,
                  px: 2,
                  lineHeight: '40px',
                  height: 40,
                  width: 180,
                  borderRadius: '5px',
                  cursor: 'pointer',
                  color: nav.id === nav_id ? 'primary.main' : 'text.primary',
                  '&:hover': {
                    bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <Ellipsis>{nav.name || nav.id}</Ellipsis>
              </Stack>
            ))}
          </Stack>
        </Popover>
      </Stack>
      <Stack
        sx={{
          my: 1,
          px: 1,
          fontSize: 14,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {loading ? (
          <Loading />
        ) : data.length === 0 ? (
          <Button
            fullWidth
            variant='text'
            startIcon={<IconJiahao sx={{ fontSize: '10px !important' }} />}
            onClick={() => {
              setOpraParentId('');
              setDocFileKey(2);
              setCustomDocOpen(true);
            }}
            sx={{
              justifyContent: 'center',
              textTransform: 'none',
            }}
          >
            添加文档
          </Button>
        ) : (
          renderTree(data)
        )}
      </Stack>
      <DocAddByCustomText
        type={docFileKey}
        autoJump={false}
        open={customDocOpen}
        parentId={opraParentId}
        onCreated={async node => {
          if (node.type === 2) {
            await onSaveCurrentDoc?.();
            await onRefresh();
            if (isHistory) {
              navigate(`/doc/editor/history/${node.id}`);
            } else {
              navigate(`/doc/editor/${node.id}`);
            }
          } else {
            await onRefresh();
          }
          if (opraParentId) {
            setExpandedFolders(prev => {
              const ns = new Set(prev);
              ns.add(opraParentId);
              return ns;
            });
          }
        }}
        onClose={() => setCustomDocOpen(false)}
      />
    </Stack>
  );
};

export default Catalog;
