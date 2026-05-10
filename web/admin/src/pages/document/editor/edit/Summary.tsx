import {
  postApiV1NodeImageSummary,
  postApiV1NodeSummary,
  putApiV1NodeDetail,
  V1NodeDetailResp,
} from '@/request';
import { useAppSelector } from '@/store';
import { message, Modal } from '@ctzhian/ui';
import { Button, CircularProgress, Stack, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { WrapContext } from '..';
import { IconDJzhinengzhaiyao } from '@panda-wiki/icons';

interface SummaryProps {
  open: boolean;
  onClose: () => void;
  updateDetail: (detail: V1NodeDetailResp) => void;
  getCurrentContent?: () => string;
}

const Summary = ({
  open,
  onClose,
  updateDetail,
  getCurrentContent,
}: SummaryProps) => {
  const { kb_id } = useAppSelector(state => state.config);
  const { nodeDetail } = useOutletContext<WrapContext>();
  const [summary, setSummary] = useState(nodeDetail?.meta?.summary || '');
  const [loadingAction, setLoadingAction] = useState<'text' | 'images' | null>(
    null,
  );
  const [edit, setEdit] = useState(false);
  const loading = !!loadingAction;

  const handleClose = () => {
    setEdit(false);
    setSummary('');
    onClose();
  };

  const createSummary = () => {
    if (!nodeDetail) return;
    setLoadingAction('text');
    postApiV1NodeSummary({ kb_id, ids: [nodeDetail.id!] })
      .then(res => {
        // @ts-expect-error 类型错误
        setSummary(res.summary);
        setEdit(true);
      })
      .finally(() => {
        setLoadingAction(null);
      });
  };

  const createImageSummary = () => {
    if (!nodeDetail) return;
    setLoadingAction('images');
    postApiV1NodeImageSummary({
      kb_id,
      ids: [nodeDetail.id!],
      name: nodeDetail.name,
      content: getCurrentContent?.() || nodeDetail.content || '',
    })
      .then(res => {
        // @ts-expect-error 类型错误
        setSummary(res.summary);
        setEdit(true);
      })
      .finally(() => {
        setLoadingAction(null);
      });
  };

  useEffect(() => {
    if (open) {
      setSummary(nodeDetail?.meta?.summary || '');
    }
  }, [open, nodeDetail]);

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title='智能摘要'
      okText='保存'
      okButtonProps={{
        disabled: loading || !edit,
      }}
      onOk={() => {
        if (!nodeDetail) return;
        updateDetail({
          meta: {
            ...nodeDetail?.meta,
            summary,
          },
        });
        putApiV1NodeDetail({ id: nodeDetail.id!, kb_id, summary }).then(() => {
          message.success('保存成功');
        });
        handleClose();
      }}
    >
      <Stack gap={2}>
        <TextField
          autoFocus
          multiline
          disabled={loading}
          rows={10}
          fullWidth
          value={summary}
          onChange={e => {
            setSummary(e.target.value);
            setEdit(true);
          }}
          placeholder='请输入摘要'
        />
        <Button
          fullWidth
          variant='outlined'
          onClick={createSummary}
          disabled={loading}
          startIcon={
            loading ? (
              <CircularProgress size={16} />
            ) : (
              <IconDJzhinengzhaiyao sx={{ fontSize: 16 }} />
            )
          }
        >
          {loadingAction === 'text' ? '正在生成文档摘要...' : 'AI 自动生成摘要'}
        </Button>
        <Button
          fullWidth
          variant='outlined'
          onClick={createImageSummary}
          disabled={loading}
          startIcon={
            loadingAction === 'images' ? (
              <CircularProgress size={16} />
            ) : (
              <IconDJzhinengzhaiyao sx={{ fontSize: 16 }} />
            )
          }
        >
          {loadingAction === 'images'
            ? '正在摘要全部图片...'
            : '一键摘要文档全部图片'}
        </Button>
      </Stack>
    </Modal>
  );
};

export default Summary;
