import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconBanben = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path d='M712.448 151.808a64 64 0 0 1 53.76 29.376l172.736 268.352A64 64 0 0 1 928.64 531.2l-375.936 348.352a64 64 0 0 1-87.04 0L89.152 531.072a64 64 0 0 1-10.432-81.472l171.52-268.224a64 64 0 0 1 53.952-29.504h408.32z m-24.512 317.44a38.4 38.4 0 0 0-53.952 6.4c-45.44 57.408-87.296 84.032-125.12 84.032-37.696 0-79.104-26.56-123.712-83.84a38.4 38.4 0 1 0-60.608 47.168c57.792 74.24 119.04 113.472 184.32 113.472 65.216 0 126.784-39.168 185.344-113.28a38.4 38.4 0 0 0-6.272-53.888z'></path>
  </SvgIcon>
);

IconBanben.displayName = 'icon-banben';

export default IconBanben;
