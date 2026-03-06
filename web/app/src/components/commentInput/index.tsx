'use client';

import { postShareV1CommonFileUpload } from '@/request/ShareFile';
import { message } from '@ctzhian/ui';
import {
  Box,
  IconButton,
  Stack,
  TextField,
  TextFieldProps,
  alpha,
  Popover,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import zh from '../emoji/emoji-data/zh.json';
import { useTheme } from '@mui/material/styles';
import React, { useRef, useState } from 'react';
import { useBasePath } from '@/hooks';

export interface ImageItem {
  id: string;
  url: string; // 本地预览 URL (blob URL)
  file: File;
  uploaded?: boolean; // 是否已上传到服务器
  uploadedUrl?: string; // 上传后的服务器 URL
}

interface CommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onImagesChange?: (images: ImageItem[]) => void;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  maxImages?: number;
  textFieldProps?: Partial<TextFieldProps>;
}

export interface CommentInputRef {
  uploadImages: () => Promise<string[]>; // 上传所有图片并返回 URL 列表
  clearImages: () => void; // 清空图片
}

const CommentInput = React.forwardRef<CommentInputRef, CommentInputProps>(
  (
    {
      value,
      onChange,
      onImagesChange,
      placeholder = '请输入评论',
      error,
      helperText,
      onFocus,
      onBlur,
      maxImages = 9,
      textFieldProps,
    },
    ref,
  ) => {
    const theme = useTheme();
    const basePath = useBasePath();
    const [images, setImages] = useState<ImageItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [emojiAnchorEl, setEmojiAnchorEl] =
      useState<HTMLButtonElement | null>(null);

    // 添加本地图片预览（不上传到服务器）
    const handleImageSelect = async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) {
        message.warning(`最多只能上传 ${maxImages} 张图片`);
        return;
      }

      const filesToAdd = Array.from(files).slice(0, remainingSlots);

      try {
        const newImages: ImageItem[] = [];

        for (const file of filesToAdd) {
          // 验证文件类型（只允许 jpg、jpeg、png、webp）
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (!allowedTypes.includes(file.type)) {
            message.error('只支持上传 jpg、jpeg、png、webp 格式的图片');
            continue;
          }

          // 验证文件大小 (10MB)
          if (file.size > 10 * 1024 * 1024) {
            message.error('图片大小不能超过 10MB');
            continue;
          }

          // 创建本地预览 URL
          const localUrl = URL.createObjectURL(file);

          newImages.push({
            id: Date.now().toString() + Math.random(),
            url: localUrl,
            file,
            uploaded: false,
          });
        }

        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onImagesChange?.(updatedImages);
      } catch (error: any) {
        message.error(error.message || '图片选择失败');
      }
    };

    // 上传所有图片到服务器
    const uploadAllImages = async (): Promise<string[]> => {
      if (images.length === 0) return [];

      setUploading(true);
      const uploadedUrls: string[] = [];

      try {
        for (const image of images) {
          if (image.uploaded && image.uploadedUrl) {
            // 已经上传过的图片直接使用服务器 URL
            uploadedUrls.push(image.uploadedUrl);
          } else {
            let token = '';

            try {
              const Cap = (await import(`@cap.js/widget`)).default;
              const cap = new Cap({
                apiEndpoint: `${basePath}/share/v1/captcha/`,
              });
              const solution = await cap.solve();
              token = solution.token;
            } catch (error) {
              message.error('验证失败');
              console.log(error, 'error---------');
              setUploading(false);
              return Promise.reject(error);
            }
            // 上传新图片
            const result = await postShareV1CommonFileUpload({
              file: image.file,
              captcha_token: token,
            });
            const serverUrl = '/static-file/' + result.key;
            uploadedUrls.push(serverUrl);

            // 更新图片状态
            image.uploaded = true;
            image.uploadedUrl = serverUrl;
          }
        }

        return uploadedUrls;
      } catch (error: any) {
        message.error(error.message || '图片上传失败');
        throw error;
      } finally {
        setUploading(false);
      }
    };

    // 清空所有图片
    const clearImages = () => {
      // 释放所有本地 URL
      images.forEach(img => {
        if (!img.uploaded && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });
      setImages([]);
      onImagesChange?.([]);
    };

    // 暴露方法给父组件
    React.useImperativeHandle(ref, () => ({
      uploadImages: uploadAllImages,
      clearImages,
    }));

    const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        const dataTransfer = new DataTransfer();
        imageFiles.forEach(file => dataTransfer.items.add(file));
        await handleImageSelect(dataTransfer.files);
      }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleImageSelect(e.target.files);
      // 重置 input value 以允许上传相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleRemoveImage = (id: string) => {
      const imageToRemove = images.find(img => img.id === id);
      if (
        imageToRemove &&
        !imageToRemove.uploaded &&
        imageToRemove.url.startsWith('blob:')
      ) {
        // 释放本地 URL
        URL.revokeObjectURL(imageToRemove.url);
      }

      const updatedImages = images.filter(img => img.id !== id);
      setImages(updatedImages);
      onImagesChange?.(updatedImages);
    };

    const handleClickUpload = () => {
      fileInputRef.current?.click();
    };

    const handleEmojiClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setEmojiAnchorEl(event.currentTarget);
    };

    const handleEmojiClose = () => {
      setEmojiAnchorEl(null);
    };

    const handleEmojiSelect = (emoji: any) => {
      const input = inputRef.current;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const newValue =
          value.substring(0, start) + emoji.native + value.substring(end);
        onChange(newValue);

        // 将光标移动到插入的表情后面
        setTimeout(() => {
          const newPosition = start + emoji.native.length;
          input.setSelectionRange(newPosition, newPosition);
          input.focus();
        }, 100);
      } else {
        // 如果无法获取光标位置，就追加到末尾
        onChange(value + emoji.native);
      }
      handleEmojiClose();
    };

    const emojiOpen = Boolean(emojiAnchorEl);
    const emojiPopoverId = emojiOpen ? 'emoji-popover' : undefined;

    return (
      <Box>
        <TextField
          value={value}
          onChange={e => onChange(e.target.value)}
          inputRef={inputRef}
          onFocus={onFocus}
          onBlur={onBlur}
          onPaste={handlePaste}
          placeholder={placeholder}
          fullWidth
          multiline
          minRows={2}
          slotProps={{
            htmlInput: {
              maxLength: 1000,
            },
          }}
          sx={{
            '.MuiOutlinedInput-notchedOutline': {
              border: 'none',
              padding: 0,
            },
            '.MuiInputBase-root': {
              padding: 0,
            },
          }}
          error={error}
          helperText={helperText}
          {...textFieldProps}
        />

        {/* 图片预览区域 */}
        {images.length > 0 && (
          <Stack direction='row' flexWrap='wrap' gap={1} sx={{ mt: 2, mb: 1 }}>
            {images.map(image => (
              <Box
                key={image.id}
                sx={{
                  position: 'relative',
                  width: 100,
                  height: 100,
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover .delete-btn': {
                    opacity: 1,
                  },
                }}
              >
                <Box
                  component='img'
                  src={image.url}
                  alt='preview'
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <IconButton
                  className='delete-btn'
                  size='small'
                  onClick={() => handleRemoveImage(image.id)}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: theme => alpha(theme.palette.common.black, 0.6),
                    color: 'white',
                    // opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      bgcolor: theme => alpha(theme.palette.common.black, 0.8),
                    },
                    width: 20,
                    height: 20,
                  }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}

        {/* 底部工具栏 */}
        <Stack direction='row' alignItems='center' gap={0.5} sx={{ mt: 1 }}>
          <IconButton
            size='small'
            onClick={handleEmojiClick}
            aria-describedby={emojiPopoverId}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <InsertEmoticonIcon />
          </IconButton>
          <IconButton
            size='small'
            onClick={handleClickUpload}
            disabled={uploading || images.length >= maxImages}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <ImageIcon />
          </IconButton>

          <Box
            sx={{
              ml: 'auto',
              fontSize: 12,
              color: 'text.tertiary',
            }}
          >
            {value.length} / 1000
          </Box>
        </Stack>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type='file'
          accept='.jpg,.jpeg,.png,.webp'
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        {/* 表情选择器 Popover */}
        <Popover
          id={emojiPopoverId}
          open={emojiOpen}
          anchorEl={emojiAnchorEl}
          onClose={handleEmojiClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Picker
            data={data}
            set='native'
            theme={theme.palette.mode === 'dark' ? 'dark' : 'light'}
            locale='zh'
            i18n={zh}
            onEmojiSelect={handleEmojiSelect}
            previewPosition='none'
            searchPosition='sticky'
            skinTonePosition='none'
            perLine={9}
            emojiSize={24}
          />
        </Popover>
      </Box>
    );
  },
);

CommentInput.displayName = 'CommentInput';

export default CommentInput;
