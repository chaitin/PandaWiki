const light = {
  primary: {
    main: '#3248F2',
    contrastText: '#fff',
    lighter: '#E6E8EC',
  },
  secondary: {
    main: '#3366FF',
    lighter: '#D6E4FF',
    light: '#84A9FF',
    dark: '#1939B7',
    darker: '#091A7A',
    contrastText: '#fff',
  },
  info: {
    main: '#0063FF',
    lighter: '#D0F2FF',
    light: '#74CAFF',
    dark: '#0C53B7',
    darker: '#04297A',
    contrastText: '#fff',
  },
  success: {
    main: '#82DDAF',
    lighter: '#E9FCD4',
    light: '#AAF27F',
    mainShadow: '#36B37E',
    dark: '#229A16',
    darker: '#08660D',
    contrastText: 'rgba(0,0,0,0.7)',
  },
  warning: {
    main: '#FEA145',
    lighter: '#FFF7CD',
    light: '#FFE16A',
    shadow: 'rgba(255, 171, 0, 0.15)',
    dark: '#B78103',
    darker: '#7A4F01',
    contrastText: 'rgba(0,0,0,0.7)',
  },
  neutral: {
    main: '#FFFFFF',
    contrastText: 'rgba(0, 0, 0, 0.60)',
  },
  error: {
    main: '#FE4545',
    lighter: '#FFE7D9',
    light: '#FFA48D',
    shadow: 'rgba(255, 86, 48, 0.15)',
    dark: '#B72136',
    darker: '#7A0C2E',
    contrastText: '#FFFFFF',
  },
  divider: '#ECEEF1',
  text: {
    primary: '#21222D',
    secondary: 'rgba(33,34,35,0.7)',
    auxiliary: 'rgba(33,34,35,0.5)',
    slave: 'rgba(33,34,35,0.3)',
    disabled: 'rgba(33,34,35,0.2)',
    inverse: '#FFFFFF',
    inverseAuxiliary: 'rgba(255,255,255,0.5)',
    inverseDisabled: 'rgba(255,255,255,0.15)',
  },
  background: {
    paper0: '#F1F2F8',
    paper: '#FFFFFF',
    paper2: '#F8F9FA',
    default: '#FFFFFF',
    chip: '#FFFFFF',
    circle: '#E6E8EC',
    hover: 'rgba(243, 244, 245, 0.5)',
  },
  shadows: 'rgba(68, 80 ,91, 0.1)',
  table: {
    head: {
      height: '50px',
      backgroundColor: '#FFFFFF',
      color: '#000',
    },
    row: {
      hoverColor: '#F8F9FA',
    },
    cell: {
      height: '72px',
      borderColor: '#ECEEF1',
    },
  },
  charts: {
    color: ['#673AB7', '#36B37E'],
  },
};

export default light;
