import { ITreeItem } from '@/api';
import Card from '@/components/Card';
import Cascader from '@/components/Cascader';
import DragTree, { type DragTreeHandle } from '@/components/Drag/DragTree';
import {
  TreeMenuItem,
  TreeMenuOptions,
} from '@/components/Drag/DragTree/TreeMenu';
import EmptyState from '@/components/EmptyState';
import Loading from '@/components/Loading';
import AddDocBtn from '@/pages/document/component/AddDocBtn';
import { addOpacityToColor } from '@/utils';
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  Stack,
  useTheme,
} from '@mui/material';
import { IconGengduo } from '@panda-wiki/icons';

export interface DocPageListContentProps {
  data: ITreeItem[];
  list: { id?: string }[];
  search?: string;
  loading?: boolean;
  selected: string[];
  supportSelect: boolean;
  menu: (opra: TreeMenuOptions) => TreeMenuItem[];
  updateLocalData: (newData: ITreeItem[]) => void;
  onSelectChange: (value: string[]) => void;
  onBatchOpen: () => void;
  onMoreSummaryOpen: () => void;
  onMoveOpen: () => void;
  onDeleteOpen: () => void;
  onPropertiesOpen: () => void;
  onBatchClose: () => void;
  setOpraData: (data: { id?: string }[]) => void;
  dragTreeRef: React.RefObject<DragTreeHandle | null>;
  refresh: () => void;
  createLocal: (node: {
    id: string;
    name: string;
    type: 1 | 2;
    emoji?: string;
    parentId?: string | null;
    content_type?: string;
  }) => void;
  scrollTo: (id: string) => void;
  registerTreeDragHandlers?: (
    handlers: import('@/utils/drag').TreeDragHandlers | null,
  ) => void;
}

const DocPageListContent = ({
  data,
  list,
  search = '',
  loading = false,
  selected,
  supportSelect,
  menu,
  updateLocalData,
  onSelectChange,
  onBatchOpen,
  onMoreSummaryOpen,
  onMoveOpen,
  onDeleteOpen,
  onPropertiesOpen,
  onBatchClose,
  setOpraData,
  dragTreeRef,
  refresh,
  createLocal,
  scrollTo,
  registerTreeDragHandlers,
}: DocPageListContentProps) => {
  const theme = useTheme();
  const showEmpty = list.length === 0;

  return (
    <Card sx={{ flex: 1 }}>
      <Stack
        direction={'row'}
        alignItems={'center'}
        justifyContent={'space-between'}
        sx={{ p: 2, lineHeight: '35px', minHeight: 35 }}
      >
        {/* 左侧：默认显示文档数量，点击批量操作后显示勾选栏 */}
        {supportSelect ? (
          <Stack
            direction={'row'}
            alignItems={'center'}
            sx={{ flex: 1, gap: 1 }}
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
                  onSelectChange([]);
                  setOpraData([]);
                } else {
                  onSelectChange(list.map(item => item.id!).filter(Boolean));
                  setOpraData(list);
                }
              }}
            />
            {selected.length > 0 ? (
              <>
                <Box sx={{ fontSize: 13, color: 'text.secondary' }}>
                  已选中 {selected.length} 项
                </Box>
                <Stack direction={'row'} alignItems={'center'} gap={1}>
                  <Button
                    size='small'
                    color='primary'
                    sx={{ minWidth: 0, p: 0, lineHeight: 1 }}
                    onClick={onMoreSummaryOpen}
                  >
                    生成摘要
                  </Button>
                  <Button
                    size='small'
                    color='primary'
                    sx={{ minWidth: 0, p: 0, lineHeight: 1 }}
                    onClick={onMoveOpen}
                  >
                    批量移动
                  </Button>
                  <Button
                    size='small'
                    color='primary'
                    sx={{ minWidth: 0, p: 0, lineHeight: 1 }}
                    onClick={onDeleteOpen}
                  >
                    批量删除
                  </Button>
                  <Button
                    size='small'
                    color='primary'
                    sx={{ minWidth: 0, p: 0, lineHeight: 1 }}
                    onClick={onPropertiesOpen}
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
                lineHeight: 1,
              }}
              onClick={onBatchClose}
            >
              取消
            </Button>
          </Stack>
        ) : (
          <Box sx={{ fontSize: 14, color: 'text.tertiary' }}>
            共{' '}
            <Box
              component='span'
              sx={{ fontWeight: 600, color: 'text.primary' }}
            >
              {list.length}
            </Box>{' '}
            个文档
          </Box>
        )}
        {/* 右侧：多功能按钮（添加文档 + 批量操作） */}
        <Stack direction={'row'} alignItems={'center'} gap={2}>
          <AddDocBtn
            refresh={refresh}
            createLocal={createLocal}
            scrollTo={scrollTo}
            disabled={!!search}
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
                    onClick={onBatchOpen}
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
      <Stack
        sx={{
          height: 'calc(100vh - 183px - 48px)',
          overflow: 'hidden',
          overflowY: 'auto',
          p: 2,
          pt: 0,
        }}
      >
        {loading ? (
          <Loading sx={{ flex: 1, justifyContent: 'center' }} />
        ) : showEmpty ? (
          <EmptyState
            text={search ? '无搜索结果' : '暂无数据'}
            sx={{
              flex: 1,
              justifyContent: 'center',
            }}
          />
        ) : (
          <DragTree
            ref={dragTreeRef}
            data={data}
            menu={menu}
            updateData={updateLocalData}
            refresh={refresh}
            selected={selected}
            onSelectChange={onSelectChange}
            supportSelect={supportSelect}
            virtualized={true}
            registerDragHandlers={registerTreeDragHandlers}
          />
        )}
      </Stack>
    </Card>
  );
};

export default DocPageListContent;
