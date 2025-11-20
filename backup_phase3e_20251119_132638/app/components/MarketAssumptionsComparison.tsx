"use client";

import React from "react";
import { Box, Typography, Grid, Paper } from '@mui/material';
import MarketAssumptions from './MarketAssumptions';
import MarketAssumptionsNative from './MarketAssumptionsNative';

type Props = { projectId?: number | null }

const MarketAssumptionsComparison: React.FC<Props> = ({ projectId = null }) => {
  return (
    <Box sx={{ p: 2, minHeight: '100vh', backgroundColor: '#f0f0f0' }}>
      <Typography variant="h5" sx={{ mb: 3, textAlign: 'center', fontWeight: 'bold' }}>
        MarketAssumptions Comparison
      </Typography>

      <Grid container spacing={2} sx={{ height: 'calc(100vh - 120px)' }}>
        {/* Original Version */}
        <Grid item xs={6}>
          <Paper elevation={3} sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, backgroundColor: '#1976d2', color: 'white' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Original (Dark Theme)
              </Typography>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <MarketAssumptions projectId={projectId} />
            </Box>
          </Paper>
        </Grid>

        {/* Material-UI Version */}
        <Grid item xs={6}>
          <Paper elevation={3} sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, backgroundColor: '#dc004e', color: 'white' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Material-UI (Light Theme)
              </Typography>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <MarketAssumptionsNative projectId={projectId} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MarketAssumptionsComparison;