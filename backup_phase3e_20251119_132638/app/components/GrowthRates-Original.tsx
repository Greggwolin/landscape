"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  ThemeProvider,
  createTheme,
  Tabs,
  Tab,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Business as BuildingIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon
} from '@mui/icons-material';
import type {
  GrowthRateAssumption,
  GrowthRatesResponse
  // UpdateGrowthRateRequest
} from '../../types/growth-rates';

// Materio-inspired theme
const materioTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#7367f0', contrastText: '#ffffff' },
    secondary: { main: '#28c76f' },
    background: { default: '#f4f5fa', paper: '#ffffff' },
    text: { primary: 'rgba(50, 71, 92, 0.87)', secondary: 'rgba(50, 71, 92, 0.6)' },
    success: { main: '#28c76f' },
    error: { main: '#ea5455' },
    warning: { main: '#ff9f43' },
    info: { main: '#00cfe8' }
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontSize: '1.5rem', fontWeight: 600 },
    h6: { fontSize: '1.125rem', fontWeight: 500 },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.75rem' },
    caption: { fontSize: '0.625rem' }
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
          borderBottom: '1px solid rgba(50, 71, 92, 0.12)',
          padding: '12px 16px'
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: '32px',
          backgroundColor: 'rgba(50, 71, 92, 0.04)'
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: '32px',
          fontSize: '0.625rem',
          textTransform: 'none',
          padding: '6px 12px'
        }
      }
    }
  }
});

type Props = { projectId?: number | null }

const GrowthRates: React.FC<Props> = ({ projectId = null }) => {
  const [expandedCards, setExpandedCards] = useState(new Set<number>());
  const [cardTabs, setCardTabs] = useState<Record<number, number>>({});
  const [assumptions, setAssumptions] = useState<GrowthRateAssumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch growth rate assumptions from API
  useEffect(() => {
    const fetchAssumptions = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = projectId
          ? `/api/assumptions/growth-rates?project_id=${projectId}`
          : '/api/assumptions/growth-rates';

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch assumptions: ${response.statusText}`);
        }

        const data: GrowthRatesResponse = await response.json();
        setAssumptions(data.assumptions || []);
      } catch (err) {
        console.error('Error fetching growth rate assumptions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assumptions');
      } finally {
        setLoading(false);
      }
    };

    fetchAssumptions();
  }, [projectId]);

  const handleCustomToggle = (assumptionId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(assumptionId)) {
      newExpanded.delete(assumptionId);
    } else {
      newExpanded.add(assumptionId);
    }
    setExpandedCards(newExpanded);
  };

  const handleTabChange = (assumptionId: number, newValue: number) => {
    setCardTabs(prev => ({
      ...prev,
      [assumptionId]: newValue
    }));
  };

  // TODO: Implement update functionality
  /*
  const updateAssumption = async (id: number, updates: Partial<GrowthRateAssumption>) => {
    try {
      const updateData: UpdateGrowthRateRequest = {
        id,
        projectId: projectId || undefined,
        ...updates
      };

      const response = await fetch('/api/assumptions/growth-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update assumption: ${response.statusText}`);
      }

      const updatedAssumption: GrowthRateAssumption = await response.json();

      // Update local state
      setAssumptions(prev =>
        prev.map(assumption =>
          assumption.id === id ? updatedAssumption : assumption
        )
      );
    } catch (err) {
      console.error('Error updating assumption:', err);
      setError(err instanceof Error ? err.message : 'Failed to update assumption');
    }
  };
  */

  // Helper function to get color for assumption category
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'DEVELOPMENT_COSTS': return '#7367f0';
      case 'PRICE_APPRECIATION': return '#28c76f';
      case 'SALES_ABSORPTION': return '#ff9f43';
      default: return '#7367f0';
    }
  };

  // Loading state
  if (loading) {
    return (
      <ThemeProvider theme={materioTheme}>
        <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', p: 4 }}>
          <Typography variant="h4" sx={{ mb: 4, color: 'primary.main', fontWeight: 600 }}>
            📊 Growth Rates / Inflation
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography variant="body1" color="text.secondary">
              Loading growth rate assumptions...
            </Typography>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  // Error state
  if (error) {
    return (
      <ThemeProvider theme={materioTheme}>
        <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', p: 4 }}>
          <Typography variant="h4" sx={{ mb: 4, color: 'primary.main', fontWeight: 600 }}>
            📊 Growth Rates / Inflation
          </Typography>
          <Card>
            <CardContent>
              <Typography variant="body1" color="error.main" sx={{ mb: 2 }}>
                Error loading assumptions: {error}
              </Typography>
              <Button
                variant="contained"
                onClick={() => window.location.reload()}
                sx={{ backgroundColor: 'primary.main' }}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={materioTheme}>
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', p: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, color: 'primary.main', fontWeight: 600 }}>
          📊 Growth Rates / Inflation
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card>
            <CardHeader title="Core growth and inflation assumptions driving project economics." />
            <CardContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                This page demonstrates the Materio theme applied to financial growth rate assumptions.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Project ID: {projectId || 'None'}
              </Typography>
            </CardContent>
          </Card>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {/* Left Column - Assumption Cards */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {assumptions.map((assumption) => {
                const color = getCategoryColor(assumption.category);
                return (
                <Card key={assumption.id}>
                  <CardHeader
                    title={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                          width: '24px',
                          height: '24px',
                          borderRadius: 1,
                          backgroundColor: color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <BuildingIcon sx={{ fontSize: '14px', color: 'white' }} />
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {assumption.name}
                        </Typography>
                      </Box>
                    }
                    action={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          sx={{
                            backgroundColor: color,
                            color: 'white',
                            minWidth: 'auto',
                            px: 2,
                            fontSize: '0.75rem',
                            textTransform: 'none'
                          }}
                        >
                          {assumption.globalRate}
                        </Button>
                        <IconButton
                          size="small"
                          onClick={() => handleCustomToggle(assumption.id)}
                          sx={{ color: color }}
                        >
                          {expandedCards.has(assumption.id) ? <ArrowUpIcon /> : <ArrowDownIcon />}
                        </IconButton>
                      </Box>
                    }
                  />

                  <Collapse in={expandedCards.has(assumption.id)} timeout="auto">
                    <CardContent sx={{ pt: 0 }}>
                      <Tabs
                        value={cardTabs[assumption.id] || 0}
                        onChange={(_, newValue) => handleTabChange(assumption.id, newValue)}
                        sx={{ mb: 2, minHeight: '32px' }}
                      >
                        {assumption.tabs.map((tab, idx) => (
                          <Tab
                            key={idx}
                            label={tab.label}
                            sx={{
                              minHeight: '32px',
                              fontSize: '0.75rem',
                              textTransform: 'none',
                              py: 0.5
                            }}
                          />
                        ))}
                      </Tabs>

                      {/* Tab Content */}
                      {(cardTabs[assumption.id] || 0) === 0 && (
                        <Box>
                          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                            Step-based growth assumptions:
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {assumption.steps.map((step, idx) => (
                              <Box key={idx} sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                p: 1,
                                backgroundColor: 'rgba(50, 71, 92, 0.04)',
                                borderRadius: 1
                              }}>
                                <Typography variant="caption">Step {step.step}</Typography>
                                <Typography variant="caption" sx={{ color: color, fontWeight: 600 }}>
                                  {step.rate}
                                </Typography>
                                <Typography variant="caption">Periods {step.periods}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {(cardTabs[assumption.id] || 0) === 1 && (
                        <Box sx={{
                          backgroundColor: 'rgba(50, 71, 92, 0.04)',
                          borderRadius: 1,
                          border: '2px dashed rgba(50, 71, 92, 0.22)',
                          height: '120px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography variant="caption" color="text.secondary">
                            Sensitivity Analysis Chart
                          </Typography>
                        </Box>
                      )}

                      {(cardTabs[assumption.id] || 0) === 2 && (
                        <Box sx={{
                          backgroundColor: 'rgba(50, 71, 92, 0.04)',
                          borderRadius: 1,
                          border: '2px dashed rgba(50, 71, 92, 0.22)',
                          height: '120px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography variant="caption" color="text.secondary">
                            Historical Data Chart
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Collapse>
                </Card>
                );
              })}
            </Box>

            {/* Right Column - Impact Analysis */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {assumptions.map((assumption) => {
                const color = getCategoryColor(assumption.category);
                return (
                <Card key={assumption.id}>
                  <CardHeader
                    title={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {assumption.name} Impact
                        </Typography>
                        <Box sx={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: color
                        }} />
                      </Box>
                    }
                  />
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">$ Amount</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {assumption.impact.dollarAmount}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">% of Project</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {assumption.impact.percentOfProject}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">IRR Impact</Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 600,
                            color: assumption.impact.irrImpact.startsWith('+') ? 'success.main' : 'error.main'
                          }}
                        >
                          {assumption.impact.irrImpact} bps
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{
                      backgroundColor: 'rgba(50, 71, 92, 0.04)',
                      borderRadius: 1,
                      border: '2px dashed rgba(50, 71, 92, 0.22)',
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2
                    }}>
                      <Typography variant="caption" color="text.secondary">
                        Impact Analysis Chart
                      </Typography>
                    </Box>

                    {/* Quick Actions */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: '0.625rem',
                          textTransform: 'none',
                          borderColor: color,
                          color: color,
                          px: 1
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: '0.625rem',
                          textTransform: 'none',
                          borderColor: color,
                          color: color,
                          px: 1
                        }}
                      >
                        Copy
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: '0.625rem',
                          textTransform: 'none',
                          borderColor: color,
                          color: color,
                          px: 1
                        }}
                      >
                        Export
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default GrowthRates;