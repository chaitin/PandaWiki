import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconJiahao = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path d='M512 0a76.8 76.8 0 0 1 76.8 76.8v358.4h358.4a76.8 76.8 0 0 1 0 153.6h-358.4v358.4a76.8 76.8 0 0 1-153.6 0v-358.4H76.8a76.8 76.8 0 0 1 0-153.6h358.4V76.8A76.8 76.8 0 0 1 512 0z'></path>
  </SvgIcon>
);

IconJiahao.displayName = 'icon-jiahao';

export default IconJiahao;
