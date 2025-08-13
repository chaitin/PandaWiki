'use client';
import { createTheme } from '@mui/material';
import { zhCN } from '@mui/material/locale';
import { zhCN as CuiZhCN } from 'ct-mui/dist/local';

const lightTheme = createTheme(
  {
    cssVariables: true,
    palette: {
      mode: 'light',
      primary: {
        main: '#3248F2',
      },
      error: {
        main: '#F64E54',
      },
      success: {
        main: '#00DF98',
      },
      disabled: {
        main: '#666',
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
      background: {
        default: '#fff',
        paper: '#F8F9FA',
      },
      text: {
        primary: '#21222D',
        secondary: 'rgba(33,34,45, 0.7)',
        tertiary: 'rgba(33,34,45, 0.5)',
        disabled: 'rgba(33,34,45, 0.3)',
      },
      divider: '#ECEEF1',
    },
    components: {
      MuiInputBase: {
        styleOverrides: {
          root: {
            borderRadius: '10px !important',
            fontFamily: 'var(--font-gilory)',
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--mui-palette-text-primary) !important',
              borderWidth: '1px !important',
            },
          },
        },
      },
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            fontSize: '1em',
          },
        },
      },
      MuiButtonBase: {
        styleOverrides: {
          root: {
            fontFamily: 'var(--font-gilory)',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontFamily: 'var(--font-gilory)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: ({ ownerState }: { ownerState: any }) => {
            return {
              height: '36px',
              fontSize: 14,
              lineHeight: '36px',
              paddingLeft: '16px',
              paddingRight: '16px',
              boxShadow: 'none',
              transition: 'all 0.2s ease-in-out',
              borderRadius: '10px',
              fontWeight: '400',
              ...(ownerState.variant === 'contained' && {
                color: 'var(--mui-palette-primary-contrastText)',
                backgroundColor: 'var(--mui-palette-text-primary)',
              }),
              ...(ownerState.variant === 'text' && {}),
              ...(ownerState.variant === 'outlined' && {
                color: 'var(--mui-palette-text-primary)',
                border: `1px solid var(--mui-palette-text-primary)`,
              }),
              ...(ownerState.disabled === true && {
                cursor: 'not-allowed !important',
              }),
              ...(ownerState.size === 'small' && {
                height: '32px',
                lineHeight: '32px',
              }),
              '&:hover': {
                boxShadow: 'none',
                ...(ownerState.variant === 'text' && {
                  backgroundColor: 'var(--mui-palette-background-paper2)',
                }),
              },
            };
          },
          startIcon: {
            marginLeft: 0,
            marginRight: 8,
            '>*:nth-of-type(1)': {
              fontSize: 14,
            },
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            textDecoration: 'none',
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            padding: '24px',
            borderRadius: '10px !important',
            border: '1px solid',
            backgroundColor: 'var(--mui-palette-background-paper)',
            borderColor: 'var(--mui-palette-divider)',
            boxShadow: 'none',
            '&.Mui-expanded': {
              margin: 0,
            },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            margin: 0,
            padding: 0,
            minHeight: '0 !important',
            transition: 'all 0.3s',
            '&.Mui-expanded': {
              minHeight: 0,
              paddingBottom: '8px',
            },
            '&:before': {
              display: 'none',
            },
          },
          content: {
            margin: 0,
            fontSize: 20,
            lineHeight: '28px',
            '&.Mui-expanded': {
              margin: 0,
            },
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            borderTop: '1px solid',
            borderColor: 'var(--mui-palette-divider)',
            padding: 0,
            paddingTop: '24px',
          },
        },
      },
    },
  },
  zhCN,
  CuiZhCN,
);

const darkTheme = createTheme(
  {
    cssVariables: true,
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1189,
        xl: 1300,
      },
    },
    palette: {
      mode: 'dark',
      primary: {
        main: '#6E73FE',
        contrastText: '#FFFFFF',
      },
      error: {
        main: '#F64E54',
      },
      success: {
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
        default: '#141923',
        paper: '#202531',
      },
      text: {
        primary: '#FFFFFF',
        secondary: 'rgba(255, 255, 255, 0.7)',
        tertiary: 'rgba(255, 255, 255, 0.5)',
        disabled: 'rgba(255, 255, 255, 0.3)',
      },
      divider: '#525770',
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            borderRadius: '10px !important',
            backgroundColor: 'var(--mui-palette-background-default)',
            fontFamily: 'var(--font-gilory)',
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--mui-palette-text-primary) !important',
              borderWidth: '1px !important',
            },
          },
        },
      },
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            fontSize: '1em',
          },
        },
      },
      MuiButtonBase: {
        styleOverrides: {
          root: {
            fontFamily: 'var(--font-gilory)',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontFamily: 'var(--font-gilory)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            fontFamily: 'var(--font-gilory)',
            boxShadow: 'none',
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '6px',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          outlined: {
            borderColor: 'var(--mui-palette-primary-main)',
            '&:hover': {
              borderColor: 'var(--mui-palette-primary-main)',
            },
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            textDecoration: 'none',
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            padding: '24px',
            borderRadius: '10px !important',
            border: '1px solid',
            backgroundColor: 'var(--mui-palette-background-paper)',
            borderColor: 'var(--mui-palette-divider)',
            boxShadow: 'none',
            '&.Mui-expanded': {
              margin: 0,
            },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            margin: 0,
            padding: 0,
            paddingBottom: '8px',
            minHeight: '0 !important',
            '&.Mui-expanded': {
              minHeight: 0,
            },
            '&:before': {
              display: 'none',
            },
          },
          content: {
            margin: 0,
            fontSize: 20,
            lineHeight: '28px',
            '&.Mui-expanded': {
              margin: 0,
            },
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            borderTop: '1px solid',
            borderColor: 'var(--mui-palette-divider)',
            padding: 0,
            paddingTop: '24px',
          },
        },
      },
    },
  },
  zhCN,
  CuiZhCN,
);

export { darkTheme, lightTheme };
