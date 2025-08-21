import { uploadFile } from '@/api';
import { Box, IconButton, LinearProgress, Stack } from '@mui/material';
import { Icon, message } from '@ctzhian/ui';
import { useEffect, useRef, useState } from 'react';
import CustomImage from '../CustomImage';

interface UploadFileProps {
  type: 'url' | 'base64';
  id: string;
  name: string;
  disabled?: boolean;
  value: string;
  accept: string;
  onChange: (url: string) => void;
  width?: number;
}

const UploadFile = ({
  id,
  name,
  value,
  onChange,
  accept,
  type,
  width,
  disabled = false,
}: UploadFileProps) => {
  const [preview, setPreview] = useState<string>(value);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const currentPreviewUrl = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    event.stopPropagation();
    const file = event.target.files?.[0];
    if (!file) return;

    // 如果正在上传其他文件，先取消
    if (isUploading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (currentPreviewUrl.current) {
      URL.revokeObjectURL(currentPreviewUrl.current);
    }

    const previewUrl = URL.createObjectURL(file);
    currentPreviewUrl.current = previewUrl;
    setPreview(previewUrl);
    setUploadProgress(0);
    setIsUploading(true);

    // 创建新的 AbortController 用于取消上传
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (type === 'base64') {
      try {
        // 压缩并转换图片为base64
        const compressedBase64 = await compressAndConvertToBase64(file);
        onChange(compressedBase64);
        setUploadProgress(null);
        setIsUploading(false);
        clearInputValue();
        URL.revokeObjectURL(previewUrl);
        currentPreviewUrl.current = null;
      } catch (error) {
        if (abortController.signal.aborted) return;

        console.error(error);
        message.error('图片处理失败');
        setPreview(value);
        setUploadProgress(null);
        setIsUploading(false);
        clearInputValue();
        URL.revokeObjectURL(previewUrl);
        currentPreviewUrl.current = null;
      }
    } else {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await uploadFile(formData, {
          onUploadProgress: event => {
            setUploadProgress(event.progress);
          },
          abortSignal: abortController.signal,
        });
        onChange('/static-file/' + res.key);
        setUploadProgress(null);
        setIsUploading(false);
        clearInputValue();
        URL.revokeObjectURL(previewUrl);
        currentPreviewUrl.current = null;
      } catch (error: any) {
        if (abortController.signal.aborted) {
          setUploadProgress(null);
          setIsUploading(false);
          return;
        }

        console.error(error);
        message.error('上传失败');
        setPreview(value);
        setUploadProgress(null);
        setIsUploading(false);
        clearInputValue();
        URL.revokeObjectURL(previewUrl);
        currentPreviewUrl.current = null;
      }
    }
  };

  const clearInputValue = () => {
    const fileInput = document.getElementById(id || name) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // 组件卸载时清理临时URL和取消上传
  useEffect(() => {
    return () => {
      if (currentPreviewUrl.current) {
        URL.revokeObjectURL(currentPreviewUrl.current);
      }
      if (isUploading && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isUploading]);

  return (
    <Box>
      <input
        id={id || name}
        disabled={disabled || isUploading}
        type='file'
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Box
        component='label'
        htmlFor={id || name}
        sx={{
          width: width || 190,
          height: width || 173.26,
          borderRadius: '10px',
          border: '1px solid',
          borderColor: 'background.paper3',
          cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
          bgcolor: 'background.paper3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          opacity: disabled || isUploading ? 0.8 : 1,
          ':hover': {
            borderColor: 'text.primary',
            '.upload-file-img-del-icon': {
              opacity: 1,
            },
          },
        }}
      >
        {isUploading && uploadProgress !== null ? (
          <Stack
            width='100%'
            height='100%'
            justifyContent='center'
            alignItems='center'
            spacing={1}
          >
            <Box width='80%'>
              <LinearProgress
                variant='determinate'
                value={uploadProgress}
                sx={{ borderRadius: '4px' }}
              />
            </Box>
            <Box width='80%' textAlign='center' fontSize={12}>
              {uploadProgress}%
            </Box>
          </Stack>
        ) : preview ? (
          <>
            <CustomImage
              src={preview}
              preview={false}
              alt='Preview'
              width='100%'
              sx={{
                objectFit: 'cover',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0, 0, 0, 0.3)',
                opacity: 0,
                transition: 'opacity 0.5s',
                ':hover': {
                  opacity: 1,
                },
              }}
            />
            <IconButton
              size='small'
              className='upload-file-img-del-icon'
              sx={{
                transition: 'all 0.5s',
                position: 'absolute',
                top: 0,
                right: 0,
                zIndex: 1000,
                opacity: 0,
              }}
              onClick={event => {
                event.stopPropagation();
                event.preventDefault();
                setPreview('');
                clearInputValue();
                onChange('');
              }}
            >
              <Icon type='icon-icon_tool_close' sx={{ color: '#fff' }} />
            </IconButton>
          </>
        ) : (
          <Stack
            alignItems={'center'}
            gap={0.5}
            sx={{
              color: 'text.disabled',
              fontSize: width ? (width < 40 ? 8 : 12) : 12,
            }}
          >
            <Icon
              type='icon-shangchuan'
              sx={{ fontSize: width ? (width < 40 ? 12 : 18) : 18 }}
            />
            <Box>点击上传</Box>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export const compressAndConvertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const img = new Image();
      img.onload = () => {
        // 创建canvas用于压缩
        const canvas = document.createElement('canvas');
        // 设置最大宽高为800px进行压缩
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        // 计算压缩后的尺寸
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 绘制压缩后的图片
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为base64，使用0.8的质量进一步压缩
        const base64 = canvas.toDataURL(file.type, 0.8);
        resolve(base64);
      };
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    reader.readAsDataURL(file);
  });
};

export default UploadFile;
