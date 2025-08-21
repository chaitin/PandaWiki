import type { PaletteColorChannel } from '@mui/material';

declare module '@mui/material/styles' {
  interface TypeText {
    tertiary: string;
  }

  interface Palette {
    light: Palette['primary'] & PaletteColorChannel;
    dark: Palette['primary'] & PaletteColorChannel;
    disabled: Palette['primary'] & PaletteColorChannel;
  }

  // allow configuration using `createTheme`
  interface PaletteOptions {
    light?: PaletteOptions['primary'] & Partial<PaletteColorChannel>;
    dark?: PaletteOptions['primary'] & Partial<PaletteColorChannel>;
    disabled?: PaletteOptions['primary'] & Partial<PaletteColorChannel>;
    text?: Partial<TypeText>;
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

import type {} from '@mui/material/themeCssVarsAugmentation';

declare module '@mui/material/styles' {
  interface TypeBackground {
    paper2?: string;
    paper3?: string;
    footer?: string;
  }
}
