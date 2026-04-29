'use client';

import { useStore } from '@/provider';
import { postShareProV1DocumentFeedback } from '@/request/pro/DocumentFeedback';
import { getResolvedKbId } from '@/utils/kbId';
import { isAuthInfoEmpty } from '@/utils/authInfo';
import { lacksAccountIdentityForSiteFeedback } from '@/utils/siteFeedbackAuth';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { message } from '@ctzhian/ui';
import { useCallback, useEffect, useState } from 'react';

export default function SiteFeedbackDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { kbDetail, authInfo, setLoginModalOpen } = useStore();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!lacksAccountIdentityForSiteFeedback(authInfo)) return;
    onClose();
    if (!isAuthInfoEmpty(authInfo)) {
      message.error(
        '问题反馈需使用账号登录（用户名密码或企业 SSO），当前为访问口令认证',
      );
    }
    setLoginModalOpen?.(true);
  }, [open, authInfo, onClose, setLoginModalOpen]);

  const handleClose = useCallback(() => {
    setText('');
    onClose();
  }, [onClose]);

  const submit = async () => {
    if (isAuthInfoEmpty(authInfo)) {
      message.error('请先登录后再提交问题反馈');
      setLoginModalOpen?.(true);
      return;
    }
    if (lacksAccountIdentityForSiteFeedback(authInfo)) {
      message.error(
        '问题反馈需使用账号登录（用户名密码或企业 SSO），当前为访问口令认证',
      );
      setLoginModalOpen?.(true);
      return;
    }
    const content = text.trim();
    if (!content) {
      message.error('请填写反馈内容');
      return;
    }
    const kbId = getResolvedKbId(kbDetail);
    if (!kbId) {
      message.error('无法确定知识库，请稍后重试');
      return;
    }
    setLoading(true);
    try {
      await postShareProV1DocumentFeedback(
        {
          content,
          feedback_category: 'general',
          node_id: '',
        },
        {
          headers: { 'X-KB-ID': kbId },
        },
      );
      message.success('感谢反馈，我们已收到');
      handleClose();
    } catch (e: unknown) {
      message.error(
        (e as { message?: string })?.message || '提交失败，请稍后重试',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>问题反馈</DialogTitle>
      <DialogContent>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          描述您遇到的问题或建议（不关联具体文档）。须使用账号登录（用户名密码或企业
          SSO）后提交；仅简单访问口令时无法提交。
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={5}
          maxRows={12}
          placeholder='请尽量写清复现步骤或期望行为…'
          value={text}
          onChange={e => setText(e.target.value)}
          inputProps={{ maxLength: 8000 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button
          variant='contained'
          onClick={() => void submit()}
          disabled={loading}
        >
          {loading ? '提交中…' : '提交'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
