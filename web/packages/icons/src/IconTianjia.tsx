import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconTianjia = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path d='M512 0a512 512 0 0 1 512 512 512 512 0 1 1-512-512z m0.438857 255.414857a51.2 51.2 0 0 0-51.2 51.2v153.6H307.492571a51.2 51.2 0 0 0-51.2 51.2c0 28.379429 22.820571 51.2 51.2 51.2h153.6v153.6a51.2 51.2 0 0 0 102.4 0v-153.6h153.673143a51.126857 51.126857 0 1 0 0-102.4h-153.6v-153.6c0-28.379429-22.820571-51.2-51.2-51.2z'></path>
  </SvgIcon>
);

IconTianjia.displayName = 'icon-tianjia';

export default IconTianjia;
