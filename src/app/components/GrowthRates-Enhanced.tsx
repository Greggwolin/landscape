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
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Stack,
  styled
} from '@mui/material';
import {
  Business as BuildingIcon,
  TrendingUp,
  People,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  Analytics,
  Timeline
} from '@mui/icons-material';
import type {
  GrowthRateAssumption,
  GrowthRatesResponse
} from '../../types/growth-rates';

// Materio-inspired theme (keep your existing theme)
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
    }
  }
});

// Enhanced styled components for ARGUS-style tables
const CompactTable = styled(TableContainer)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  '& .MuiTable-root': {
    '& .MuiTableCell-root': {
      padding: theme.spacing(0.5, 1),
      fontSize: '0.75rem',
      textAlign: 'center',
      borderRight: `1px solid ${theme.palette.divider}`,
      '&:last-child': {
        borderRight: 'none'
      }
    },
    '& .MuiTableHead-root .MuiTableCell-root': {
      backgroundColor: theme.palette.grey[100],
      fontWeight: 600,
      fontSize: '0.7rem',
      lineHeight: 1.2
    },
    '& .step-cell': {
      backgroundColor: theme.palette.grey[50],
      fontWeight: 500
    },
    '& .rate-cell': {
      fontWeight: 600
    }
  }
}));

const CustomTab = styled(Button)<{ active: boolean, color: string }>(({ theme, active, color }) => ({
  minWidth: 'auto',
  flex: 1,
  padding: theme.spacing(0.5, 1.5),
  fontSize: '0.7rem',
  fontWeight: 500,
  textTransform: 'none',
  borderRadius: 0,
  backgroundColor: active ? theme.palette.background.paper : theme.palette.grey[50],
  color: active ? color : theme.palette.text.secondary,
  borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
  '&:hover': {
    backgroundColor: active ? theme.palette.background.paper : theme.palette.grey[100]
  }
}));

type Props = { projectId?: number | null }

const GrowthRates: React.FC<Props> = ({ projectId = null }) => {
  const [expandedCards, setExpandedCards] = useState(new Set<number>());
  const [cardTabs, setCardTabs] = useState<Record<number, number>>({});
  const [assumptions, setAssumptions] = useState<GrowthRateAssumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data with ARGUS-style step structure (replace with your API call)
  useEffect(() => {
    const mockAssumptions: GrowthRateAssumption[] = [
      {
        id: 1,
        name: "Development Costs",
        category: "DEVELOPMENT_COSTS",
        globalRate: "2.75%",
        tabs: [
          { label: "Custom 1" },
          { label: "Custom 2" },
          { label: "Custom 3" }
        ],
        steps: [
          { step: 1, period: 1, rate: "2.0%", periods: 16, thru: 16 },
          { step: 2, period: 17, rate: "3.0%", periods: 24, thru: 40 },
          { step: 3, period: 41, rate: "2.5%", periods: 20, thru: 60 },
          { step: 4, period: 61, rate: "2.0%", periods: "E", thru: 180 }
        ],
        impact: {
          dollarAmount: "$12.3M",
          percentOfProject: "24.1%",
          irrImpact: "-210"
        }
      },
      {
        id: 2,
        name: "Price Appreciation",
        category: "PRICE_APPRECIATION",
        globalRate: "3.8%",
        tabs: [
          { label: "Custom 1" },
          { label: "Custom 2" },
          { label: "Custom 3" }
        ],
        steps: [
          { step: 1, period: 1, rate: "4.5%", periods: 12, thru: 12 },
          { step: 2, period: 13, rate: "3.8%", periods: 24, thru: 36 },
          { step: 3, period: 37, rate: "3.2%", periods: "E", thru: "E" }
        ],
        impact: {
          dollarAmount: "$27.1M",
          percentOfProject: "18.7%",
          irrImpact: "+380"
        }
      },
      {
        id: 3,
        name: "Sales Absorption",
        category: "SALES_ABSORPTION",
        globalRate: "7.5/mo",
        tabs: [
          { label: "Custom 1" },
          { label: "Custom 2" },
          { label: "Custom 3" }
        ],
        steps: [
          { step: 1, period: 1, rate: "8/mo", periods: 24, thru: 24 },
          { step: 2, period: 25, rate: "12/mo", periods: 36, thru: 60 },
          { step: 3, period: 61, rate: "6/mo", periods: "E", thru: "E" }
        ],
        impact: {
          dollarAmount: "$45.2M",
          percentOfProject: "31.2%",
          irrImpact: "+430"
        }
      }
    ];

    // Simulate loading
    setTimeout(() => {
      setAssumptions(mockAssumptions);
      setLoading(false);
    }, 500);
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

  // Helper function to get color and icon for assumption category
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'DEVELOPMENT_COSTS': 
        return { color: '#7367f0', icon: BuildingIcon };
      case 'PRICE_APPRECIATION': 
        return { color: '#28c76f', icon: TrendingUp };
      case 'SALES_ABSORPTION': 
        return { color: '#ff9f43', icon: People };
      default: 
        return { color: '#7367f0', icon: BuildingIcon };
    }
  };

  // Loading and error states (keep your existing logic)
  if (loading) {
    return (
      <ThemeProvider theme={materioTheme}>
        <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', p: 4 }}>
          <Typography variant="h4" sx={{ mb: 4, color: 'primary.main', fontWeight: 600 }}>
            Growth Rates / Inflation
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

  if (error) {
    return (
      <ThemeProvider theme={materioTheme}>
        <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', p: 4 }}>
          <Typography variant="h4" sx={{ mb: 4, color: 'primary.main', fontWeight: 600 }}>
            Growth Rates / Inflation
          </Typography>
          <Card>
            <CardContent>
              <Typography variant="body1" color="error.main" sx={{ mb: 2 }}>
                Error loading assumptions: {error}
              </Typography>
              <Button variant="contained" onClick={() => window.location.reload()}>
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
          Growth Rates / Inflation
        </Typography>

        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            Core Growth & Inflation Assumptions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ARGUS-style step-based growth assumptions driving project economics.
          </Typography>
        </Card>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          {/* Left Column - Enhanced Assumption Cards */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {assumptions.map((assumption) => {
              const { color, icon: IconComponent } = getCategoryInfo(assumption.category);
              const isExpanded = expandedCards.has(assumption.id);
              
              return (
                <Card key={assumption.id} sx={{ 
                  transition: 'all 0.3s ease-in-out',
                  ...(isExpanded && {
                    boxShadow: 4,
                    borderColor: color + '40'
                  })
                }}>
                  <CardContent sx={{ py: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{ 
                        bgcolor: color + '20',
                        width: 32,
                        height: 32
                      }}>
                        <IconComponent sx={{ fontSize: '1rem', color: color }} />
                      </Avatar>
                      
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {assumption.name}
                        </Typography>
                      </Box>
                      
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip 
                          label={assumption.globalRate}
                          size="small"
                          sx={{
                            backgroundColor: color + '15',
                            color: color,
                            border: `1px solid ${color}30`,
                            fontSize: '0.75rem'
                          }}
                        />
                        <Button 
                          variant="contained"
                          size="small"
                          onClick={() => handleCustomToggle(assumption.id)}
                          sx={{ 
                            backgroundColor: isExpanded ? color : '#ff9f43',
                            minWidth: 70, 
                            fontSize: '0.75rem',
                            textTransform: 'none'
                          }}
                        >
                          Custom
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>

                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
                      {/* Custom Tabs */}
                      <Box sx={{ 
                        display: 'flex', 
                        backgroundColor: 'grey.50',
                        borderBottom: 1,
                        borderColor: 'divider'
                      }}>
                        {assumption.tabs.map((tab, index) => (
                          <CustomTab
                            key={index}
                            active={cardTabs[assumption.id] === index || (cardTabs[assumption.id] === undefined && index === 0)}
                            color={color}
                            onClick={() => handleTabChange(assumption.id, index)}
                          >
                            {tab.label}
                          </CustomTab>
                        ))}
                      </Box>

                      <CardContent sx={{ pt: 2 }}>
                        {/* Name Input */}
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ 
                            minWidth: 40, 
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}>
                            Name:
                          </Typography>
                          <TextField
                            value={assumption.name}
                            size="small"
                            variant="outlined"
                            sx={{
                              flexGrow: 1,
                              '& .MuiInputBase-input': {
                                fontSize: '0.7rem',
                                py: 0.5
                              }
                            }}
                          />
                          <Button 
                            variant="outlined" 
                            size="small"
                            sx={{ 
                              fontSize: '0.7rem', 
                              minWidth: 80,
                              textTransform: 'none'
                            }}
                          >
                            Save / Update
                          </Button>
                        </Stack>

                        {/* ARGUS-Style Steps Table */}
                        <CompactTable component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Step</TableCell>
                                <TableCell>From<br />Period</TableCell>
                                <TableCell>Rate</TableCell>
                                <TableCell>Periods</TableCell>
                                <TableCell>Thru<br />Period</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {assumption.steps.map((step, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="step-cell">
                                    {step.step || idx + 1}
                                  </TableCell>
                                  <TableCell>{step.period || '-'}</TableCell>
                                  <TableCell className="rate-cell" sx={{ color: color }}>
                                    {step.rate || '-'}
                                  </TableCell>
                                  <TableCell className="rate-cell" sx={{ color: color }}>
                                    {step.periods || '-'}
                                  </TableCell>
                                  <TableCell>{step.thru || '-'}</TableCell>
                                </TableRow>
                              ))}

                              {/* Empty rows for consistent table size */}
                              {assumption.steps.length < 5 &&
                                Array.from({ length: 5 - assumption.steps.length }, (_, idx) => (
                                  <TableRow key={`empty-${idx}`}>
                                    <TableCell className="step-cell">
                                      {assumption.steps.length + idx + 1}
                                    </TableCell>
                                    <TableCell>-</TableCell>
                                    <TableCell>-</TableCell>
                                    <TableCell>-</TableCell>
                                    <TableCell>-</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </CompactTable>

                        {/* Footer */}
                        <Box textAlign="center" sx={{ mt: 1 }}>
                          <Typography variant="caption" sx={{ color: color, fontSize: '0.75rem' }}>
                            ↓
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>
                            E = End of Analysis
                          </Typography>
                        </Box>
                      </CardContent>
                    </Box>
                  </Collapse>
                </Card>
              );
            })}
          </Box>

          {/* Right Column - Enhanced Impact Analysis */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {assumptions.map((assumption) => {
              const { color } = getCategoryInfo(assumption.category);
              const isExpanded = expandedCards.has(assumption.id);
              
              return (
                <Card key={assumption.id} sx={{
                  transition: 'all 0.3s ease-in-out',
                  ...(isExpanded && {
                    boxShadow: 4,
                    borderColor: color + '40'
                  })
                }}>
                  <CardContent sx={{ py: 2 }}>
                    {!isExpanded ? (
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="subtitle2" sx={{ 
                          fontWeight: 600,
                          flexGrow: 1,
                          fontSize: '0.875rem'
                        }}>
                          Analysis Impact
                        </Typography>
                        
                        <Stack direction="row" spacing={3}>
                          {[
                            { label: '$', value: assumption.impact.dollarAmount, color: 'text.primary' },
                            { label: '%', value: assumption.impact.percentOfProject, color: color },
                            { 
                              label: 'IRR', 
                              value: assumption.impact.irrImpact,
                              color: assumption.impact.irrImpact.startsWith('+') ? '#28c76f' : '#ea5455'
                            }
                          ].map((metric, idx) => (
                            <Box key={idx} textAlign="center" sx={{ minWidth: 45 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                {metric.label}
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                display: 'block', 
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: metric.color
                              }}>
                                {metric.value}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Stack>
                    ) : (
                      <Box>
                        <Typography variant="subtitle2" sx={{ 
                          fontWeight: 600,
                          mb: 2,
                          fontSize: '0.875rem'
                        }}>
                          Analysis Impact
                        </Typography>
                        
                        {/* Expanded Impact Metrics */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                          {[
                            { label: '$ Amount', value: assumption.impact.dollarAmount, color: 'text.primary' },
                            { label: '% of Project', value: assumption.impact.percentOfProject, color: color },
                            { 
                              label: 'IRR Impact', 
                              value: `${assumption.impact.irrImpact} bps`,
                              color: assumption.impact.irrImpact.startsWith('+') ? '#28c76f' : '#ea5455'
                            }
                          ].map((metric, idx) => (
                            <Box key={idx} sx={{ flex: 1, textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                {metric.label}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontWeight: 'bold',
                                color: metric.color
                              }}>
                                {metric.value}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>

                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
                      <Box sx={{ 
                        backgroundColor: 'grey.50', 
                        px: 2, 
                        py: 1, 
                        borderBottom: 1,
                        borderColor: 'divider'
                      }}>
                        <Typography variant="caption" sx={{ 
                          fontWeight: 500,
                          fontSize: '0.7rem'
                        }}>
                          Impact Visualization
                        </Typography>
                      </Box>
                      
                      <CardContent>
                        <Stack spacing={1.5}>
                          {[
                            { 
                              icon: Analytics, 
                              title: 'Sensitivity Chart', 
                              subtitle: 'IRR vs Rate Change',
                              height: 80 
                            },
                            { 
                              icon: Timeline, 
                              title: 'Timeline Impact', 
                              subtitle: 'Cash Flow Effect',
                              height: 60 
                            }
                          ].map((chart, idx) => (
                            <Paper 
                              key={idx}
                              variant="outlined" 
                              sx={{ 
                                height: chart.height,
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                borderStyle: 'dashed',
                                bgcolor: 'grey.50'
                              }}
                            >
                              <Box textAlign="center">
                                <chart.icon sx={{ color: 'text.disabled', mb: 0.5 }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                                  {chart.title}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                  {chart.subtitle}
                                </Typography>
                              </Box>
                            </Paper>
                          ))}
                          
                          <Box textAlign="center">
                            <Typography variant="caption" sx={{ color: color, fontSize: '0.75rem' }}>
                              ↓
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>
                              Dynamic Analysis
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Box>
                  </Collapse>
                </Card>
              );
            })}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default GrowthRates;