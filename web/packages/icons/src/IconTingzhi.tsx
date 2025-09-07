import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconTingzhi = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path d='M510.96875 88.90625c-230.25 0-418.78125 187.3125-418.78125 418.78125C92.1875 737.9375 279.40625 926.375 510.875 926.375s418.6875-187.21875 418.6875-418.6875c0.09375-230.25-187.125-418.78125-418.59375-418.78125z m131.0625 538.125c0 8.25-6.75 15-15 15H396.96875c-8.25 0-15-6.75-15-15V396.96875c0-8.25 6.75-15 15-15h230.15625c8.25 0 15 6.75 15 15v230.0625z'></path>
  </SvgIcon>
);

IconTingzhi.displayName = 'icon-tingzhi';

export default IconTingzhi;
