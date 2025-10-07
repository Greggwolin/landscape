'use client';

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

const mockBudgetData = {
  name: 'Peoria Lakes MPC',
  totalBudget: 24_500_000,
  spentToDate: 17_890_000,
  categories: [
    { name: 'Infrastructure', percent: 76, delta: 4 },
    { name: 'Amenity Buildout', percent: 64, delta: -2 },
    { name: 'Marketing', percent: 48, delta: 6 },
    { name: 'Professional Services', percent: 58, delta: 1 }
  ]
};

const numberFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

const BudgetDashboardPrototype = () => {
  const burnRate = useMemo(() => {
    return Math.round((mockBudgetData.spentToDate / mockBudgetData.totalBudget) * 100);
  }, []);

  return (
    <Box sx={{ padding: 4, bgcolor: 'grey.100', minHeight: '100vh' }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}
              >
                <div>
                  <Typography variant="h4" fontWeight={600} gutterBottom>
                    {mockBudgetData.name}
                  </Typography>
                  <Typography color="text.secondary">
                    Prototype: quick budget readout for executive stakeholders
                  </Typography>
                </div>
                <Button variant="contained" color="primary" size="large">
                  Open Full Budget Grid
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Budget
              </Typography>
              <Typography variant="h5">{numberFormatter.format(mockBudgetData.totalBudget)}</Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Spent to Date
              </Typography>
              <Typography variant="h5">{numberFormatter.format(mockBudgetData.spentToDate)}</Typography>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Burn Rate
                </Typography>
                <LinearProgress value={burnRate} variant="determinate" />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {burnRate}% of total allocation
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography gutterBottom variant="h6">
                Category Performance
              </Typography>
              <Grid container spacing={2}>
                {mockBudgetData.categories.map((category) => (
                  <Grid item key={category.name} xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography fontWeight={600}>{category.name}</Typography>
                        <LinearProgress
                          value={category.percent}
                          variant="determinate"
                          sx={{ mt: 2, mb: 1 }}
                        />
                        <Typography color="text.secondary" variant="body2">
                          {category.percent}% budget utilization
                        </Typography>
                        <Typography
                          variant="body2"
                          color={category.delta >= 0 ? 'success.main' : 'error.main'}
                          fontWeight={600}
                        >
                          {category.delta >= 0 ? '+' : ''}
                          {category.delta}% vs last sprint
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BudgetDashboardPrototype;
