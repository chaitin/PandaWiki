import { getApiV1NodeDetail } from '@/request/Node';
import { V1NodeDetailResp } from '@/request/types';
import { useAppSelector } from '@/store';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { WrapContext } from '..';
import LoadingEditorWrap from './Loading';
import EditorWrap from './Wrap';

const Edit = () => {
  const { id = '' } = useParams();
  const { kb_id = '' } = useAppSelector(state => state.config);
  const { setNodeDetail } = useOutletContext<WrapContext>();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<V1NodeDetailResp | null>(null);

  const getDetail = () => {
    setLoading(true);
    getApiV1NodeDetail({
      id,
      kb_id,
    })
      .then(res => {
        setDetail(res);
        setNodeDetail(res);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 0);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (id && kb_id) {
      getDetail();
    }
  }, [id, kb_id]);

  return (
    <Box
      sx={{
        position: 'relative',
        flexGrow: 1,
        /* Give a remote user a caret */
        '& .collaboration-carets__caret': {
          borderLeft: '1px solid #fff',
          borderRight: '1px solid #fff',
          marginLeft: '-1px',
          marginRight: '-1px',
          pointerEvents: 'none',
          position: 'relative',
          wordBreak: 'normal',
        },
        /* Render the username above the caret */
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
