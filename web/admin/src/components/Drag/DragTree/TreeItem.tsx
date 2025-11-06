import { ITreeItem } from '@/api';
import Emoji from '@/components/Emoji';
import {
  TreeItemComponentProps,
  TreeItemWrapper,
} from '@/components/TreeDragSortable';
import RAG_SOURCES from '@/constant/rag';
import { treeSx } from '@/constant/styles';
import { postApiV1Node, putApiV1NodeDetail } from '@/request/Node';
import { ConstsNodeAccessPerm, ConstsNodeRagInfoStatus } from '@/request/types';
import { useAppSelector } from '@/store';
import { AppContext, updateTree } from '@/utils/drag';
import { handleMultiSelect, updateAllParentStatus } from '@/utils/tree';
import { Ellipsis, message } from '@ctzhian/ui';
import {
  Box,
  Button,
  Checkbox,
  PaletteColor,
  Stack,
  TextField,
  Theme,
  Tooltip,
  alpha,
  styled,
} from '@mui/material';
import dayjs from 'dayjs';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import TreeMenu from './TreeMenu';

const StyledTag = styled('div')<{ color: keyof Theme['palette'] }>(
  ({ theme, color }) => ({
    color: (theme.palette[color] as PaletteColor).main,
    border: '1px solid',
    borderColor: (theme.palette[color] as PaletteColor).main,
    borderRadius: '10px',
    padding: theme.spacing(0, 1),
    bgcolor: alpha((theme.palette[color] as PaletteColor).main, 0.1),
  }),
);

const ANSWERABLE_PERMISSIONS_MAP = {
  [ConstsNodeAccessPerm.NodeAccessPermClosed]: {
    label: '不可被问答',
    color: 'warning',
  },
  [ConstsNodeAccessPerm.NodeAccessPermPartial]: {
    label: '部分可被问答',
    color: 'warning',
  },
  [ConstsNodeAccessPerm.NodeAccessPermOpen]: {
    label: '可被问答',
    color: 'success',
  },
} as const;

const VISITABLE_PERMISSIONS_MAP = {
  [ConstsNodeAccessPerm.NodeAccessPermClosed]: {
    label: '不可被访问',
    color: 'warning',
  },
  [ConstsNodeAccessPerm.NodeAccessPermPartial]: {
    label: '部分可被访问',
    color: 'warning',
  },
  [ConstsNodeAccessPerm.NodeAccessPermOpen]: {
    label: '可被访问',
    color: 'success',
  },
} as const;

const VISIBLE_PERMISSIONS_MAP = {
  [ConstsNodeAccessPerm.NodeAccessPermClosed]: {
    label: '导航内不可见',
    color: 'warning',
  },
  [ConstsNodeAccessPerm.NodeAccessPermPartial]: {
    label: '部分导航内可见',
    color: 'warning',
  },
  [ConstsNodeAccessPerm.NodeAccessPermOpen]: {
    label: '导航内可见',
    color: 'success',
  },
} as const;

const TreeItem = React.forwardRef<
  HTMLDivElement,
  TreeItemComponentProps<ITreeItem>
>((props, ref) => {
  const { kb_id: id } = useAppSelector(state => state.config);
  const { item, collapsed } = props;
  const context = useContext(AppContext);

  if (!context) throw new Error('TreeItem 必须在 AppContext.Provider 内部使用');

  const {
    data,
    ui = 'move',
    selected = [],
    onSelectChange,
    readOnly,
    supportSelect = false,
    menu,
    relativeSelect = true,
    updateData,
    disabled,
    scrollToItem,
  } = context;

  const [value, setValue] = useState(item.name);
  const [emoji, setEmoji] = useState(item.emoji);
  const isEditting = item.isEditting ?? false;
  const inputRef = useRef<HTMLInputElement>(null);

  const createItem = useCallback(
    (type: 1 | 2, contentType?: string) => {
      const newItemId = new Date().getTime().toString();
      const temp = [...data];
      updateTree(temp, item.id, {
        ...item,
        collapsed: false, // 展开父节点
        children: [
          ...(item.children ?? []),
          {
            id: newItemId,
            name: '',
            level: item.level + 1,
            type,
            emoji: '',
            content_type: contentType,
            status: 1,
            isEditting: true,
            parentId: item.id,
          },
        ],
      });
      updateData?.(temp);
      // 延迟滚动，等待 DOM 更新
      setTimeout(() => {
        scrollToItem?.(newItemId);
      }, 100);
    },
    [data, item, updateData, scrollToItem],
  );

  const renameItem = useCallback(() => {
    const temp = [...data];
    updateTree(temp, item.id, {
      ...item,
      isEditting: true,
    });
    updateData?.(temp);
  }, [data, item, updateData]);

  const removeItem = useCallback(
    (id: string) => {
      const temp = [...data];
      const remove = (value: ITreeItem[]) => {
        return value.filter(item => {
          if (item.id === id) return false;
          if (item.children) {
            item.children = remove(item.children);
          }
          return true;
        });
      };
      const newItems = remove(temp);
      updateData?.(newItems);
    },
    [data, item, updateData],
  );

  const handleSelectChange = useCallback(
    (id: string) => {
      if (relativeSelect) {
        const newSelected = handleMultiSelect(data, id, selected);
        onSelectChange?.(newSelected || [], id);
      } else {
        const temp = [...selected];
        if (temp.includes(id)) {
          onSelectChange?.(
            temp.filter(item => item !== id),
            id,
          );
        } else {
          onSelectChange?.([...temp, id], id);
        }
      }
    },
    [onSelectChange, selected, data, relativeSelect],
  );

  useEffect(() => {
    if (relativeSelect && selected.length > 0) {
      const temp = [...data];
      const selectedSet = new Set(selected);
      updateAllParentStatus(temp, selectedSet);
      const newSelected = Array.from(selectedSet);
      if (newSelected.length !== selected.length) {
        onSelectChange?.(newSelected);
      }
    }
  }, [selected, data, relativeSelect, onSelectChange]);

  useEffect(() => {
    setValue(item.name);
    setEmoji(item.emoji);
  }, [item]);

  useEffect(() => {
    if (isEditting && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditting]);

  const menuList = useMemo(() => {
    if (menu) {
      return (
        menu({
          item,
          createItem,
          renameItem,
          isEditing: isEditting,
          removeItem,
        }) || []
      );
    }
    return [];
  }, [item, isEditting, createItem, renameItem, removeItem]);

  const permissions = useMemo(() => {
    if (item.permissions) {
      return item.permissions;
    }
    return null;
  }, [item.permissions]);

  return (
    <Box
      sx={[
        treeSx(readOnly ?? false),
        {
          '&:hover': {
            '.dnd-sortable-tree_simple_handle': {
              opacity: 1,
            },
          },
        },
      ]}
    >
      <Stack
        direction='row'
        alignItems={'center'}
        gap={supportSelect ? 0 : 0}
        onClick={e => e.stopPropagation()}
      >
        {!readOnly ? (
          <div
            className={'dnd-sortable-tree_simple_handle'}
            {...props.handleProps}
          />
        ) : (
          <Box />
        )}

        {supportSelect && (
          <Checkbox
            sx={{
              visibility: disabled?.(item) ? 'hidden' : 'visible',
              flexShrink: 0,
              color: 'text.disabled',
              width: '35px',
              height: '35px',
            }}
            checked={selected.includes(item.id)}
            onChange={e => {
              e.stopPropagation();
              handleSelectChange(item.id);
            }}
            disabled={disabled?.(item)}
          />
        )}

        <Box sx={{ flex: 1, pl: 3 }}>
          <TreeItemWrapper
            {...props}
            ref={ref}
            indentationWidth={23}
            showDragHandle={false}
          >
            <Stack
              direction='row'
              alignItems={'center'}
              justifyContent='space-between'
              gap={2}
              flex={1}
              sx={{ pr: 2 }}
              onClick={() => {
                if (readOnly) return;
                if (ui === 'select') {
                  handleSelectChange(item.id);
                  return;
                }
                if (item.type === 2)
                  window.open(`/doc/editor/${item.id}`, '_blank');
              }}
            >
              {item.isEditting ? (
                <Stack
                  direction='row'
                  alignItems={'center'}
                  gap={2}
                  onClick={e => e.stopPropagation()}
                >
                  <Emoji
                    type={item.type}
                    collapsed={collapsed}
                    value={emoji}
                    onChange={setEmoji}
                  />
                  <TextField
                    size='small'
                    value={value}
                    inputRef={inputRef}
                    placeholder='请输入文档名称'
                    sx={{
                      width: 300,
                      input: {
                        bgcolor: 'background.paper',
                      },
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    onChange={e => setValue(e.target.value)}
                  />
                  <Button
                    variant='contained'
                    size='small'
                    onClick={e => {
                      e.stopPropagation();
                      if (item.name) {
                        putApiV1NodeDetail({
                          id: item.id,
                          kb_id: id,
                          name: value,
                          emoji,
                        }).then(() => {
                          message.success('更新成功');
                          const temp = [...data];
                          updateTree(temp, item.id, {
                            ...item,
                            name: value,
                            emoji,
                            isEditting: false,
                            status: item.name === value ? item.status : 1,
                            updated_at: dayjs().toString(),
                          });
                          updateData?.(temp);
                        });
                      } else {
                        if (value === '') {
                          message.error('文档名称不能为空');
                          return;
                        }
                        postApiV1Node({
                          name: value,
                          content: '',
                          kb_id: id,
                          parent_id: item.parentId,
                          type: item.type,
                          emoji,
                          content_type: item.content_type,
                        }).then(res => {
                          message.success('创建成功');
                          const temp = [...data];
                          const newItem = {
                            ...item,
                            id: res.id,
                            name: value,
                            emoji,
                            isEditting: false,
                            updated_at: dayjs().toString(),
                          };
                          if (item.type === 1) {
                            newItem.children = [];
                          }
                          updateTree(temp, item.id, newItem);
                          updateData?.(temp);
                          // 滚动到保存后的项
                          setTimeout(() => {
                            scrollToItem?.(res.id);
                          }, 100);
                        });
                      }
                    }}
                  >
                    保存
                  </Button>
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={e => {
                      e.stopPropagation();
                      if (!item.name) {
                        removeItem(item.id);
                      } else {
                        const temp = [...data];
                        updateTree(temp, item.id, {
                          ...item,
                          isEditting: false,
                        });
                      }
                    }}
                  >
                    取消
                  </Button>
                </Stack>
              ) : (
                <Stack
                  direction='row'
                  alignItems={'center'}
                  gap={1}
                  sx={{
                    fontSize: 14,
                    cursor: 'pointer',
                    ...(ui === 'select' && { width: '100%', flex: 1 }),
                  }}
                >
                  <Box
                    onClick={e => e.stopPropagation()}
                    sx={{ flexShrink: 0, cursor: 'pointer' }}
                  >
                    <Emoji
                      readOnly={readOnly}
                      sx={{ width: 24, height: 24, fontSize: 14 }}
                      type={item.type}
                      collapsed={collapsed}
                      value={item.emoji}
                      onChange={async value => {
                        try {
                          await putApiV1NodeDetail({
                            id: item.id,
                            kb_id: id,
                            emoji: value,
                          });
                          message.success('更新成功');
                          const temp = [...data];
                          updateTree(temp, item.id, {
                            ...item,
                            updated_at: dayjs().toString(),
                            status: 1,
                            emoji: value,
                          });
                          updateData?.(temp);
                        } catch (error) {
                          message.error('更新失败');
                        }
                      }}
                    />
                  </Box>
                  {ui === 'select' ? (
                    <Ellipsis sx={{ width: 0, flex: 1, overflow: 'hidden' }}>
                      {item.name}
                    </Ellipsis>
                  ) : (
                    <>
                      <Box>
                        {item.name}
                        {item.content_type === 'md' && (
                          <Box
                            component={'span'}
                            sx={{
                              fontSize: 10,
                              color: 'white',
                              background:
                                'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                              px: 1,
                              ml: 1,
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
                      </Box>
                    </>
                  )}
                </Stack>
              )}
              {menu && (
                <>
                  <Box
                    sx={{
                      flex: 1,
                      alignSelf: 'center',
                      borderBottom: '1px dashed',
                      borderColor: 'divider',
                    }}
                  />
                  <Stack
                    direction='row'
                    alignItems={'center'}
                    gap={2}
                    sx={{ flexShrink: 0 }}
                  >
                    <Stack
                      direction='row'
                      alignItems={'center'}
                      gap={1}
                      sx={{ flexShrink: 0, fontSize: 12 }}
                    >
                      {item.type === 2 &&
                        item.rag_status &&
                        ![
                          ConstsNodeRagInfoStatus.NodeRagStatusBasicSucceeded,
                          ConstsNodeRagInfoStatus.NodeRagStatusEnhanceSucceeded,
                        ].includes(item.rag_status) && (
                          <Tooltip title={item.rag_message}>
                            <StyledTag
                              color={RAG_SOURCES[item.rag_status].color as any}
                            >
                              {RAG_SOURCES[item.rag_status].name}
                            </StyledTag>
                          </Tooltip>
                        )}
                      {item.status === 1 && (
                        <StyledTag color='error'>更新未发布</StyledTag>
                      )}
                      {item.type === 2 && (
                        <>
                          {permissions?.answerable &&
                            ANSWERABLE_PERMISSIONS_MAP[
                              permissions.answerable
                            ] && (
                              <StyledTag
                                color={
                                  ANSWERABLE_PERMISSIONS_MAP[
                                    permissions.answerable
                                  ].color
                                }
                              >
                                {
                                  ANSWERABLE_PERMISSIONS_MAP[
                                    permissions.answerable
                                  ].label
                                }
                              </StyledTag>
                            )}
                          {permissions?.visitable &&
                            VISITABLE_PERMISSIONS_MAP[
                              permissions.visitable
                            ] && (
                              <StyledTag
                                color={
                                  VISITABLE_PERMISSIONS_MAP[
                                    permissions.visitable
                                  ].color
                                }
                              >
                                {
                                  VISITABLE_PERMISSIONS_MAP[
                                    permissions.visitable
                                  ].label
                                }
                              </StyledTag>
                            )}
                          {permissions?.visible &&
                            VISIBLE_PERMISSIONS_MAP[permissions.visible] && (
                              <StyledTag
                                color={
                                  VISIBLE_PERMISSIONS_MAP[permissions.visible]
                                    .color
                                }
                              >
                                {
                                  VISIBLE_PERMISSIONS_MAP[permissions.visible]
                                    .label
                                }
                              </StyledTag>
                            )}
                        </>
                      )}
                    </Stack>
                    <Box
                      sx={{
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: 'text.disabled',
                        width: 60,
                        textAlign: 'right',
                      }}
                    >
                      {dayjs(item.updated_at).fromNow()}
                    </Box>
                    <Box onClick={e => e.stopPropagation()}>
                      <TreeMenu menu={menuList} />
                    </Box>
                  </Stack>
                </>
              )}
            </Stack>
          </TreeItemWrapper>
        </Box>
      </Stack>
    </Box>
  );
});

export default TreeItem;
