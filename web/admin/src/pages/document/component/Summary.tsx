import { createNodeSummary, updateNode } from '@/api';
import { Button, Stack, TextField } from '@mui/material';
import { Icon, Message, Modal } from 'ct-mui';
import { useEffect, useState } from 'react';

interface SummaryProps {
  kb_id: string;
  data: { id: string; summary: string; name: string };
  open: boolean;
  refresh?: (value?: string) => void;
  onClose: () => void;
}

const Summary = ({ open, data, kb_id, onClose, refresh }: SummaryProps) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');

  const createSummary = () => {
    setLoading(true);
    createNodeSummary({ kb_id, ids: [data.id] })
      .then(res => {
        setSummary(res.summary);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleOk = () => {
    updateNode({ id: data.id, kb_id, summary }).then(() => {
      Message.success('保存成功');
      refresh?.(summary);
      onClose();
    });
  };

  useEffect(() => {
    if (open) {
      setSummary(data.summary || '');
    }
  }, [open, data]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      disableEscapeKeyDown
      title={'文档摘要'}
      onOk={handleOk}
      okText='保存'
      okButtonProps={{ loading }}
      footer={
        <Stack
          direction={'row'}
          alignItems={'center'}
          justifyContent={'space-between'}
          sx={{ p: 3, pt: 0 }}
        >
          <Button
            sx={{ minWidth: 'auto' }}
            onClick={createSummary}
            disabled={loading}
            startIcon={
              <Icon
                type='icon-shuaxin'
                sx={
                  loading
                    ? { animation: 'loadingRotate 1s linear infinite' }
                    : {}
                }
              />
            }
          >
            AI 生成
          </Button>
          <Stack direction={'row'} alignItems={'center'} gap={2}>
            <Button onClick={onClose} sx={{ color: 'text.primary' }}>
              取消
            </Button>
            <Button
              sx={{ width: 100 }}
              loading={loading}
              onClick={handleOk}
              variant='contained'
            >
              保存
            </Button>
          </Stack>
        </Stack>
      }
    >
      <TextField
        autoFocus
        fullWidth
        multiline
        minRows={6}
        maxRows={12}
        value={summary}
        placeholder='暂无摘要，可在此处编辑'
        disabled={loading}
        onChange={event => {
          setSummary(event.target.value);
        }}
      />
    </Modal>
  );
};

export default Summary;
