import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#7367f0", // Materio purple
    },
    secondary: {
      main: "#28c76f", // Materio green
    },
    background: {
      default: "#f4f5fa",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
  },
});

export default theme;
