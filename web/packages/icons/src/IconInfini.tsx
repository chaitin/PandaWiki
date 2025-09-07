import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconInfini = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path d='M0 0h1024v1024H0V0z' fill='#FEFEFE'></path>
    <path
      d='M307.2 281.6h276.48v476.16h128v122.88H307.2v-128h128V409.6H307.2V281.6z'
      fill='#801385'
    ></path>
    <path d='M583.68 153.6h128v128h-128V153.6z' fill='#33A9E0'></path>
  </SvgIcon>
);

IconInfini.displayName = 'icon-infini';

export default IconInfini;
