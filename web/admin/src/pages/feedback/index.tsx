import Card from '@/components/Card';

import { useNavigate, useParams } from 'react-router-dom';

import { useState } from 'react';
import Comments from './Comments';
import Evaluate from './Evaluate';
import { Stack } from '@mui/material';
import { CusTabs } from 'ct-mui';

const Feedback = () => {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();

  const [tab, setTab] = useState(tabParam || 'evaluate');

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
          onChange={(value) => {
            setTab(value as string);
            navigate(`/feedback/${value}`);
          }}
          size='small'
          list={[
            { label: 'AI 问答评价', value: 'evaluate' },
            { label: '文档评论', value: 'comments' },
            { label: '文档纠错', value: 'correction', disabled: true },
          ]}
        />
      </Stack>
      {tab === 'comments' && <Comments />}
      {tab === 'evaluate' && <Evaluate />}
    </Card>
  );
};

export default Feedback;
