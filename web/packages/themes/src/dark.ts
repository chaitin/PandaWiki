/// <reference path="../theme.d.ts" />
import { PaletteOptions } from '@mui/material';

const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#6E73FE',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#F64E54',
  },
  success: {
    main: '#82DDAF',
    light: '#AAF27F',
    dark: '#229A16',
    contrastText: 'rgba(0,0,0,0.7)',
  },
  warning: {
    main: '#FEA145',
    light: '#FFE16A',
    dark: '#B78103',
    contrastText: 'rgba(0,0,0,0.7)',
  },
  info: {
    main: '#0063FF',
    light: '#74CAFF',
    dark: '#0C53B7',
    contrastText: '#fff',
  },
  disabled: {
    main: '#666',
  },
  dark: {
    dark: '#000',
    main: '#14141B',
    light: '#202531',
    contrastText: '#fff',
  },
  light: {
    main: '#fff',
    contrastText: '#000',
  },
  background: {
    default: '#141923',
    paper: '#141923',
    paper2: '#141923',
    paper3: '#202531',
    footer: '#242425',
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    disabled: 'rgba(255, 255, 255, 0.3)',
  },
  divider: '#525770',
};

export default darkPalette;
