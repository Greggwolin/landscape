// src/theme.ts
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#7367F0" },
    secondary: { main: "#28C76F" },
    background: { default: "#F8F7FA", paper: "#FFFFFF" }
  },
  typography: {
    fontFamily: ["Public Sans", "Roboto", "Helvetica", "Arial", "sans-serif"].join(",")
  }
});

export default theme;
