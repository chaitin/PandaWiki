'use client';

import { ConstsCopySetting, V1ShareNodeDetailResp } from '@/request/types';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import { IconFuzhi, IconWenjian, IconWenjianjia } from '@panda-wiki/icons';
import dayjs from 'dayjs';
import type { UseTiptapReturn } from '@ctzhian/tiptap';
import { copyText } from '@/utils';

interface DocMetaInfoProps {
  info: V1ShareNodeDetailResp;
  characterCount?: number;
  kbDetailCopySetting?: string;
  onCopyDocMd: () => void;
}

const DocMetaInfo = ({
  info,
  characterCount,
  kbDetailCopySetting,
  onCopyDocMd,
}: DocMetaInfoProps) => (
  <>
    <Stack
      direction='row'
      alignItems='flex-start'
      gap={1}
      sx={{
        fontSize: 30,
        lineHeight: '36px',
        fontWeight: 'bold',
        color: 'text.primary',
        mb: '10px',
      }}
    >
      {info?.meta?.emoji ? (
        <Box sx={{ flexShrink: 0 }}>{info?.meta?.emoji}</Box>
      ) : info?.type === 1 ? (
        <IconWenjianjia sx={{ flexShrink: 0, mt: 0.5 }} />
      ) : (
        <IconWenjian sx={{ flexShrink: 0, mt: 0.5 }} />
      )}
      {info?.name}
    </Stack>
    <Stack
      direction='row'
      justifyContent='space-between'
      alignItems='center'
      sx={{ mb: 4 }}
    >
      <Stack
        direction='row'
        alignItems='center'
        gap={1}
        sx={{ fontSize: 14, color: 'text.tertiary' }}
      >
        {info?.created_at && (
          <Box>
            {info?.creator_account === 'admin'
              ? '管理员'
              : info?.creator_account}{' '}
            {dayjs(info?.created_at).fromNow()}创建
          </Box>
        )}
        {info?.updated_at && info.updated_at.slice(0, 1) !== '0' && (
          <>
            <Box>·</Box>
            <Box>
              {info?.editor_account === 'admin'
                ? '管理员'
                : info?.editor_account}{' '}
              {dayjs(info.updated_at).fromNow()}更新
            </Box>
          </>
        )}
        {!!characterCount && characterCount > 0 && (
          <>
            <Box>·</Box>
            <Box>{characterCount} 字</Box>
          </>
        )}
        {(info.pv ?? 0) > 0 && (
          <>
            <Box>·</Box>
            <Box>浏览量 {info.pv}</Box>
          </>
        )}
      </Stack>
      {info?.type === 2 &&
        kbDetailCopySetting !== ConstsCopySetting.CopySettingDisabled && (
          <Tooltip title='复制 MarkDown 格式' arrow placement='top'>
            <IconButton size='small' onClick={onCopyDocMd}>
              <IconFuzhi sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
    </Stack>
  </>
);

export default DocMetaInfo;
