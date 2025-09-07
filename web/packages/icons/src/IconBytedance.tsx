import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconBytedance = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path
      d='M209.60946252 854.37948208L24.63288889 897.875968v-772.25680592l184.97657363 43.49648592z'
      fill='#325AB4'
    ></path>
    <path
      d='M995.53659259 896.08950518L840.192 939.19762963V84.80237037l155.34459259 43.10812445z'
      fill='#78E6DC'
    ></path>
    <path
      d='M451.83051852 859.46701748L296.48592592 900.36148148V473.16385185l155.3445926 40.894464z'
      fill='#3C8CFF'
    ></path>
    <path
      d='M568.33896297 436.38601955L723.68355556 395.49155555v427.19762963l-155.34459259-40.894464z'
      fill='#00C8D2'
    ></path>
  </SvgIcon>
);

IconBytedance.displayName = 'icon-bytedance';

export default IconBytedance;
