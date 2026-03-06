import Card from '@/components/Card';
import { getApiV1NodeStats } from '@/request/Node';
import { useAppSelector } from '@/store';
import { Box, ButtonBase, Stack } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import DocSearch from './DocSearch';

interface DocPageHeaderProps {
  onPublishClick: () => void;
  onRagClick: () => void;
  /** 变更时触发重新拉取统计 */
  refreshTrigger?: number;
}

const DocPageHeader = ({
  onPublishClick,
  onRagClick,
  refreshTrigger,
}: DocPageHeaderProps) => {
  const { kb_id, isRefreshDocList } = useAppSelector(state => state.config);
  const [stats, setStats] = useState({
    unreleased_nav_count: 0,
    unpublished_count: 0,
    unstudied_count: 0,
  });

  const getStats = useCallback(() => {
    if (!kb_id) return;
    getApiV1NodeStats({ kb_id }).then(res => {
      if (res) {
        setStats({
          unreleased_nav_count: res.unreleased_nav_count ?? 0,
          unpublished_count: res.unpublished_count ?? 0,
          unstudied_count: res.unstudied_count ?? 0,
        });
      }
    });
  }, [kb_id]);

  useEffect(() => {
    if (kb_id) getStats();
  }, [kb_id, getStats]);

  useEffect(() => {
    if (isRefreshDocList) getStats();
  }, [isRefreshDocList, getStats]);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) getStats();
  }, [refreshTrigger, getStats]);

  return (
    <Card>
      <Stack
        direction={'row'}
        alignItems={'center'}
        justifyContent={'space-between'}
        sx={{ p: 2 }}
      >
        <Stack
          direction={'row'}
          alignItems={'center'}
          gap={0}
          sx={{ fontSize: 16, fontWeight: 700 }}
        >
          <Box>目录</Box>
          {(stats.unpublished_count > 0 || stats.unreleased_nav_count > 0) && (
            <>
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={0}
                sx={{ ml: 2 }}
              >
                {stats.unreleased_nav_count > 0 && (
                  <Box
                    sx={{
                      color: 'error.main',
                      fontSize: 12,
                      fontWeight: 'normal',
                    }}
                  >
                    {stats.unreleased_nav_count} 个 目录未发布，
                  </Box>
                )}
                {stats.unpublished_count > 0 && (
                  <Box
                    sx={{
                      color: 'error.main',
                      fontSize: 12,
                      fontWeight: 'normal',
                    }}
                  >
                    {stats.unpublished_count} 个 文档/文件夹未发布，
                  </Box>
                )}
              </Stack>
              <ButtonBase
                disableRipple
                sx={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: 'primary.main',
                }}
                onClick={onPublishClick}
              >
                去发布
              </ButtonBase>
            </>
          )}
          {stats.unstudied_count > 0 && (
            <>
              <Box
                sx={{
                  color: 'error.main',
                  fontSize: 12,
                  fontWeight: 'normal',
                  ml: 2,
                }}
              >
                {stats.unstudied_count} 个文档未学习，
              </Box>
              <ButtonBase
                disableRipple
                sx={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: 'primary.main',
                }}
                onClick={onRagClick}
              >
                去学习
              </ButtonBase>
            </>
          )}
        </Stack>
        <DocSearch />
      </Stack>
    </Card>
  );
};

export default DocPageHeader;
