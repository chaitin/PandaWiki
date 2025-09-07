import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconJina = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path
      d='M279.893333 915.157333a194.56 194.56 0 1 0 0-389.162666 194.56 194.56 0 0 0 0 389.12z'
      fill='#EB6161'
    ></path>
    <path
      d='M938.666667 153.386667l-2.56 372.608c0 212.352-170.410667 385.322667-382.805334 389.12l-3.84-387.84 0.042667-372.650667c0-25.429333 20.352-45.781333 45.781333-45.781333h297.6C918.314667 108.842667 938.666667 128 938.666667 153.386667z'
      fill='#009191'
    ></path>
  </SvgIcon>
);

IconJina.displayName = 'icon-jina';

export default IconJina;
