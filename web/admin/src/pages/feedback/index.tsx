import Card from '@/components/Card';

import { useNavigate, useParams } from 'react-router-dom';

import { useEffect, useState } from 'react';
import Comments from './Comments';
import DocumentSiteFeedback from './DocumentSiteFeedback';
import Evaluate from './Evaluate';
import { Stack, Select, MenuItem } from '@mui/material';
import { CusTabs } from '@ctzhian/ui';

const Feedback = () => {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();
  const [tab, setTab] = useState(tabParam || 'evaluate');
  const [commentStatus, setCommentStatus] = useState(99);
  const [showCommentsFilter, setShowCommentsFilter] = useState(false);

  useEffect(() => {
    setTab(tabParam || 'evaluate');
  }, [tabParam]);

  return (
    <Card>
      <Stack
        direction='row'
        alignItems={'center'}
        justifyContent={'space-between'}
        sx={{ p: 2 }}
      >
        <CusTabs
          value={tab}
          onChange={value => {
            setTab(value as string);
            navigate(`/feedback/${value}`);
          }}
          size='small'
          sx={{
            '.MuiButtonBase-root.Mui-disabled': {
              pointerEvents: 'auto',
            },
          }}
          list={[
            { label: 'AI 问答评价', value: 'evaluate' },
            { label: '文档评论', value: 'comments' },
            { label: '文档与站点反馈', value: 'document_feedback' },
          ]}
        />
        {showCommentsFilter && (
          <Select
            value={commentStatus}
            sx={{ width: 120 }}
            onChange={e => {
              setCommentStatus(+e.target.value as number);
            }}
          >
            <MenuItem value={99}>全部</MenuItem>
            <MenuItem value={0}>待审核</MenuItem>
            <MenuItem value={1}>已通过</MenuItem>
            <MenuItem value={-1}>已拒绝</MenuItem>
          </Select>
        )}
      </Stack>
      {tab === 'comments' && (
        <Comments
          commentStatus={commentStatus}
          setShowCommentsFilter={setShowCommentsFilter}
        />
      )}
      {tab === 'evaluate' && <Evaluate />}
      {tab === 'document_feedback' && <DocumentSiteFeedback />}
    </Card>
  );
};

export default Feedback;
