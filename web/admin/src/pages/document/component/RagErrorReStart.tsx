import Card from '@/components/Card';
import DragTree from '@/components/Drag/DragTree';
import { postApiV1NodeRestudy } from '@/request';
import { getApiV1NodeListGroupNav } from '@/request/Node';
import {
  DomainNodeListItemResp,
  GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { convertToTree } from '@/utils/drag';
import { message, Modal } from '@ctzhian/ui';
import { Box, Checkbox, IconButton, Stack } from '@mui/material';
import { IconXiajiantou } from '@panda-wiki/icons';
import { useEffect, useState } from 'react';

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

interface RagErrorReStartProps {
  open: boolean;
  defaultSelected?: string[];
  onClose: () => void;
  refresh: () => void;
}

const RagErrorReStart = ({
  open,
  defaultSelected = [],
  onClose,
  refresh,
}: RagErrorReStartProps) => {
  const { kb_id } = useAppSelector(state => state.config);

  const [selected, setSelected] = useState<string[]>([]);
  const [navList, setNavList] = useState<
    GithubComChaitinPandaWikiApiNodeV1NodeListGroupNavResp[]
  >([]);
  const [expandedNavIds, setExpandedNavIds] = useState<Set<string>>(new Set());
  const [list, setList] = useState<DomainNodeListItemResp[]>([]);

  const getData = () => {
    getApiV1NodeListGroupNav({ kb_id, status: 'unstudied' }).then(res => {
      const navData = normalizeNavGroupResponse(res);
      setNavList(navData);
      const allNodes = navData.flatMap(nav => getNavNodeList(nav));
      setList(allNodes);
      const allIds = allNodes.map(it => it.id!);
      setSelected(defaultSelected.length > 0 ? defaultSelected : allIds);
      setExpandedNavIds(new Set());
    });
  };

  const onSubmit = () => {
    if (selected.length > 0) {
      postApiV1NodeRestudy({
        kb_id,
        node_ids: [...selected],
      }).then(() => {
        message.success('正在学习');
        setSelected([]);
        onClose();
        refresh();
      });
    } else {
      message.error(
        list.length > 0 ? '请选择需要学习的文档' : '暂无需要学习的文档',
      );
    }
  };

  useEffect(() => {
    if (open) {
      getData();
    }
  }, [open, kb_id]);

  const selectedTotal = list.filter(it => selected.includes(it.id!)).length;

  return (
    <Modal title='学习文档' open={open} onCancel={onClose} onOk={onSubmit}>
      <Stack
        direction='row'
        component='label'
        alignItems='center'
        justifyContent='space-between'
        gap={1}
        sx={{
          cursor: 'pointer',
          borderRadius: '10px',
          fontSize: 14,
        }}
      >
        <Box>
          未学习/学习失败文档
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
          mt: 1,
        }}
      >
        <Stack gap={1}>
          {navList
            .map((nav, idx) => ({ nav, idx, navNodes: getNavNodeList(nav) }))
            .filter(({ navNodes }) => navNodes.length > 0)
            .map(({ nav, idx, navNodes }) => {
              const navId = nav.nav_id || (nav as any).navId || `nav-${idx}`;
              const navTreeList = convertToTree(navNodes);
              const navSelectedCount = navNodes.filter(n =>
                selected.includes(n.id!),
              ).length;
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
                        checked={navTotal > 0 && navSelectedCount === navTotal}
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
    </Modal>
  );
};

export default RagErrorReStart;
