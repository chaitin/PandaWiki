import Card from '@/components/Card';
import DragTree from '@/components/Drag/DragTree';
import { postApiV1KnowledgeBaseRelease } from '@/request/KnowledgeBase';
import { getApiV1NodeListGroupNav } from '@/request/Node';
import {
  DomainNodeListItemResp,
  GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { convertToTree } from '@/utils/drag';
import { message, Modal } from '@ctzhian/ui';
import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  Stack,
  TextField,
} from '@mui/material';
import { IconXiajiantou } from '@panda-wiki/icons';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

function normalizeNavGroupResponse(
  res: any,
): GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    for (const key of ['list', 'data', 'groups', 'items']) {
      if (Array.isArray(res[key])) return res[key];
    }
  }
  return [];
}

function getNavNodeList(
  nav:
    | GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp
    | Record<string, any>,
): DomainNodeListItemResp[] {
  return (
    (nav as any).list ||
    (nav as any).nodes ||
    (nav as any).items ||
    nav.list ||
    []
  );
}

interface VersionPublishProps {
  open: boolean;
  defaultSelected?: string[];
  onClose: () => void;
  refresh: () => void;
}

const VersionPublish = ({
  open,
  defaultSelected = [],
  onClose,
  refresh,
}: VersionPublishProps) => {
  const { kb_id } = useAppSelector(state => state.config);

  const [selected, setSelected] = useState<string[]>([]);
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [navList, setNavList] = useState<
    GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp[]
  >([]);
  const [expandedNavIds, setExpandedNavIds] = useState<Set<string>>(new Set());
  const [list, setList] = useState<DomainNodeListItemResp[]>([]);

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      tag: '',
      message: '',
    },
  });

  const getData = () => {
    getApiV1NodeListGroupNav({ kb_id, status: 'unpublished' }).then(res => {
      const navData = normalizeNavGroupResponse(res);
      setNavList(navData);
      const allNodes = navData.flatMap(nav => getNavNodeList(nav));
      setList(allNodes);
      const allIds = allNodes.map(it => it.id!);
      setSelected(defaultSelected.length > 0 ? defaultSelected : allIds);
      const folders = allNodes
        .filter(item => item.type === 1)
        .map(item => item.id!);
      setFolderIds(folders);
      setExpandedNavIds(new Set());
    });
  };

  const onSubmit = handleSubmit(data => {
    if (selected.length > 0) {
      postApiV1KnowledgeBaseRelease({
        kb_id,
        ...data,
        node_ids: [...selected, ...folderIds],
      }).then(() => {
        message.success(`${data.tag} 版本发布成功`);
        reset();
        setSelected([]);
        onClose();
        refresh();
      });
    } else {
      message.error(list.length > 0 ? '请选择要发布的文档' : '暂无未发布文档');
    }
  });

  useEffect(() => {
    const curTime = dayjs();
    if (open) {
      getData();
      setValue('tag', curTime.format('YYYY-MM-DD HH:mm:ss'));
      setValue(
        'message',
        `${curTime.format('YYYY 年 MM 月 DD 日 HH 时 mm 分 ss 秒')}发布`,
      );
    }
  }, [open, kb_id]);

  const selectedTotal = list.filter(it => selected.includes(it.id!)).length;

  const releasedNavs = navList.filter(
    nav => (nav as any).is_released === false || nav.is_released === false,
  );

  return (
    <Modal title='发布新版本' open={open} onCancel={onClose} onOk={onSubmit}>
      <>
        <Box sx={{ fontSize: 14, lineHeight: '32px' }}>
          版本号
          <Box component='span' sx={{ color: 'error.main', ml: 0.5 }}>
            *
          </Box>
        </Box>
        <Controller
          control={control}
          name='tag'
          rules={{ required: '版本号不能为空' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              size='small'
              placeholder='请输入版本号'
              error={!!errors.tag}
              helperText={errors.tag?.message}
            />
          )}
        />
        <Box sx={{ fontSize: 14, lineHeight: '32px', mt: 1 }}>
          版本描述
          <Box component='span' sx={{ color: 'error.main', ml: 0.5 }}>
            *
          </Box>
        </Box>
        <Controller
          control={control}
          name='message'
          rules={{ required: '版本描述不能为空' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              rows={2}
              size='small'
              placeholder='请输入版本描述'
              error={!!errors.message}
              helperText={errors.message?.message}
            />
          )}
        />
        {releasedNavs.length > 0 && (
          <Stack sx={{ mt: 1 }}>
            <Box sx={{ fontSize: 14, mb: 0.5 }}>
              未发布目录
              <Box
                component='span'
                sx={{ color: 'text.tertiary', fontSize: 12, pl: 1 }}
              >
                共 {releasedNavs.length} 个
              </Box>
            </Box>
            <Stack direction='row' flexWrap='wrap' gap={0.5} useFlexGap>
              {releasedNavs.map((nav, idx) => {
                const navId =
                  nav.nav_id || (nav as any).navId || `released-nav-${idx}`;
                return (
                  <Chip
                    key={navId}
                    label={nav.nav_name || (nav as any).navName || '未分类'}
                    size='small'
                    variant='outlined'
                    sx={{
                      fontSize: 12,
                      height: 24,
                      borderRadius: 2,
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                );
              })}
            </Stack>
          </Stack>
        )}
        <Stack
          direction='row'
          component='label'
          alignItems='center'
          justifyContent='space-between'
          gap={1}
          sx={{
            py: 1,
            pr: 1.5,
            cursor: 'pointer',
            borderRadius: '10px',
            fontSize: 14,
            mt: 1,
          }}
        >
          <Box>
            未发布文档/文件夹
            <Box
              component='span'
              sx={{ color: 'text.tertiary', fontSize: 12, pl: 1 }}
            >
              共 {list.length} 个，已选中 {selectedTotal} 个
            </Box>
          </Box>
          <Stack direction='row' alignItems='center'>
            <Box sx={{ color: 'text.tertiary', fontSize: 12 }}>全选</Box>
            <Checkbox
              size='small'
              sx={{
                p: 0,
                color: 'text.disabled',
                width: '35px',
                height: '35px',
              }}
              checked={list.length > 0 && selectedTotal === list.length}
              onChange={() => {
                setSelected(
                  selectedTotal === list.length ? [] : list.map(it => it.id!),
                );
              }}
            />
          </Stack>
        </Stack>
        <Box
          sx={{
            fontSize: 14,
            maxHeight: 'calc(100vh - 520px)',
            overflowY: 'auto',
            mt: 0,
          }}
        >
          <Stack gap={1}>
            {navList
              .map((nav, idx) => ({ nav, idx, navNodes: getNavNodeList(nav) }))
              .filter(({ navNodes }) => navNodes.length > 0)
              .map(({ nav, idx, navNodes }) => {
                const navId = nav.nav_id || (nav as any).navId || `nav-${idx}`;
                const navTreeList = convertToTree(navNodes);
                const navSelected = navNodes
                  .filter(n => selected.includes(n.id!))
                  .map(n => n.id!);
                const navSelectedCount = navSelected.length;
                const navTotal = navNodes.length;
                const isExpanded = expandedNavIds.has(navId);
                const toggleExpand = () => {
                  setExpandedNavIds(prev => {
                    const next = new Set(prev);
                    if (next.has(navId)) next.delete(navId);
                    else next.add(navId);
                    return next;
                  });
                };
                return (
                  <Card
                    key={navId}
                    sx={{ bgcolor: 'background.paper3', overflow: 'hidden' }}
                  >
                    <Stack
                      direction='row'
                      component='label'
                      alignItems='center'
                      sx={{ py: 1, px: 1.5, cursor: 'pointer', fontSize: 14 }}
                    >
                      <IconButton
                        size='small'
                        onClick={e => {
                          e.preventDefault();
                          toggleExpand();
                        }}
                        sx={{ p: 0.25, mr: 0.5 }}
                      >
                        <IconXiajiantou
                          sx={{
                            fontSize: 16,
                            color: 'text.disabled',
                            transform: isExpanded ? 'none' : 'rotate(-90deg)',
                            transition: 'transform 0.2s',
                          }}
                        />
                      </IconButton>
                      <Box sx={{ flex: 1 }}>
                        {nav.nav_name || (nav as any).navName || '未分类'}
                        <Box
                          component='span'
                          sx={{ color: 'text.tertiary', fontSize: 12, pl: 1 }}
                        >
                          共 {navTotal} 个
                          {navSelectedCount > 0
                            ? `，已选中 ${navSelectedCount} 个`
                            : ''}
                        </Box>
                      </Box>
                      <Stack direction='row' alignItems='center'>
                        <Box sx={{ color: 'text.tertiary', fontSize: 12 }}>
                          全选
                        </Box>
                        <Checkbox
                          size='small'
                          sx={{
                            p: 0,
                            color: 'text.disabled',
                            width: '35px',
                            height: '35px',
                          }}
                          checked={
                            navTotal > 0 && navSelectedCount === navTotal
                          }
                          onChange={() => {
                            const navIds = navNodes.map(n => n.id!);
                            if (navSelectedCount === navTotal) {
                              setSelected(prev =>
                                prev.filter(id => !navIds.includes(id)),
                              );
                            } else {
                              setSelected(prev => {
                                const added = new Set(prev);
                                navIds.forEach(id => added.add(id));
                                return [...added];
                              });
                            }
                          }}
                        />
                      </Stack>
                    </Stack>
                    {isExpanded && (
                      <Stack gap={0.25} sx={{ fontSize: 14, px: 2, pb: 1 }}>
                        <DragTree
                          ui='select'
                          readOnly
                          selected={selected}
                          data={navTreeList}
                          refresh={getData}
                          onSelectChange={ids => setSelected(ids)}
                        />
                      </Stack>
                    )}
                  </Card>
                );
              })}
          </Stack>
        </Box>
      </>
    </Modal>
  );
};

export default VersionPublish;
