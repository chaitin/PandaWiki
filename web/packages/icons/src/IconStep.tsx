import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconStep = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path d='M0 0h1024v1024H0V0z' fill='#015AFF'></path>
    <path
      d='M327.68 256h460.8v143.36H471.04v368.64H158.72v-133.12h168.96V256z'
      fill='#F5F9FF'
    ></path>
    <path
      d='M552.96 552.96h332.8v25.6h-189.44v291.84h-143.36v-317.44z'
      fill='#F5F9FF'
    ></path>
    <path d='M235.52 209.92h30.72v322.56h-30.72V209.92z' fill='#EBF2FF'></path>
    <path
      d='M824.32 158.72h30.72v25.6h30.72v30.72h-30.72v56.32h-30.72V215.04h-56.32v-30.72h56.32v-25.6z'
      fill='#ECF3FF'
    ></path>
  </SvgIcon>
);

IconStep.displayName = 'icon-step';

export default IconStep;
