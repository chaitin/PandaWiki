import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconImageError = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path d='M520 672L256 413.44l-109.76 93.76V246.72h261.12a41.6 41.6 0 1 0 0-82.88H104.64A41.6 41.6 0 0 0 64 205.44V800a41.6 41.6 0 0 0 41.6 41.6h267.84a40.96 40.96 0 0 0 32-67.52h21.76z'></path>
    <path d='M952 211.52a41.92 41.92 0 0 0-28.48-15.68l-310.08-32a41.6 41.6 0 0 0-8.32 82.88l267.2 27.52-55.04 411.84-113.28-160-99.2 17.92 42.56 96-123.84 123.52-32-1.6a41.6 41.6 0 1 0-4.16 82.88l352 17.92h1.92a41.28 41.28 0 0 0 41.28-35.84L960 242.88a42.56 42.56 0 0 0-8-31.36z'></path>
    <path d='M695.36 397.44m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z'></path>
  </SvgIcon>
);

IconImageError.displayName = 'icon-image-error';

export default IconImageError;
