import { getApiV1NodeList } from '@/request/Node';
import { DomainNodeListItemResp, DomainNodeType } from '@/request/types';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { message } from '@ctzhian/ui';
import { debounce } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';

const MAX_SHOW = 120;

export interface KbDocLinkPickerDialogProps {
  open: boolean;
  onClose: () => void;
  kbId: string;
  currentNodeId?: string;
  wikiFrontBaseUrl: string;
  /** 选中一篇文档后的 href（前台 URL 或 /node/id）与展示标题 */
  onPick: (href: string, title: string) => void;
}

const KbDocLinkPickerDialog = ({
  open,
  onClose,
  kbId,
  currentNodeId,
  wikiFrontBaseUrl,
  onPick,
}: KbDocLinkPickerDialogProps) => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DomainNodeListItemResp[]>([]);

  const hrefForNode = useCallback(
    (nodeId: string) => {
      const base = wikiFrontBaseUrl.replace(/\/$/, '');
      if (base) return `${base}/node/${nodeId}`;
      return `/node/${nodeId}`;
    },
    [wikiFrontBaseUrl],
  );

  const load = useCallback(
    async (q: string) => {
      if (!kbId) return;
      setLoading(true);
      try {
        const list = (await getApiV1NodeList({
          kb_id: kbId,
          ...(q.trim() ? { search: q.trim() } : {}),
        })) as DomainNodeListItemResp[] | undefined;
        const docs = (list || []).filter(
          n => n.type === DomainNodeType.NodeTypeDocument && n.id,
        );
        setRows(docs.slice(0, MAX_SHOW));
      } catch {
        message.error('加载文档列表失败');
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [kbId],
  );

  const debouncedLoad = useMemo(
    () =>
      debounce((q: string) => {
        void load(q);
      }, 320),
    [load],
  );

  useEffect(() => {
    return () => debouncedLoad.cancel();
  }, [debouncedLoad]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    void load('');
  }, [open, load]);

  const handlePick = (item: DomainNodeListItemResp) => {
    const id = item.id!;
    const name = (item.name || '未命名').trim() || '未命名';
    const href = hrefForNode(id);
    onPick(href, name);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>插入知识库文档链接</DialogTitle>
      <DialogContent>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
          搜索文档标题，点击一行即可选择文档（用于当前链接表单或插入正文）。
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size='small'
          placeholder='输入关键词筛选（留空显示前若干篇）'
          value={search}
          onChange={e => {
            const v = e.target.value;
            setSearch(v);
            debouncedLoad(v);
          }}
          sx={{ mb: 1 }}
        />
        <Box sx={{ minHeight: 200, maxHeight: 360, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : rows.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
              暂无文档，请调整关键词或先创建文档
            </Typography>
          ) : (
            <List dense disablePadding>
              {rows.map(row => (
                <ListItemButton
                  key={row.id}
                  onClick={() => handlePick(row)}
                  selected={row.id === currentNodeId}
                >
                  <ListItemText
                    primary={
                      <Box component='span' sx={{ fontWeight: 500 }}>
                        {row.emoji ? `${row.emoji} ` : ''}
                        {row.name || '未命名'}
                      </Box>
                    }
                    secondary={
                      row.id === currentNodeId
                        ? '当前文档'
                        : row.id || undefined
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
      </DialogActions>
    </Dialog>
  );
};

export default KbDocLinkPickerDialog;
