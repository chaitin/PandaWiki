/// <reference path="../packages/themes/theme.d.ts" />

declare module '@mui/material/styles' {
  interface TypeBackground {
    paper2?: string;
    paper3?: string;
    footer?: string;
  }
  interface TypeText {
    tertiary: string;
  }
  interface Palette {
    light: import('@mui/material').Palette['primary'];
    dark: import('@mui/material').Palette['primary'];
    disabled: import('@mui/material').Palette['primary'];
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    light: true;
    dark: true;
  }
}

declare module '@mui/material/Pagination' {
  interface PaginationPropsColorOverrides {
    light: true;
    dark: true;
  }
}

declare module '@cap.js/widget' {
  interface CapOptions {
    apiEndpoint: string;
  }

  class Cap {
    constructor(options: CapOptions);
    solve(): Promise<{ token: string }>;
  }

  export default Cap;
}

declare global {
  interface Window {
    _BASE_PATH_?: string;
  }
}

export {};
