"use client";

import { createTheme } from "@mui/material/styles";

const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#9155FD", // Materio purple
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#8A8D93", // neutral gray
    },
    background: {
      default: "#F8F7FA", // light gray background
      paper: "#FFFFFF",   // white cards/panels
    },
    text: {
      primary: "#2F2B3D",
      secondary: "#6F6B7D",
    },
    success: {
      main: "#56CA00",
    },
    error: {
      main: "#FF4C51",
    },
    warning: {
      main: "#FFB400",
    },
    info: {
      main: "#16B1FF",
    },
  },
  typography: {
    fontFamily: [
      "Inter",
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
    ].join(","),
    h6: {
      fontWeight: 600,
    },
    body2: {
      fontSize: "0.875rem",
    },
  },
  shape: {
    borderRadius: 10, // rounded corners like Materio
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow:
            "0px 2px 4px rgba(47, 43, 61, 0.1), 0px 8px 16px rgba(47, 43, 61, 0.1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
  },
});

export default muiTheme;
