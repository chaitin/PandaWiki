/// <reference path="../theme.d.ts" />
import { PaletteOptions } from '@mui/material';

const lightPalette: PaletteOptions = {
  primary: {
    main: '#3248F2',
    contrastText: '#fff',
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
  dark: {
    dark: '#000',
    main: '#14141B',
    light: '#20232A',
    contrastText: '#fff',
  },
  light: {
    main: '#fff',
    contrastText: '#000',
  },
  disabled: {
    main: '#666',
  },
  background: {
    default: '#FFFFFF',
    paper: '#FFFFFF',
    paper2: '#F1F2F8',
    paper3: '#F8F9FA',
    footer: '#14141B',
  },
  text: {
    primary: '#21222D',
    secondary: 'rgba(33,34,45, 0.7)',
    tertiary: 'rgba(33,34,45, 0.5)',
    disabled: 'rgba(33,34,45, 0.3)',
  },
  divider: '#ECEEF1',
};

export default lightPalette;
