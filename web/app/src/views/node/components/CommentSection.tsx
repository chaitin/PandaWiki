'use client';

import CommentInput, {
  CommentInputRef,
  ImageItem,
} from '@/components/commentInput';
import { getImagePath } from '@/utils/getImagePath';
import { Image } from '@ctzhian/ui';
import { Box, Button, Divider, Stack, TextField } from '@mui/material';
import React from 'react';
import {
  Control,
  Controller,
  FieldErrors,
  UseFormHandleSubmit,
} from 'react-hook-form';
import dayjs from 'dayjs';

interface CommentItem {
  id: string;
  content: string;
  created_at: string;
  pic_urls?: string[];
  info: { user_name: string };
  ip_address?: {
    city?: string;
    country?: string;
    province?: string;
    ip?: string;
  };
}

interface CommentSectionProps {
  commentList: CommentItem[];
  contentFocused: boolean;
  control: Control<{ content: string; name: string }>;
  errors: FieldErrors<{ content: string; name: string }>;
  onSubmit: ReturnType<UseFormHandleSubmit<{ content: string; name: string }>>;
  commentLoading: boolean;
  commentInputRef: React.RefObject<CommentInputRef | null>;
  commentImages: ImageItem[];
  onContentFocus: () => void;
  onContentBlur: () => void;
  onImagesChange: (images: ImageItem[]) => void;
  basePath: string;
  showNameInput: boolean;
}

const renderIp = (ip_address: CommentItem['ip_address']) => {
  const { city = '', country = '未知', province = '', ip } = ip_address || {};
  return (
    <>
      <Box>{ip}</Box>
      <Box sx={{ color: 'text.tertiary', fontSize: 12 }}>
        {country === '中国' ? `${province}-${city}` : `${country}`}
      </Box>
    </>
  );
};

const CommentSection = ({
  commentList,
  contentFocused,
  control,
  errors,
  onSubmit,
  commentLoading,
  commentInputRef,
  commentImages,
  onContentFocus,
  onContentBlur,
  onImagesChange,
  basePath,
  showNameInput,
}: CommentSectionProps) => (
  <>
    <Divider sx={{ my: 4 }} />
    <Box sx={{ fontWeight: 700, fontSize: 18, mb: 3 }}>评论</Box>
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: contentFocused ? 'text.primary' : 'divider',
        borderRadius: 2,
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <Controller
        name='content'
        control={control}
        rules={{ required: '请输入评论' }}
        render={({ field }) => (
          <CommentInput
            value={field.value}
            onChange={field.onChange}
            onImagesChange={onImagesChange}
            ref={commentInputRef}
            onFocus={() => {
              onContentFocus();
            }}
            onBlur={() => {
              onContentBlur();
              field.onBlur();
            }}
            placeholder='请输入评论'
            error={!!errors.content}
            helperText={errors.content?.message}
          />
        )}
      />
      <Divider sx={{ my: 2 }} />
      <Stack
        direction='row-reverse'
        justifyContent='space-between'
        alignItems='center'
        sx={{ fontSize: 14, color: 'text.secondary' }}
      >
        <Button variant='contained' onClick={onSubmit} loading={commentLoading}>
          发送
        </Button>
        {showNameInput && (
          <Controller
            rules={{ required: '请输入你的昵称' }}
            name='name'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                placeholder='你的昵称'
                size='small'
                sx={{
                  '.MuiOutlinedInput-notchedOutline': {
                    border: '1px solid',
                    borderColor: 'var(--mui-palette-divider) !important',
                  },
                }}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />
        )}
      </Stack>
    </Box>
    <Stack gap={1} sx={{ mt: 4 }}>
      {commentList.map((item, index) => (
        <React.Fragment key={item.id}>
          <Stack gap={1}>
            <Box sx={{ fontSize: 14, fontWeight: 700 }}>
              {item.info.user_name}
            </Box>
            <Box sx={{ fontSize: 14 }}>{item.content}</Box>
            <Stack direction='row' gap={1}>
              <Image.PreviewGroup>
                {(item.pic_urls || []).map((url: string) => (
                  <Image
                    key={url}
                    alt={url}
                    src={getImagePath(url, basePath)}
                    width={80}
                    height={80}
                    style={{
                      borderRadius: '4px',
                      objectFit: 'cover',
                      boxShadow: '0px 0px 3px 1px rgba(0,0,5,0.15)',
                      cursor: 'pointer',
                    }}
                    referrerPolicy='no-referrer'
                  />
                ))}
              </Image.PreviewGroup>
            </Stack>
            <Stack
              direction='row'
              justifyContent='flex-end'
              alignItems='center'
              gap={2}
              sx={{ color: 'text.tertiary', fontSize: 12 }}
            >
              {renderIp(item.ip_address)}
              <Box>{dayjs(item.created_at).fromNow()}</Box>
            </Stack>
          </Stack>
          <Divider sx={{ my: 3, color: 'text.tertiary', fontSize: 14 }}>
            {index !== commentList.length - 1 ? '' : '没有更多了'}
          </Divider>
        </React.Fragment>
      ))}
    </Stack>
  </>
);

export default CommentSection;
