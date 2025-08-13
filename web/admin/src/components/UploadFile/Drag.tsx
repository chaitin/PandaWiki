import { formatByte } from '@/utils';
import { Upload as UploadIcon } from '@mui/icons-material';
import { Box, Button, Stack, Typography, useTheme } from '@mui/material';
import { Icon, Message } from 'ct-mui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';

interface UploadProps {
  file?: File[];
  onChange: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => void;
  type?: 'drag' | 'select';
  accept?: string;
  size?: number;
  multiple?: boolean;
}

const Upload = ({
  file = [],
  onChange,
  type = 'select',
  accept,
  multiple = true,
}: UploadProps) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dropFiles, setDropFiles] = useState<File[]>(file);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      const validFiles = acceptedFiles;

      const newFiles = multiple ? [...file, ...validFiles] : validFiles;
      setDropFiles(newFiles);
      onChange(newFiles, rejectedFiles);
    },
    [dropFiles, onChange, multiple],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept
      ? accept.split(',').reduce((acc: Record<string, string[]>, item) => {
          const [type, subtype] = item.trim().split('/');
          if (!acc[type]) acc[type] = [];
          if (subtype) acc[type].push(subtype);
          return acc;
        }, {})
      : undefined,
    multiple,
    noClick: type === 'drag',
    noKeyboard: type === 'drag',
  });

  useEffect(() => {
    setDropFiles(file);
  }, [file]);

  return (
    <Box sx={{ width: '100%' }}>
      {type === 'drag' && (
        <Stack
          alignItems='center'
          {...getRootProps()}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '10px',
            p: 4,
            textAlign: 'center',
            backgroundColor: isDragActive
              ? 'primary.main'
              : 'background.paper2',
            cursor: 'pointer',
            '&:hover': {
              borderColor: theme.palette.primary.main,
            },
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input {...getInputProps()} />
          <Icon
            type='icon-shangchuan'
            sx={{ fontSize: 40, mb: 1, color: 'text.secondary' }}
          />
          <Typography
            variant='body1'
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Button
              variant='text'
              size='small'
              sx={{ minWidth: 'auto', p: 0, ml: 1 }}
            >
              点击浏览文件
            </Button>
            或拖拽文件到区域内
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 1, fontSize: 12 }}
          >
            支持格式 {accept || '所有文件'}
          </Typography>
          {/* {size && <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, fontSize: 12 }}>
            支持上传大小不超过 {formatByte(size)} 的文件
          </Typography>} */}
        </Stack>
      )}

      {/* 普通选择按钮 */}
      {type === 'select' && (
        <Button
          variant='outlined'
          startIcon={<UploadIcon />}
          onClick={() => fileInputRef.current?.click()}
        >
          选择文件
        </Button>
      )}

      <input
        type='file'
        ref={fileInputRef}
        hidden
        accept={accept}
        multiple={multiple}
        onChange={e => {
          if (e.target.files) {
            onDrop(Array.from(e.target.files), []);
          }
        }}
      />
    </Box>
  );
};

export default Upload;
