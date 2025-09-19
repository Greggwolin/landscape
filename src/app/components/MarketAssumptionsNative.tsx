"use client";

import React, { useState } from "react";
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
import { Save as SaveIcon } from '@mui/icons-material';

// Materio-inspired theme
const materioTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#7367f0', contrastText: '#ffffff' },
    secondary: { main: '#28c76f' },
    background: { default: '#f4f5fa', paper: '#ffffff' },
    text: { primary: 'rgba(50, 71, 92, 0.87)', secondary: 'rgba(50, 71, 92, 0.6)' }
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h6: { fontSize: '1.125rem', fontWeight: 500 },
    body2: { fontSize: '0.875rem' }
  },
  shape: { borderRadius: 6 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 10px 0px rgba(50, 71, 92, 0.1)',
          border: '1px solid rgba(50, 71, 92, 0.12)'
        }
      }
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(115, 103, 240, 0.04)',
          borderBottom: '1px solid rgba(50, 71, 92, 0.12)'
        }
      }
    }
  }
});

type Props = { projectId?: number | null }

const MarketAssumptionsNative: React.FC<Props> = ({ projectId: _projectId = null }) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const onSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }, 1000);
  };

  return (
    <ThemeProvider theme={materioTheme}>
      <Box sx={{ p: 4, minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Typography variant="h4" sx={{ mb: 4, color: 'primary.main', fontWeight: 600 }}>
          ✨ Materio Native Version
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Market Factors Card */}
          <Card>
            <CardHeader
              title="Market Factors"
              action={
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={onSave}
                  disabled={saveStatus === 'saving'}
                  sx={{ textTransform: 'none', fontWeight: 500 }}
                >
                  {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                </Button>
              }
            />
            <CardContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                This demonstrates the Materio theme with proper:
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                <Typography component="li" variant="body2">Purple primary color (#7367f0)</Typography>
                <Typography component="li" variant="body2">Light background (#f4f5fa)</Typography>
                <Typography component="li" variant="body2">Proper shadows and borders</Typography>
                <Typography component="li" variant="body2">Clean typography</Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ p: 1, backgroundColor: 'grey.100', borderRadius: 1 }}>
                  Housing Demand: 500 Units/Year
                </Typography>
                <Typography variant="body2" sx={{ p: 1, backgroundColor: 'grey.100', borderRadius: 1 }}>
                  Contingency: 10%
                </Typography>
                <Typography variant="body2" sx={{ p: 1, backgroundColor: 'grey.100', borderRadius: 1 }}>
                  Commissions: 3%
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Land Use Pricing Card */}
          <Card>
            <CardHeader title="Land Use Pricing" />
            <CardContent>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Sample data showing clean table styling:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 2, p: 1, backgroundColor: 'primary.main', color: 'white', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ width: '60px', fontWeight: 500 }}>Code</Typography>
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>Description</Typography>
                  <Typography variant="body2" sx={{ width: '80px', fontWeight: 500 }}>Price</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ width: '60px', color: 'primary.main', fontWeight: 500 }}>C</Typography>
                  <Typography variant="body2" sx={{ flex: 1 }}>Commercial</Typography>
                  <Typography variant="body2" sx={{ width: '80px' }}>$10/SF</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ width: '60px', color: 'primary.main', fontWeight: 500 }}>HDR</Typography>
                  <Typography variant="body2" sx={{ flex: 1 }}>High Density Residential</Typography>
                  <Typography variant="body2" sx={{ width: '80px' }}>$25,000/Unit</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ width: '60px', color: 'primary.main', fontWeight: 500 }}>MDR</Typography>
                  <Typography variant="body2" sx={{ flex: 1 }}>Medium Density Residential</Typography>
                  <Typography variant="body2" sx={{ width: '80px' }}>$2,400/FF</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default MarketAssumptionsNative;