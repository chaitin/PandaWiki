import { addOpacityToColor } from '@/utils';
import { custom, ThemeColor } from './color';

declare module '@mui/material/styles' {
  interface Palette {
    neutral: Palette['primary'];
  }

  interface PaletteOptions {
    neutral: PaletteOptions['primary'];
  }
}
declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    neutral: true;
  }
}
declare module '@mui/material/ButtonGroup' {
  interface ButtonGroupPropsColorOverrides {
    neutral: true;
  }
}

const componentStyleOverrides = (theme: ThemeColor) => {
  return {
    MuiTabs: {
      styleOverrides: {
        root: {
          borderRadius: '10px !important',
          overflow: 'hidden',
          minHeight: '36px',
          height: '36px',
          padding: '0px !important',
        },
        indicator: {
          borderRadius: '0px !important',
          overflow: 'hidden',
          backgroundColor: '#21222D !important',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          borderRadius: '0px !important',
          fontWeight: 'normal',
          fontSize: '14px !important',
          lineHeight: '34px',
          padding: '0 16px !important',
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        asterisk: {
          color: theme.error.main,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              color: theme.text.inverse,
              backgroundColor: theme.text.primary,
            }),
            ...(ownerState.variant === 'text' && {}),
            ...(ownerState.variant === 'outlined' && {
              color: theme.text.primary,
              border: `1px solid ${theme.text.primary}`,
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
              ...(ownerState.variant === 'contained' && {
                backgroundColor: addOpacityToColor(theme.text.primary, 0.9),
              }),
              ...(ownerState.variant === 'text' && {
                backgroundColor: theme.background.paper2,
              }),
              ...(ownerState.variant === 'outlined' && {
                backgroundColor: theme.background.paper2,
              }),
              ...(ownerState.color === 'neutral' && {
                color: theme.text.primary,
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
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: '10px',
          maxWidth: '600px',
          padding: '8px 16px',
          backgroundColor: theme.text.primary,
          fontSize: '12px',
          lineHeight: '20px',
          color: theme.primary.contrastText,
        },
        arrow: {
          color: theme.text.primary,
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          color: theme.error.main,
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          '.MuiFormLabel-asterisk': {
            color: theme.error.main,
          },
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          marginLeft: '0 !important',
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '.MuiTableRow-root:hover': {
            '.MuiTableCell-root:not(.cx-table-empty-td)': {
              backgroundColor: theme.table.row.hoverColor,
              overflowX: 'hidden',
              '.primary-color': {
                color: theme.primary.main,
              },
              '.no-title-url': {
                color: `${theme.primary.main} !important`,
              },
              '.error-color': {
                opacity: 1,
              },
            },
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: 0,
          svg: {
            fontSize: '18px',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          background: theme.background.paper,
          lineHeight: 1.5,
          height: theme.table.cell.height,
          fontSize: '14px',
          paddingTop: '16px !important',
          paddingBottom: '16px !important',
          paddingLeft: 0,
          '&:first-of-type': {
            paddingLeft: '0px',
          },
          '&:not(:first-of-type)': {
            paddingLeft: '0px',
          },
          '.MuiCheckbox-root': {
            color: '#CCCCCC',
            svg: {
              fontSize: '16px',
            },
            '&.Mui-checked': {
              color: theme.text.primary,
            },
          },
        },
        head: {
          backgroundColor: theme.background.paper2,
          color: theme.table.head.color,
          fontSize: '12px',
          height: theme.table.head.height,
          paddingTop: '0 !important',
          paddingBottom: '0 !important',
          borderSpacing: '12px',
          zIndex: 100,
        },
        body: {
          borderBottom: '1px dashed',
          borderColor: theme.table.cell.borderColor,
          borderSpacing: '12px',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: '10px',
          boxShadow: custom.selectPopupBoxShadow,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          padding: '4px',
          borderRadius: '10px',
          backgroundColor: theme.background.paper,
          boxShadow: custom.selectPopupBoxShadow,
        },
        list: {
          paddingTop: '0px !important',
          paddingBottom: '0px !important',
        },
      },
      defaultProps: {
        elevation: 0,
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          height: '40px',
          borderRadius: '5px',
          ':hover': {
            backgroundColor: theme.background.paper2,
          },
          '&.Mui-selected': {
            fontWeight: '500',
            backgroundColor: `${custom.selectedMenuItemBgColor} !important`,
            color: theme.primary.main,
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 1,
      },
      styleOverrides: {
        root: ({ ownerState }: { ownerState: { elevation?: number } }) => {
          return {
            ...(ownerState.elevation === 0 && {
              backgroundColor: theme.background.paper0,
            }),
            ...(ownerState.elevation === 2 && {
              backgroundColor: theme.background.paper2,
            }),
            backgroundImage: 'none',
          };
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        root: ({ ownerState }: { ownerState: any }) => {
          return {
            height: '24px',
            lineHeight: '24px',
            borderRadius: '8px',
            '.MuiChip-label': {
              padding: '0 8px 0 4px',
            },
            ...(ownerState.color === 'default' && {
              backgroundColor: theme.background.chip,
              borderColor: theme.text.disabled,
              '.Mui-focusVisible': {
                backgroundColor: theme.background.chip,
              },
            }),
            ...(ownerState.color === 'error' && {
              backgroundColor: addOpacityToColor(theme.error.main, 0.1),
            }),
          };
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        label: ({ ownerState }: { ownerState: any }) => {
          return {
            padding: '0 14px',
            fontSize: '14px',
            lineHeight: '24px',
            ...(ownerState.color === 'default' && {
              color: theme.text.primary,
            }),
          };
        },
        deleteIcon: {
          fontSize: '14px',
          color: theme.text.disabled,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 1,
      },
    },
    MuiDialog: {
      styleOverrides: {
        root: {
          'h2.MuiTypography-root button': {
            marginRight: '2px',
          },
          '.MuiDialogActions-root': {
            paddingTop: '24px',
            button: {
              width: '88px',
              height: '36px !important',
            },
            '.MuiButton-text': {
              width: 'auto',
              minWidth: 'auto',
              color: `${theme.text.primary} !important`,
            },
          },
        },
        container: {
          height: '100vh',
          bgcolor: theme.text.secondary,
          backdropFilter: 'blur(5px)',
        },
        paper: {
          pb: 1,
          border: '1px solid',
          borderColor: theme.divider,
          borderRadius: '10px',
          backgroundColor: theme.background.paper,
          textarea: {
            borderRadius: '8px 8px 0 8px',
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          paddingTop: '24px',
          '> button': {
            top: '20px',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          lineHeight: '22px',
          paddingTop: '1px',
          paddingBottom: '1px',
          borderRadius: '10px',
          boxShadow: 'none',
        },
        icon: {
          padding: '10px 0',
        },
        standardInfo: {
          backgroundColor: addOpacityToColor(theme.primary.main, 0.1),
          color: theme.text.primary,
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: 0,
          paddingRight: '8px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          label: {
            color: theme.text.secondary,
          },
          'label.Mui-focused': {
            color: theme.text.primary,
          },
          '& .MuiInputBase-input::placeholder': {
            fontSize: '12px',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: '10px !important',
          backgroundColor: theme.background.paper2,
          '.MuiOutlinedInput-notchedOutline': {
            borderColor: `${theme.background.paper2} !important`,
            borderWidth: '1px !important',
          },
          '&.Mui-focused': {
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: `${theme.text.primary} !important`,
              borderWidth: '1px !important',
            },
          },
          '&:hover': {
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: `${theme.text.primary} !important`,
              borderWidth: '1px !important',
            },
          },
          input: {
            height: '19px',
            '&.Mui-disabled': {
              color: `${theme.text.secondary} !important`,
              WebkitTextFillColor: `${theme.text.secondary} !important`,
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          height: '36px',
          borderRadius: '10px !important',
          backgroundColor: theme.background.paper2,
        },
        select: {
          paddingRight: '0 !important',
        },
      },
    },
  };
};

export default componentStyleOverrides;
