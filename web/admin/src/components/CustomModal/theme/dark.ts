const dark = {
  primary: {
    main: '#fdfdfd',
    contrastText: '#000',
  },
  secondary: {
    main: '#2196F3',
    lighter: '#D6E4FF',
    light: '#84A9FF',
    dark: '#1939B7',
    darker: '#091A7A',
    contrastText: '#fff',
  },
  info: {
    main: '#1890FF',
    lighter: '#D0F2FF',
    light: '#74CAFF',
    dark: '#0C53B7',
    darker: '#04297A',
    contrastText: '#fff',
  },
  success: {
    main: '#00DF98',
    lighter: '#E9FCD4',
    light: '#AAF27F',
    dark: '#229A16',
    darker: '#08660D',
    contrastText: 'rgba(0,0,0,0.7)',
  },
  warning: {
    main: '#F7B500',
    lighter: '#FFF7CD',
    light: '#FFE16A',
    dark: '#B78103',
    darker: '#7A4F01',
    contrastText: 'rgba(0,0,0,0.7)',
  },
  neutral: {
    main: '#1A1A1A',
    contrastText: 'rgba(255, 255, 255, 0.60)',
  },
  error: {
    main: '#D93940',
    lighter: '#FFE7D9',
    light: '#FFA48D',
    dark: '#B72136',
    darker: '#7A0C2E',
    contrastText: '#fff',
  },
  text: {
    primary: '#fff',
    secondary: 'rgba(255,255,255,0.7)',
    auxiliary: 'rgba(255,255,255,0.5)',
    disabled: 'rgba(255,255,255,0.26)',
    slave: 'rgba(255,255,255,0.05)',
    inverseAuxiliary: 'rgba(0,0,0,0.5)',
    inverseDisabled: 'rgba(0,0,0,0.15)',
  },
  divider: '#ededed',
  background: {
    paper0: '#060608',
    paper: '#18181b',
    paper2: '#27272a',
    default: 'rgba(255,255,255,0.6)',
    disabled: 'rgba(15,15,15,0.8)',
    chip: 'rgba(145,147,171,0.16)',
    circle: '#3B476A',
    focus: '#542996',
    footer: '#242425',
  },
  common: {},
  shadows: 'transparent',
  table: {
    head: {
      backgroundColor: '#484848',
      color: '#fff',
    },
    row: {
      backgroundColor: 'transparent',
      hoverColor: 'rgba(48, 58, 70, 0.4)',
    },
    cell: {
      borderColor: '#484848',
    },
  },
  charts: {
    color: ['#7267EF', '#36B37E'],
  },
};

const darkTheme = {
  ...dark,
  primary: {
    ...dark.primary,
    main: '#6E73FE',
    contrastText: '#FFFFFF',
  },
  error: {
    ...dark.error,
    main: '#F64E54',
  },
  success: {
    ...dark.success,
    main: '#00DF98',
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
    ...dark.background,
    default: '#141923',
    paper: '#202531',
    footer: '#242425',
  },
  text: {
    ...dark.text,
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    disabled: 'rgba(255, 255, 255, 0.3)',
  },
  divider: '#525770',
};
export default darkTheme;
