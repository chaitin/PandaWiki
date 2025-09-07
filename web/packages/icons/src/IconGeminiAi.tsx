import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const IconGeminiAi = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1024 1024'
    {...props}
  >
    <path
      d='M960 512.896A477.248 477.248 0 0 0 512.896 960h-1.792A477.184 477.184 0 0 0 64 512.896v-1.792A477.184 477.184 0 0 0 511.104 64h1.792A477.248 477.248 0 0 0 960 511.104z'
      fill='#448AFF'
    ></path>
  </SvgIcon>
);

IconGeminiAi.displayName = 'icon-gemini-ai';

export default IconGeminiAi;
