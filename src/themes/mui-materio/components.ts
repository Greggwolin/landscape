// MUI Materio Component Customizations
import { Components, Theme } from '@mui/material/styles';

export const materioComponents: Components<Theme> = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        textTransform: 'none',
        fontWeight: 500,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 2px 4px 0 rgba(115, 103, 240, 0.4)',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0 2px 10px 0 rgba(58, 53, 65, 0.1)',
        border: '1px solid rgba(58, 53, 65, 0.12)',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: '#ffffff',
        color: '#3a3541',
        boxShadow: '0 2px 6px 0 rgba(58, 53, 65, 0.1)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRight: '1px solid rgba(58, 53, 65, 0.12)',
        backgroundColor: '#ffffff',
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: '1px solid rgba(58, 53, 65, 0.12)',
      },
    },
  },
};