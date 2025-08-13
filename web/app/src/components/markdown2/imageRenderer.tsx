'use client';

import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Dialog, styled, Box, SvgIcon, SvgIconProps } from '@mui/material';

const StyledErrorContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  borderStyle: 'none',
  borderRadius: '10px',
  marginLeft: '5px',
  cursor: 'pointer',
  maxWidth: '50%',
  boxSizing: 'content-box' as const,
  backgroundColor: 'var(--mui-palette-background-default)',
  border: `1px dashed var(--mui-palette-divider)`,
  minHeight: '100px',
  color: 'var(--mui-palette-text-tertiary)',
  fontSize: '14px',
}));

const StyledErrorText = styled('div')(({ theme }) => ({
  fontSize: '12px',
  marginBottom: 16,
}));

export const ImageErrorIcon = (props: SvgIconProps) => {
  return (
    <SvgIcon
      viewBox='0 0 1024 1024'
      version='1.1'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M520 672L256 413.44l-109.76 93.76V246.72h261.12a41.6 41.6 0 1 0 0-82.88H104.64A41.6 41.6 0 0 0 64 205.44V800a41.6 41.6 0 0 0 41.6 41.6h267.84a40.96 40.96 0 0 0 32-67.52h21.76z'
        p-id='4874'
      ></path>
      <path
        d='M952 211.52a41.92 41.92 0 0 0-28.48-15.68l-310.08-32a41.6 41.6 0 0 0-8.32 82.88l267.2 27.52-55.04 411.84-113.28-160-99.2 17.92 42.56 96-123.84 123.52-32-1.6a41.6 41.6 0 1 0-4.16 82.88l352 17.92h1.92a41.28 41.28 0 0 0 41.28-35.84L960 242.88a42.56 42.56 0 0 0-8-31.36z'
        p-id='4875'
      ></path>
      <path
        d='M695.36 397.44m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z'
        p-id='4876'
      ></path>
    </SvgIcon>
  );
};

// 错误展示组件
const ImageErrorDisplay = () => (
  <StyledErrorContainer>
    <ImageErrorIcon
      sx={{ color: 'var(--mui-palette-text-tertiary)', fontSize: '180px' }}
    />
    <StyledErrorText>图片加载失败</StyledErrorText>
  </StyledErrorContainer>
);

// ==================== 类型定义 ====================
interface ImageComponentProps {
  src: string;
  alt: string;
  attrs: [string, string][];
  imageIndex: number;
  onLoad: (index: number, html: string) => void;
  onError: (index: number, html: string) => void;
}

// ==================== 图片组件 ====================
const ImageComponent: React.FC<ImageComponentProps> = ({
  src,
  alt,
  attrs,
  imageIndex,
  onLoad,
  onError,
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const classname = `image-container-${imageIndex}`;
  const [previewOpen, setPreviewOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 基础样式对象
  const baseStyleObj = {
    borderStyle: 'none' as const,
    borderRadius: '10px',
    marginLeft: '5px',
    boxShadow: '0px 0px 3px 1px rgba(0,0,5,0.15)',
    cursor: 'pointer',
    maxWidth: '60%',
    boxSizing: 'content-box' as const,
    backgroundColor: 'var(--color-canvas-default)',
  };

  // 解析自定义样式
  const parseStyleString = (styleStr: string) => {
    if (!styleStr) return {};
    const styleObj: Record<string, string> = {};
    const declarations = styleStr.split(';').filter(Boolean);
    declarations.forEach(decl => {
      const [prop, value] = decl.split(':').map(s => s.trim());
      if (prop && value) {
        const camelProp = prop.replace(/-([a-z])/g, (_, letter) =>
          letter.toUpperCase(),
        );
        styleObj[camelProp] = value;
      }
    });
    return styleObj;
  };

  // 获取其他属性
  const getOtherProps = () => {
    const props: Record<string, string> = {};
    const customStyle = attrs.find(([name]) => name === 'style')?.[1] || '';

    attrs.forEach(([name, value]) => {
      if (!['src', 'alt', 'style'].includes(name)) {
        props[name] = value;
      }
    });

    return {
      ...props,
      style: {
        ...baseStyleObj,
        ...parseStyleString(customStyle),
      } as React.CSSProperties,
    };
  };

  const handleLoad = () => {
    setStatus('success');
    if (containerRef.current) {
      onLoad(imageIndex, containerRef.current.outerHTML);
    }
  };

  const handleError = () => {
    setStatus('error');
    // 使用React组件渲染错误状态的HTML
    const errorContainer = document.createElement('div');
    const errorRoot = createRoot(errorContainer);

    // 使用flushSync强制同步渲染
    flushSync(() => {
      errorRoot.render(<ImageErrorDisplay />);
    });

    onError(imageIndex, errorContainer.innerHTML);
    errorRoot.unmount();
  };

  const handleImageClick = () => {
    setPreviewOpen(true);
  };

  if (status === 'error') {
    return <ImageErrorDisplay />;
  }

  return (
    <div ref={containerRef} className={`image-container ${classname}`}>
      <img
        src={src}
        alt={alt || 'markdown-img'}
        referrerPolicy='no-referrer'
        onLoad={handleLoad}
        onError={handleError}
        onClick={handleImageClick}
        {...getOtherProps()}
      />
      {/* 图片预览弹窗 */}
      <Dialog
        sx={{
          '.MuiDialog-paper': {
            maxWidth: '95vw',
            maxHeight: '95vh',
          },
        }}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      >
        <img
          onClick={() => setPreviewOpen(false)}
          src={src}
          alt='preview'
          style={{ width: '100%', height: '100%' }}
        />
      </Dialog>
    </div>
  );
};

// ==================== 图片渲染器 ====================
export interface ImageRendererOptions {
  onImageLoad: (index: number, html: string) => void;
  onImageError: (index: number, html: string) => void;
  imageRenderCache: Map<number, string>;
}

export const createImageRenderer = (options: ImageRendererOptions) => {
  const { onImageLoad, onImageError, imageRenderCache } = options;
  return (
    src: string,
    alt: string,
    attrs: [string, string][] = [],
    imageIndex: number,
  ) => {
    // 检查缓存
    const cached = imageRenderCache.get(imageIndex);
    if (cached) {
      return cached;
    }

    const container = document.createElement('div');
    const root = createRoot(container);

    root.render(
      <ImageComponent
        src={src}
        alt={alt}
        attrs={attrs}
        imageIndex={imageIndex}
        onLoad={onImageLoad}
        onError={onImageError}
      />,
    );

    setTimeout(() => {
      const imageContainer = document.querySelector(
        `.image-container-${imageIndex}`,
      );
      if (imageContainer) {
        imageContainer.outerHTML = container.innerHTML;
      }
    });

    return (
      container.innerHTML ||
      `<div  className="image-container image-container-${imageIndex}"}></div>`
    );
  };
};
