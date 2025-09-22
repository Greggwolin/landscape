import { createTheme } from '@mui/material/styles';
import { materioColors } from './colors';
import { materioTypography } from './typography';
import { materioComponents } from './components';

export const muiMaterioTheme = createTheme({
  palette: {
    mode: 'light',
    ...materioColors,
  },
  typography: materioTypography,
  components: materioComponents,
  shape: {
    borderRadius: 6,
  },
  spacing: 4,
});

export default muiMaterioTheme;