import {
  getApiV1NodeDetail,
  postApiV1NodeLock,
  postApiV1NodeUnlock,
} from '@/request/Node';
import { V1NodeDetailResp } from '@/request/types';
import { useAppSelector } from '@/store';
import { Box } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { WrapContext } from '..';
import LoadingEditorWrap from './Loading';
import EditorWrap from './Wrap';

const Edit = () => {
  const { id = '' } = useParams();
  const { kb_id = '', user } = useAppSelector(state => state.config);
  const { setNodeDetail } = useOutletContext<WrapContext>();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<V1NodeDetailResp | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const lockedNodeRef = useRef<{ id: string; kb_id: string } | null>(null);

  const unlockCurrent = useCallback(() => {
    if (lockedNodeRef.current) {
      postApiV1NodeUnlock(lockedNodeRef.current).catch(() => {});
      lockedNodeRef.current = null;
    }
  }, []);

  const getDetail = async () => {
    setLoading(true);
    setReadOnly(false);
    try {
      const res = await getApiV1NodeDetail({ id, kb_id });
      const selfId = user?.id;

      const tryAcquireLock = async (): Promise<boolean> => {
        try {
          await postApiV1NodeLock({ id, kb_id });
          lockedNodeRef.current = { id, kb_id };
          return true;
        } catch {
          return false;
        }
      };

      if (res.editing_locked) {
        const lockedBySelf =
          !!selfId && !!res.editor_id && res.editor_id === selfId;
        if (lockedBySelf) {
          const ok = await tryAcquireLock();
          if (ok) {
            setDetail(res);
            setNodeDetail(res);
            setReadOnly(false);
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 0);
            return;
          }
        }
        setDetail(res);
        setNodeDetail(res);
        setReadOnly(true);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 0);
        return;
      }

      const ok = await tryAcquireLock();
      if (!ok) {
        setDetail(res);
        setNodeDetail(res);
        setReadOnly(true);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 0);
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
  }, [id, kb_id, user?.id]);

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
        detail && (
          <EditorWrap
            detail={detail}
            readOnly={readOnly}
            onRefreshEditingLock={() => {
              unlockCurrent();
              void getDetail();
            }}
          />
        )
      )}
    </Box>
  );
};

export default Edit;
