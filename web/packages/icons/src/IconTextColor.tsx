import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconTextColor = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path d='M842.24 957.44H159.36c-22.4 0-40.96-18.56-40.96-40.96s18.56-40.96 40.96-40.96h682.88c22.4 0 40.96 18.56 40.96 40.96s-18.56 40.96-40.96 40.96zM218.24 765.44a42.24 42.24 0 0 1-17.28-3.84c-20.48-9.6-29.44-33.92-20.48-54.4l94.08-204.8v-1.92l188.8-409.6c13.44-29.44 61.44-29.44 74.24 0l188.16 410.24s0 1.28 0.64 1.92l94.08 204.8c9.6 20.48 0 44.8-20.48 54.4-20.48 8.96-44.8 0-54.4-20.48l-83.2-181.76H338.56l-83.2 181.76a40.32 40.32 0 0 1-37.12 23.68z m158.08-287.36h248.96L500.48 206.08 375.68 478.08z'></path>
  </SvgIcon>
);

IconTextColor.displayName = 'icon-text-color';

export default IconTextColor;
