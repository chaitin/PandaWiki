import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconZhiding = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path d='M85.504 0a83.626667 83.626667 0 1 0 0 167.082667H938.666667a83.626667 83.626667 0 1 0 0-167.082667H85.674667z m485.546667 308.906667a83.626667 83.626667 0 0 0-118.101334 0L26.453333 735.061333A83.626667 83.626667 0 1 0 144.554667 853.333333L512 485.888 879.445333 853.333333a83.626667 83.626667 0 0 0 118.101334-118.101333L571.050667 308.906667z'></path>
  </SvgIcon>
);

IconZhiding.displayName = 'icon-zhiding';

export default IconZhiding;
