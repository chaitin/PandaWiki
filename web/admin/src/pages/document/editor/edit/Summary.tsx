import {
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
}

const Summary = ({ open, onClose, updateDetail }: SummaryProps) => {
  const { kb_id } = useAppSelector(state => state.config);
  const { nodeDetail } = useOutletContext<WrapContext>();
  const [summary, setSummary] = useState(nodeDetail?.meta?.summary || '');
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState(false);

  const handleClose = () => {
    setEdit(false);
    setSummary('');
    onClose();
  };

  const createSummary = () => {
    if (!nodeDetail) return;
    setLoading(true);
    postApiV1NodeSummary({ kb_id, ids: [nodeDetail.id!] })
      .then(res => {
        // @ts-expect-error 类型错误
        setSummary(res.summary);
        setEdit(true);
      })
      .finally(() => {
        setLoading(false);
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
          点击此处，AI 自动生成摘要
        </Button>
      </Stack>
    </Modal>
  );
};

export default Summary;
