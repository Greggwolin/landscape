"use client";

import React from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  ThemeProvider,
  createTheme
} from '@mui/material';
// import { Save as SaveIcon } from '@mui/icons-material';
// import MarketFactors from './MarketFactors'
// import ProjectCosts from './ProjectCosts'
// import LandUsePricing from './LandUsePricing'
// import GrowthRateDetail from './GrowthRateDetail'

// Simple theme to avoid import issues
const simpleTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#7367f0' },
    background: { default: '#f4f5fa', paper: '#ffffff' },
  },
});

// type LookupResp = { [k: string]: { code: string; label: string; sort_order?: number }[] }
type Props = { projectId?: number | null }

const MarketAssumptionsInner: React.FC<Props> = ({ projectId = null }) => {
  return (
    <Box sx={{ p: 3, minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'primary.main' }}>
        ✅ Material-UI Version Working!
      </Typography>

      <Card>
        <CardHeader title="Test Card" />
        <CardContent>
          <Typography>This is a simple test to verify MUI is working.</Typography>
          <Typography sx={{ mt: 2 }}>Project ID: {projectId || 'None'}</Typography>
          <Button variant="contained" sx={{ mt: 2 }}>
            Test Button
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MarketAssumptionsMUI Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, backgroundColor: '#fff' }}>
          <Typography color="error">
            Error loading MUI version: {this.state.error?.message}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Check console for details.
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Wrap with ThemeProvider and Error Boundary
const MarketAssumptionsMUI: React.FC<Props> = (props) => {
  try {
    return (
      <ErrorBoundary>
        <ThemeProvider theme={simpleTheme}>
          <MarketAssumptionsInner {...props} />
        </ThemeProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('MarketAssumptionsMUI render error:', error);
    return (
      <Box sx={{ p: 4, backgroundColor: '#fff' }}>
        <Typography color="error">
          Failed to render MUI version: {error instanceof Error ? error.message : 'Unknown error'}
        </Typography>
      </Box>
    );
  }
}

export default MarketAssumptionsMUI