import Card from '@/components/Card';

import { useNavigate, useParams } from 'react-router-dom';

import { useState } from 'react';
import Comments from './Comments';
import Evaluate from './Evaluate';
import { Stack, Select, MenuItem, Box, Tooltip } from '@mui/material';
import { CusTabs } from 'ct-mui';
import { useAppSelector } from '@/store';
import InfoIcon from '@mui/icons-material/Info';
import Correction from './Correction';

const Feedback = () => {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();
  const [tab, setTab] = useState(tabParam || 'evaluate');
  const [commentStatus, setCommentStatus] = useState(99);
  const [showCommentsFilter, setShowCommentsFilter] = useState(false);
  const { license } = useAppSelector(state => state.config);
  const isPro = license.edition === 1 || license.edition === 2;

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
            {
              label: (
                <Stack direction='row' alignItems='center' gap={0.5}>
                  <Box>文档纠错</Box>
                  {!isPro && (
                    <Tooltip title='联创版和企业版可用' placement='top' arrow>
                      <InfoIcon
                        sx={{ color: 'text.secondary', fontSize: 14 }}
                      />
                    </Tooltip>
                  )}
                </Stack>
              ),
              value: 'correction',
              disabled: !isPro,
            },
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
      {tab === 'correction' && <Correction />}
    </Card>
  );
};

export default Feedback;
