import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconChahao = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path d='M758.848 731.456c12.16-12.224 12.16-32 0-44.16L583.616 512l175.232-175.232c12.16-12.16 12.16-32 0-44.16l-27.392-27.456a31.232 31.232 0 0 0-44.16 0L512 440.384 336.768 265.152a31.232 31.232 0 0 0-44.16 0l-27.456 27.392c-12.16 12.224-12.16 32 0 44.16L440.384 512l-175.232 175.232c-12.16 12.16-12.16 32 0 44.16l27.392 27.456c12.224 12.16 32 12.16 44.16 0L512 583.616l175.232 175.232c12.16 12.16 32 12.16 44.16 0l27.456-27.392z'></path>
  </SvgIcon>
);

IconChahao.displayName = 'icon-chahao';

export default IconChahao;
