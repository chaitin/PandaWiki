import { uploadFile } from '@/api';
import { Box, IconButton, Stack } from '@mui/material';
import { Icon, Message } from 'ct-mui';
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
  const currentPreviewUrl = useRef<string | null>(null);

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (currentPreviewUrl.current) {
      URL.revokeObjectURL(currentPreviewUrl.current);
    }

    const previewUrl = URL.createObjectURL(file);
    currentPreviewUrl.current = previewUrl;
    setPreview(previewUrl);

    if (type === 'base64') {
      try {
        // 压缩并转换图片为base64
        const compressedBase64 = await compressAndConvertToBase64(file);
        onChange(compressedBase64);
        URL.revokeObjectURL(previewUrl);
        currentPreviewUrl.current = null;
      } catch (error) {
        console.error(error);
        Message.error('图片处理失败');
        setPreview(value);
        URL.revokeObjectURL(previewUrl);
        currentPreviewUrl.current = null;
      }
    } else {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await uploadFile(formData);
        onChange('/static-file/' + res.key);
        URL.revokeObjectURL(previewUrl);
        currentPreviewUrl.current = null;
      } catch (error) {
        console.error(error);
        Message.error('上传失败');
        setPreview(value);
        URL.revokeObjectURL(previewUrl);
        currentPreviewUrl.current = null;
      }
    }
  };

  // 组件卸载时清理临时URL
  useEffect(() => {
    return () => {
      if (currentPreviewUrl.current) {
        URL.revokeObjectURL(currentPreviewUrl.current);
      }
    };
  }, []);

  return (
    <Box>
      <input
        id={id || name}
        disabled={disabled}
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
          borderColor: 'background.paper2',
          cursor: 'pointer',
          bgcolor: 'background.paper2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          ':hover': {
            borderColor: 'text.primary',
            '.upload-file-img-del-icon': {
              opacity: 1,
            },
          },
        }}
      >
        {preview ? (
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
                onChange('');
              }}
            >
              <Icon
                type='icon-icon_tool_close'
                sx={{ color: 'text.auxiliary' }}
              />
            </IconButton>
          </>
        ) : (
          <Stack
            alignItems={'center'}
            gap={0.5}
            sx={{ color: 'text.disabled', fontSize: 12 }}
          >
            <Icon type='icon-shangchuan' sx={{ fontSize: 18 }} />
            点击上传
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
