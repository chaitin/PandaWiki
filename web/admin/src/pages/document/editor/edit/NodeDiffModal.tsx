import { getApiV1NodeDiff } from '@/request/Node';
import { V1NodeDiffResp } from '@/request/types';
import { Modal } from '@ctzhian/ui';
import { Box, Chip, Divider, Stack, useTheme } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';

interface NodeDiffModalProps {
  open: boolean;
  nodeId: string;
  kbId: string;
  onClose: () => void;
}

function diffLines(oldText: string, newText: string) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const maxLen = Math.max(oldLines.length, newLines.length);
  const result: {
    oldLine: string;
    newLine: string;
    type: 'same' | 'changed' | 'added' | 'removed';
  }[] = [];

  const lcs = buildLCS(oldLines, newLines);
  let oi = 0,
    ni = 0,
    li = 0;
  while (oi < oldLines.length || ni < newLines.length) {
    if (
      li < lcs.length &&
      oi < oldLines.length &&
      ni < newLines.length &&
      oldLines[oi] === lcs[li] &&
      newLines[ni] === lcs[li]
    ) {
      result.push({
        oldLine: oldLines[oi],
        newLine: newLines[ni],
        type: 'same',
      });
      oi++;
      ni++;
      li++;
    } else if (
      li < lcs.length &&
      oi < oldLines.length &&
      oldLines[oi] !== lcs[li]
    ) {
      result.push({ oldLine: oldLines[oi], newLine: '', type: 'removed' });
      oi++;
    } else if (
      li < lcs.length &&
      ni < newLines.length &&
      newLines[ni] !== lcs[li]
    ) {
      result.push({ oldLine: '', newLine: newLines[ni], type: 'added' });
      ni++;
    } else if (oi < oldLines.length) {
      result.push({ oldLine: oldLines[oi], newLine: '', type: 'removed' });
      oi++;
    } else if (ni < newLines.length) {
      result.push({ oldLine: '', newLine: newLines[ni], type: 'added' });
      ni++;
    } else {
      break;
    }
  }
  return result;
}

function buildLCS(a: string[], b: string[]): string[] {
  const m = a.length,
    n = b.length;
  if (m === 0 || n === 0) return [];
  if (m * n > 500000) {
    const result: string[] = [];
    let bi = 0;
    for (let ai = 0; ai < m && bi < n; ai++) {
      const idx = b.indexOf(a[ai], bi);
      if (idx !== -1) {
        result.push(a[ai]);
        bi = idx + 1;
      }
    }
    return result;
  }
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const lcs: string[] = [];
  let i = m,
    j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return lcs;
}

const PANEL_STYLE = {
  flex: 1,
  overflow: 'hidden',
  minWidth: 0,
};

const RichPanel = ({
  content,
  isHtml,
  label,
  diffResult,
  side,
}: {
  content: string;
  isHtml: boolean;
  label: string;
  diffResult: ReturnType<typeof diffLines>;
  side: 'old' | 'new';
}) => {
  const theme = useTheme();
  const addedBg =
    theme.palette.mode === 'dark'
      ? 'rgba(46,160,67,0.15)'
      : 'rgba(46,160,67,0.1)';
  const removedBg =
    theme.palette.mode === 'dark'
      ? 'rgba(248,81,73,0.15)'
      : 'rgba(248,81,73,0.1)';

  const rendered = useMemo(() => {
    return diffResult.map((row, idx) => {
      const line = side === 'old' ? row.oldLine : row.newLine;
      const isEmpty = line === '';
      let bg = 'transparent';
      if (row.type === 'added') bg = side === 'new' ? addedBg : 'transparent';
      else if (row.type === 'removed')
        bg = side === 'old' ? removedBg : 'transparent';
      else if (row.type === 'changed')
        bg = side === 'old' ? removedBg : addedBg;

      if (isHtml) {
        return (
          <Box
            key={idx}
            sx={{
              bgcolor: bg,
              minHeight: '1.6em',
              px: 1,
              borderLeft:
                row.type !== 'same' && !isEmpty
                  ? '3px solid'
                  : '3px solid transparent',
              borderColor:
                row.type === 'removed'
                  ? 'error.main'
                  : row.type === 'added'
                    ? 'success.main'
                    : 'transparent',
              '& img': { maxWidth: '100%' },
              '& table': { borderCollapse: 'collapse', width: '100%' },
              '& td, & th': {
                border: '1px solid',
                borderColor: 'divider',
                p: 0.5,
              },
            }}
            dangerouslySetInnerHTML={{ __html: line }}
          />
        );
      }
      return (
        <Box
          key={idx}
          sx={{
            bgcolor: bg,
            minHeight: '1.6em',
            px: 1,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'inherit',
            borderLeft:
              row.type !== 'same' && !isEmpty
                ? '3px solid'
                : '3px solid transparent',
            borderColor:
              row.type === 'removed'
                ? 'error.main'
                : row.type === 'added'
                  ? 'success.main'
                  : 'transparent',
          }}
        >
          {line || '\u00A0'}
        </Box>
      );
    });
  }, [diffResult, side, isHtml, addedBg, removedBg]);

  return (
    <Box sx={PANEL_STYLE}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.default',
          py: 1,
          px: 1,
          fontWeight: 'bold',
          fontSize: 13,
          color: 'text.secondary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          fontSize: 14,
          lineHeight: 1.8,
          p: 2,
          '& h1': { fontSize: 24, fontWeight: 'bold', my: 1 },
          '& h2': { fontSize: 20, fontWeight: 'bold', my: 1 },
          '& h3': { fontSize: 17, fontWeight: 'bold', my: 0.5 },
          '& p': { my: 0.5 },
          '& ul, & ol': { pl: 3 },
          '& a': { color: 'primary.main' },
          '& blockquote': {
            borderLeft: '3px solid',
            borderColor: 'divider',
            pl: 2,
            color: 'text.secondary',
            my: 1,
          },
          '& pre': {
            bgcolor: 'action.hover',
            p: 1.5,
            borderRadius: 1,
            overflow: 'auto',
            fontSize: 13,
          },
          '& code': {
            bgcolor: 'action.hover',
            px: 0.5,
            borderRadius: 0.5,
            fontSize: 13,
          },
        }}
      >
        {rendered}
      </Box>
    </Box>
  );
};

const NodeDiffModal = ({ open, nodeId, kbId, onClose }: NodeDiffModalProps) => {
  const [data, setData] = useState<V1NodeDiffResp | null>(null);
  const [loading, setLoading] = useState(false);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useEffect(() => {
    if (open && nodeId && kbId) {
      setLoading(true);
      getApiV1NodeDiff({ id: nodeId, kb_id: kbId })
        .then(res => setData(res))
        .finally(() => setLoading(false));
    }
  }, [open, nodeId, kbId]);

  const hasChanges =
    data?.has_release &&
    (data.current_content !== data.release_content ||
      data.current_name !== data.release_name);

  const isHtml = data?.content_type !== 'md';

  const diffResult = useMemo(() => {
    if (!data) return [];
    const oldContent = data.has_release ? data.release_content || '' : '';
    const newContent = data.current_content || '';
    return diffLines(oldContent, newContent);
  }, [data]);

  const handleScroll = (source: 'left' | 'right') => () => {
    if (syncing.current) return;
    syncing.current = true;
    const from = source === 'left' ? leftRef.current : rightRef.current;
    const to = source === 'left' ? rightRef.current : leftRef.current;
    if (from && to) {
      const ratio =
        from.scrollTop / (from.scrollHeight - from.clientHeight || 1);
      to.scrollTop = ratio * (to.scrollHeight - to.clientHeight || 1);
    }
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width='95vw'
      sx={{
        '.MuiDialogContent-root': {
          display: 'flex',
          flexDirection: 'column',
          p: '0 !important',
        },
      }}
      title={
        <Stack direction='row' alignItems='center' gap={2}>
          <Box>文档比对</Box>
          {data?.current_name && (
            <Box sx={{ fontSize: 14, color: 'text.tertiary', fontWeight: 400 }}>
              {data.current_name}
            </Box>
          )}
          {data && !data.has_release && (
            <Chip label='该文档尚未发布过' size='small' color='warning' />
          )}
          {data?.has_release && !hasChanges && (
            <Chip label='内容无差异' size='small' color='success' />
          )}
          {data?.has_release &&
            hasChanges &&
            data.current_name !== data.release_name && (
              <Chip
                label={`标题变更：${data.release_name} → ${data.current_name}`}
                size='small'
                color='info'
              />
            )}
        </Stack>
      }
    >
      {loading ? (
        <Box sx={{ py: 6, textAlign: 'center', color: 'text.tertiary' }}>
          加载中...
        </Box>
      ) : data ? (
        <Stack
          direction='row'
          divider={<Divider orientation='vertical' flexItem />}
          sx={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}
        >
          <Box
            ref={leftRef}
            onScroll={handleScroll('left')}
            sx={{ flex: 1, overflowY: 'auto', minWidth: 0 }}
          >
            <RichPanel
              content={data.has_release ? data.release_content || '' : ''}
              isHtml={isHtml}
              label='已发布版本'
              diffResult={diffResult}
              side='old'
            />
          </Box>
          <Box
            ref={rightRef}
            onScroll={handleScroll('right')}
            sx={{ flex: 1, overflowY: 'auto', minWidth: 0 }}
          >
            <RichPanel
              content={data.current_content || ''}
              isHtml={isHtml}
              label='当前编辑版本'
              diffResult={diffResult}
              side='new'
            />
          </Box>
        </Stack>
      ) : null}
    </Modal>
  );
};

export default NodeDiffModal;
