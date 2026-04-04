import {
  getApiV1NodeDetail,
  postApiV1NodeLock,
  postApiV1NodeUnlock,
} from '@/request/Node';
import { V1NodeDetailResp } from '@/request/types';
import { useAppSelector } from '@/store';
import { Box, Stack, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { WrapContext } from '..';
import LoadingEditorWrap from './Loading';
import EditorWrap from './Wrap';

const Edit = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { kb_id = '' } = useAppSelector(state => state.config);
  const { setNodeDetail } = useOutletContext<WrapContext>();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<V1NodeDetailResp | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockHolder, setLockHolder] = useState('');
  const lockedNodeRef = useRef<{ id: string; kb_id: string } | null>(null);

  const unlockCurrent = useCallback(() => {
    if (lockedNodeRef.current) {
      postApiV1NodeUnlock(lockedNodeRef.current).catch(() => {});
      lockedNodeRef.current = null;
    }
  }, []);

  const getDetail = async () => {
    setLoading(true);
    setLocked(false);
    try {
      const res = await getApiV1NodeDetail({ id, kb_id });
      if (res.editing_locked) {
        setLocked(true);
        setLockHolder(res.editor_account || '其他管理员');
        setDetail(null);
        return;
      }
      try {
        await postApiV1NodeLock({ id, kb_id });
        lockedNodeRef.current = { id, kb_id };
      } catch {
        setLocked(true);
        setLockHolder(res.editor_account || '其他管理员');
        setDetail(null);
        return;
      }
      setDetail(res);
      setNodeDetail(res);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && kb_id) {
      unlockCurrent();
      getDetail();
    }
    return () => {
      unlockCurrent();
    };
  }, [id, kb_id]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lockedNodeRef.current) {
        const body = JSON.stringify(lockedNodeRef.current);
        const url = (window.__BASENAME__ || '') + '/api/v1/node/unlock';
        const token = localStorage.getItem('panda_wiki_token') || '';
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  if (locked) {
    return (
      <Stack
        alignItems='center'
        justifyContent='center'
        spacing={2}
        sx={{ height: '80vh' }}
      >
        <LockIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant='h6' color='text.secondary'>
          该文档正由 {lockHolder} 编辑中
        </Typography>
        <Typography variant='body2' color='text.tertiary'>
          文档发布后方可编辑，请稍后再试
        </Typography>
        <Button variant='outlined' onClick={() => navigate(-1)}>
          返回
        </Button>
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        flexGrow: 1,
        '& .collaboration-carets__caret': {
          borderLeft: '1px solid #fff',
          borderRight: '1px solid #fff',
          marginLeft: '-1px',
          marginRight: '-1px',
          pointerEvents: 'none',
          position: 'relative',
          wordBreak: 'normal',
        },
        '& .collaboration-carets__label': {
          borderRadius: '0 3px 3px 3px',
          color: '#fff',
          fontSize: '12px',
          fontStyle: 'normal',
          fontWeight: '600',
          left: '-1px',
          lineHeight: 'normal',
          padding: '0.1rem 0.3rem',
          position: 'absolute',
          top: '1.4em',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        },
      }}
    >
      {loading ? (
        <LoadingEditorWrap />
      ) : (
        detail && <EditorWrap detail={detail} />
      )}
    </Box>
  );
};

export default Edit;
