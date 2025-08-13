import { createNode, ITreeItem, updateNode } from '@/api';
import Emoji from '@/components/Emoji';
import { treeSx } from '@/constant/styles';
import { useAppSelector } from '@/store';
import { addOpacityToColor } from '@/utils';
import { AppContext, updateTree } from '@/utils/drag';
import { handleMultiSelect, updateAllParentStatus } from '@/utils/tree';
import {
  Box,
  Button,
  Checkbox,
  Stack,
  TextField,
  useTheme,
} from '@mui/material';
import { Ellipsis, Message } from 'ct-mui';
import dayjs from 'dayjs';
import {
  SimpleTreeItemWrapper,
  TreeItemComponentProps,
} from 'dnd-kit-sortable-tree';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import TreeMenu from './TreeMenu';

const TreeItem = React.forwardRef<
  HTMLDivElement,
  TreeItemComponentProps<ITreeItem>
>((props, ref) => {
  const theme = useTheme();
  const { kb_id: id } = useAppSelector(state => state.config);
  const { item, collapsed } = props;
  const context = useContext(AppContext);

  if (!context) throw new Error('TreeItem 必须在 AppContext.Provider 内部使用');

  const {
    items,
    setItems,
    ui = 'move',
    selected = [],
    onSelectChange,
    readOnly,
    supportSelect = false,
    menu,
    relativeSelect = true,
    refresh,
  } = context;

  const [value, setValue] = useState(item.name);
  const [emoji, setEmoji] = useState(item.emoji);
  const isEditting = item.isEditting ?? false;
  const inputRef = useRef<HTMLInputElement>(null);

  const createItem = useCallback(
    (type: 1 | 2) => {
      const temp = [...items];
      updateTree(temp, item.id, {
        ...item,
        children: [
          ...(item.children ?? []),
          {
            id: new Date().getTime().toString(),
            name: '',
            level: 2,
            type,
            emoji: '',
            status: 1,
            visibility: 2,
            isEditting: true,
            parentId: item.id,
          },
        ],
      });
      setItems(temp);
    },
    [items, item, setItems],
  );

  const renameItem = useCallback(() => {
    const temp = [...items];
    updateTree(temp, item.id, {
      ...item,
      isEditting: true,
    });
    setItems(temp);
  }, [items, item, setItems]);

  const removeItem = useCallback(
    (id: string) => {
      const temp = [...items];
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
      setItems(newItems);
    },
    [items, item, setItems],
  );

  const handleSelectChange = useCallback(
    (id: string) => {
      if (relativeSelect) {
        const newSelected = handleMultiSelect(items, id, selected);
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
    [onSelectChange, selected, items, relativeSelect],
  );

  useEffect(() => {
    if (relativeSelect && selected.length > 0) {
      const temp = [...items];
      const selectedSet = new Set(selected);
      updateAllParentStatus(temp, selectedSet);
      const newSelected = Array.from(selectedSet);
      if (newSelected.length !== selected.length) {
        onSelectChange?.(newSelected);
      }
    }
  }, [selected, items, relativeSelect, onSelectChange]);

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

  return (
    <Box
      sx={[
        treeSx(supportSelect, ui),
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
        gap={2}
        onClick={e => e.stopPropagation()}
      >
        <div
          className={'dnd-sortable-tree_simple_handle'}
          {...props.handleProps}
        />
        {supportSelect && (
          <Checkbox
            sx={{
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
          />
        )}
        <Box sx={{ flex: 1 }}>
          <SimpleTreeItemWrapper
            {...props}
            ref={ref}
            indentationWidth={23}
            disableCollapseOnItemClick={!readOnly}
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
                    onChange={e => setValue(e.target.value)}
                  />
                  <Button
                    variant='contained'
                    size='small'
                    onClick={e => {
                      e.stopPropagation();
                      if (item.name) {
                        updateNode({
                          id: item.id,
                          kb_id: id,
                          name: value,
                          emoji,
                        }).then(() => {
                          Message.success('更新成功');
                          const temp = [...items];
                          updateTree(temp, item.id, {
                            ...item,
                            name: value,
                            emoji,
                            isEditting: false,
                            status: item.name === value ? item.status : 1,
                            updated_at: dayjs().toString(),
                          });
                          setItems(temp);
                        });
                      } else {
                        if (value === '') {
                          Message.error('文档名称不能为空');
                          return;
                        }
                        createNode({
                          name: value,
                          content: '',
                          kb_id: id,
                          parent_id: item.parentId,
                          type: item.type,
                          emoji,
                        }).then(res => {
                          Message.success('创建成功');
                          const temp = [...items];
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
                          setItems(temp);
                          refresh?.();
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
                        const temp = [...items];
                        updateTree(temp, item.id, {
                          ...item,
                          isEditting: false,
                        });
                        setItems(temp);
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
                          await updateNode({
                            id: item.id,
                            kb_id: id,
                            emoji: value,
                          });
                          Message.success('更新成功');
                          const temp = [...items];
                          updateTree(temp, item.id, {
                            ...item,
                            updated_at: dayjs().toString(),
                            status: 1,
                            emoji: value,
                          });
                          setItems(temp);
                        } catch (error) {
                          Message.error('更新失败');
                        }
                      }}
                    />
                  </Box>
                  {ui === 'select' ? (
                    <Ellipsis sx={{ width: 0, flex: 1, overflow: 'hidden' }}>
                      {item.name}
                    </Ellipsis>
                  ) : (
                    <Box>{item.name}</Box>
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
                      {item.status === 1 && (
                        <Box
                          sx={{
                            color: 'error.main',
                            border: '1px solid',
                            borderColor: 'error.main',
                            borderRadius: '10px',
                            px: 1,
                            bgcolor: addOpacityToColor(
                              theme.palette.error.main,
                              0.1,
                            ),
                          }}
                        >
                          更新未发布
                        </Box>
                      )}
                      {item.type === 2 &&
                        (item.visibility === 1 ? (
                          <Box
                            sx={{
                              color: 'warning.main',
                              border: '1px solid',
                              borderColor: 'warning.main',
                              borderRadius: '10px',
                              px: 1,
                              bgcolor: addOpacityToColor(
                                theme.palette.warning.main,
                                0.1,
                              ),
                            }}
                          >
                            私有
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              color: 'success.main',
                              border: '1px solid',
                              borderColor: 'success.main',
                              borderRadius: '10px',
                              px: 1,
                              bgcolor: addOpacityToColor(
                                theme.palette.success.main,
                                0.1,
                              ),
                            }}
                          >
                            公开
                          </Box>
                        ))}
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
          </SimpleTreeItemWrapper>
        </Box>
      </Stack>
    </Box>
  );
});

export default TreeItem;
