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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Alert,
  Chip,
  CircularProgress,
  Paper,
  Collapse,
  Tabs,
  Tab,
  Stack,
  styled
} from '@mui/material';
import { Save as SaveIcon, TrendingUp, Analytics, Timeline, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { processUOMOptions } from '../../lib/uom-utils';

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

// Enhanced styled components for financial tables
const CompactTable = styled(TableContainer)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  overflow: 'hidden',
  maxWidth: '350px',
  width: 'fit-content',
  '& .MuiTable-root': {
    tableLayout: 'fixed',
    width: '100%',
    '& .MuiTableCell-root': {
      padding: theme.spacing(0.3, 0.5),
      fontSize: '0.65rem',
      textAlign: 'center',
      borderRight: `1px solid ${theme.palette.divider}`,
      whiteSpace: 'nowrap',
      transition: 'background-color 0.2s ease-in-out',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      '&:last-child': {
        borderRight: 'none'
      },
      '&:hover': {
        backgroundColor: theme.palette.action.hover
      },
      '&.step-col': {
        width: '15%',
        minWidth: '50px'
      },
      '&.period-col': {
        width: '20%',
        minWidth: '70px'
      },
      '&.rate-col': {
        width: '25%',
        minWidth: '80px'
      },
      '&.periods-col': {
        width: '20%',
        minWidth: '70px'
      },
      '&.thru-col': {
        width: '20%',
        minWidth: '70px'
      }
    },
    '& .MuiTableHead-root .MuiTableCell-root': {
      backgroundColor: theme.palette.grey[100],
      fontWeight: 600,
      fontSize: '0.6rem',
      lineHeight: 1.1,
      padding: theme.spacing(0.5, 0.25),
      '&:hover': {
        backgroundColor: theme.palette.grey[200]
      }
    },
    '& .step-cell': {
      backgroundColor: theme.palette.grey[50],
      fontWeight: 500,
      '&:hover': {
        backgroundColor: theme.palette.grey[100]
      }
    },
    '& .rate-cell': {
      fontWeight: 600
    }
  }
}));

type LandUseItem = {
  lu_type_code: string
  type_name?: string
  price_per_unit: number
  unit_of_measure: string
  inflation_type: string
}

type Props = { projectId?: number | null }

const MarketAssumptionsNative: React.FC<Props> = ({ projectId = 7 }) => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [landPricingSaving, setLandPricingSaving] = useState(false)
  const [activeLandUseTypes, setActiveLandUseTypes] = useState<any[]>([])
  const [pricingData, setPricingData] = useState<LandUseItem[]>([])
  const [originalPricingData, setOriginalPricingData] = useState<LandUseItem[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Market factors state
  const [marketFactors, setMarketFactors] = useState({
    entitlementCost: 250,
    engineeringCost: 1750,
    offsiteCosts: 100,
    onsiteCosts: 200,
    subdivisionCost: 1300,
    contingency: 10.0,
    commissions: 3.0,
    otherCOS: 1.0,
    managementFees: 300000,
    generalAdmin: 50000,
    legalAccounting: 10000,
    propertyTax: 50,
    insurance: 20,
    housingDemand: 500,
    pricesRevenue: 3.0,
    directProjectCosts: 3.0
  })

  // Market factors unit state
  const [marketFactorUnits, setMarketFactorUnits] = useState({
    entitlementCost: 'FF',
    engineeringCost: 'UNIT',
    offsiteCosts: 'FF',
    onsiteCosts: 'FF',
    subdivisionCost: 'FF',
    managementFees: 'LS',
    generalAdmin: 'LS',
    legalAccounting: 'LS',
    propertyTax: 'AC',
    insurance: 'AC',
    commissions: '%',
    otherCOS: '%',
    contingency: '%',
    housingDemand: 'LS',
    pricesRevenue: 'LS',
    directProjectCosts: 'LS'
  })

  // UOM and inflation options
  const [uomOptions, setUomOptions] = useState<Array<{code: string, name: string}>>([])
  const [processedUOMOptions, setProcessedUOMOptions] = useState<any>(null)
  const [hasCustomRates, setHasCustomRates] = useState(false)

  // Growth rate state management
  const [expandedCards, setExpandedCards] = useState(new Set<string>())
  const [cardTabs, setCardTabs] = useState<Record<string, number>>({})
  const [customNames, setCustomNames] = useState<Record<string, string>>({})
  const [editingNames, setEditingNames] = useState<Record<string, string>>({})
  const [editingSteps, setEditingSteps] = useState<Record<string, any>>({})
  const [focusedFields, setFocusedFields] = useState<Record<string, boolean>>({})
  const [customSteps, setCustomSteps] = useState<Record<string, any[]>>({})
  const [visibleRows, setVisibleRows] = useState<Record<string, number>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})

  // Dynamic inflation options based on whether custom rates are established
  const inflationOptions = hasCustomRates
    ? ['Global', 'Custom 1', 'Custom 2', 'Custom 3']
    : ['Global', 'None']

  // Handle opening growth detail modal
  const onOpenGrowthDetail = (rateId: string) => {
    // TODO: Implement growth detail modal
    console.log('Opening growth detail for:', rateId)
  }

  // Number formatting function
  const formatCurrency = (value: number): string => {
    if (value === 0 || isNaN(value)) return '0'
    // If it's a whole number, format without decimals
    if (value % 1 === 0) {
      return value.toLocaleString('en-US')
    }
    // Otherwise format with 2 decimals
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const parseCurrency = (value: string): number => {
    // Remove commas and parse
    const cleaned = value.replace(/,/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  // Initialize data by loading both active types and existing pricing
  useEffect(() => {
    const initializeData = async () => {
      if (!projectId) return

      setLoading(true)
      try {
        // Load active land use types
        const typesResponse = await fetch(`/api/landuse/active-types?project_id=${projectId}`)
        if (!typesResponse.ok) throw new Error('Failed to load land use types')
        const types = await typesResponse.json()
        setActiveLandUseTypes(types)

        // Load UOM options
        const uomResponse = await fetch('/api/fin/uoms')
        if (uomResponse.ok) {
          const uoms = await uomResponse.json()
          const formattedUoms = uoms.map((uom: any) => ({ code: uom.uom_code, label: uom.name }))
          setUomOptions(uoms.map((uom: any) => ({ code: uom.uom_code, name: uom.name })))
          setProcessedUOMOptions(processUOMOptions(formattedUoms))
        }

        // Load existing pricing data
        const pricingResponse = await fetch(`/api/market-pricing?project_id=${projectId}`)
        if (!pricingResponse.ok) throw new Error('Failed to load pricing data')
        const existingPricing = await pricingResponse.json()

        // Create pricing data map for quick lookup
        const existingPricingMap = existingPricing.reduce((acc: any, item: any) => {
          acc[item.lu_type_code] = item
          return acc
        }, {})

        // Merge active types with existing pricing data
        const mergedPricingData = types.map((type: any) => {
          const existing = existingPricingMap[type.code]
          return existing ? {
            ...existing,
            type_name: type.name, // Ensure we have the type name
            price_per_unit: parseFloat(existing.price_per_unit) || 0 // Convert string to number
          } : {
            lu_type_code: type.code,
            type_name: type.name,
            price_per_unit: 0,
            unit_of_measure: 'LS', // Default to LS UOM code
            inflation_type: 'Global'
          }
        })

        setPricingData(mergedPricingData)
        setOriginalPricingData([...mergedPricingData]) // Set original data for change tracking

        // Check for custom growth rates configuration
        try {
          const growthRes = await fetch(`/api/assumptions/growth-rates?project_id=${projectId}`, { cache: 'no-store' })
          const growthData = await growthRes.json()
          // Check if any custom growth rates have been configured beyond defaults
          const hasCustomConfig = growthData?.assumptions?.some((assumption: any) =>
            assumption.category && !['DEVELOPMENT_COSTS', 'PRICE_APPRECIATION', 'SALES_ABSORPTION'].includes(assumption.category)
          )
          setHasCustomRates(hasCustomConfig || false)
        } catch (growthError) {
          console.error('Failed to load growth rates', growthError)
          setHasCustomRates(false)
        }

        setLoading(false)
      } catch (err) {
        console.error('Failed to load data:', err)
        setError('Failed to load pricing data')
        setLoading(false)
      }
    }

    initializeData()
  }, [projectId])

  // Function to check if pricing data has changed
  const checkForChanges = (newData: LandUseItem[]) => {
    const hasChanges = JSON.stringify(newData) !== JSON.stringify(originalPricingData);
    setHasUnsavedChanges(hasChanges);
  };

  // Navigation warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Update pricing data
  const updatePricingData = (typeCode: string, field: string, value: any) => {
    setPricingData(prev => {
      const newData = prev.map(item =>
        item.lu_type_code === typeCode
          ? { ...item, [field]: value }
          : item
      );
      checkForChanges(newData);
      return newData;
    });
  }

  // Update market factors
  const updateMarketFactor = (field: string, value: number) => {
    setMarketFactors(prev => ({
      ...prev,
      [field]: value
    }));
  }

  // Update market factor units
  const updateMarketFactorUnit = (field: string, value: string) => {
    setMarketFactorUnits(prev => ({
      ...prev,
      [field]: value
    }));
  }

  // Save pricing data
  const savePricingData = async () => {
    setLandPricingSaving(true)
    try {
      const response = await fetch('/api/market-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          pricing_data: pricingData
        })
      })

      if (!response.ok) throw new Error('Failed to save pricing data')

      // Update original data and reset unsaved changes
      setOriginalPricingData([...pricingData]);
      setHasUnsavedChanges(false);
      // Show success feedback briefly
      setTimeout(() => setLandPricingSaving(false), 1000)
    } catch (err) {
      console.error('Failed to save pricing data:', err)
      setError('Failed to save pricing data')
      setLandPricingSaving(false)
    }
  }

  // Handle navigate to planning
  const navigateToPlanning = () => {
    window.dispatchEvent(new CustomEvent('navigateToView', {
      detail: { view: 'planning' }
    }))
  }

  // Get chip color based on land use family
  const getChipColor = (familyName: string) => {
    switch (familyName?.toLowerCase()) {
      case 'residential':
        return { backgroundColor: '#28c76f', color: '#ffffff' } // Green
      case 'commercial':
        return { backgroundColor: '#ff9f43', color: '#ffffff' } // Orange
      case 'industrial':
        return { backgroundColor: '#ea5455', color: '#ffffff' } // Red
      case 'mixed use':
        return { backgroundColor: '#7367f0', color: '#ffffff' } // Purple
      case 'open space':
        return { backgroundColor: '#00cfe8', color: '#ffffff' } // Cyan
      default:
        return { backgroundColor: '#6c757d', color: '#ffffff' } // Gray
    }
  }

  // Growth rate helper functions
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'DEVELOPMENT_COSTS': return '#7367f0';
      case 'PRICE_APPRECIATION': return '#28c76f';
      case 'SALES_ABSORPTION': return '#ff9f43';
      default: return '#7367f0';
    }
  }

  const handleCustomToggle = (cardId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId)
    } else {
      newExpanded.add(cardId)
    }
    setExpandedCards(newExpanded)
  }

  const handleTabChange = (cardId: string, newValue: number) => {
    setCardTabs(prev => ({ ...prev, [cardId]: newValue }))
  }

  const getCustomTabLabel = (cardId: string, tabIndex: number, originalLabel: string) => {
    const key = `${cardId}-${tabIndex}`
    return customNames[key] || originalLabel
  }

  const isInEditMode = (cardId: string) => {
    const tabIndex = cardTabs[cardId] || 0
    const key = `${cardId}-${tabIndex}`
    return editMode[key] !== false
  }

  const getVisibleRowCount = (cardId: string) => {
    const tabIndex = cardTabs[cardId] || 0
    if (tabIndex === 0) return 3 // Default rows
    const key = `${cardId}-${tabIndex}`
    return visibleRows[key] || 1
  }

  const getStepValue = (cardId: string, stepIndex: number, field: 'rate' | 'periods', defaultValue: any = '') => {
    const tabIndex = cardTabs[cardId] || 0
    const key = tabIndex === 0
      ? `${cardId}-${stepIndex}-${field}`
      : `${cardId}-${tabIndex}-${stepIndex}-${field}`
    return editingSteps[key] !== undefined ? editingSteps[key] : defaultValue
  }

  const setStepValue = (cardId: string, stepIndex: number, field: 'rate' | 'periods', value: any) => {
    const tabIndex = cardTabs[cardId] || 0
    const key = tabIndex === 0
      ? `${cardId}-${stepIndex}-${field}`
      : `${cardId}-${tabIndex}-${stepIndex}-${field}`
    setEditingSteps(prev => ({ ...prev, [key]: value }))
  }

  const getCalculatedFromPeriod = (cardId: string, stepIndex: number) => {
    if (stepIndex === 0) return 1
    const prevThru = getCalculatedThruPeriod(cardId, stepIndex - 1)
    return prevThru !== '-' && !isNaN(prevThru) ? prevThru + 1 : '-'
  }

  const getCalculatedThruPeriod = (cardId: string, stepIndex: number) => {
    const fromPeriod = getCalculatedFromPeriod(cardId, stepIndex)
    const periodsValue = getStepValue(cardId, stepIndex, 'periods', '')

    if (periodsValue === 'E' || periodsValue === 'e') return 180
    const periods = parseInt(periodsValue)
    if (!isNaN(periods) && !isNaN(fromPeriod)) {
      return fromPeriod + periods - 1
    }
    return '-'
  }

  // Render interactive growth rate card
  const renderGrowthRateCard = (cardId: string, title: string, color: string, icon: any, description: string, defaultRate: string) => {
    const IconComponent = icon
    const isExpanded = expandedCards.has(cardId)

    return (
      <Paper
        key={cardId}
        variant="outlined"
        sx={{
          transition: 'all 0.3s ease-in-out',
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 2,
            borderColor: color
          },
          ...(isExpanded && {
            boxShadow: 4,
            borderColor: color + '40',
            transform: 'translateY(-1px)'
          })
        }}
      >
        <Box sx={{ p: 2 }} onClick={() => handleCustomToggle(cardId)}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{
                width: 24,
                height: 24,
                borderRadius: 1,
                backgroundColor: color + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1
              }}>
                <IconComponent sx={{ fontSize: '0.9rem', color: color }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.3 }}>
                {title}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={defaultRate}
                size="small"
                sx={{
                  backgroundColor: color + '15',
                  color: color,
                  border: `1px solid ${color}30`,
                  fontSize: '0.7rem',
                  height: 18
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCustomToggle(cardId)
                }}
                sx={{
                  backgroundColor: isExpanded ? color : '#ff9f43',
                  minWidth: 50,
                  fontSize: '0.65rem',
                  textTransform: 'none',
                  height: 18,
                  '&:hover': {
                    backgroundColor: isExpanded ? color + 'dd' : '#ff9f43dd'
                  }
                }}
              >
                Custom
              </Button>
              {isExpanded ? <KeyboardArrowUp sx={{ fontSize: '1rem' }} /> : <KeyboardArrowDown sx={{ fontSize: '1rem' }} />}
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
            {description}
          </Typography>
        </Box>

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
            {/* Tabs */}
            <Tabs
              value={cardTabs[cardId] || 0}
              onChange={(event, newValue) => handleTabChange(cardId, newValue)}
              TabIndicatorProps={{ style: { display: 'none' } }}
              sx={{
                minHeight: '32px',
                backgroundColor: 'grey.50',
                '& .MuiTab-root': {
                  minHeight: '32px',
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  fontWeight: 500,
                  py: 0.5
                }
              }}
            >
              <Tab label={getCustomTabLabel(cardId, 0, 'Custom 1')} />
              <Tab label={getCustomTabLabel(cardId, 1, 'Custom 2')} />
              <Tab label={getCustomTabLabel(cardId, 2, 'Custom 3')} />
            </Tabs>

            {/* Content for selected tab */}
            <CardContent sx={{ pt: 2 }}>
              {/* Name Input */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ minWidth: 40, fontSize: '0.75rem', fontWeight: 500 }}>
                  Name:
                </Typography>
                <TextField
                  value={(() => {
                    const tabIndex = cardTabs[cardId] || 0
                    const nameKey = `${cardId}-${tabIndex}`
                    return editingNames[nameKey] !== undefined
                      ? editingNames[nameKey]
                      : getCustomTabLabel(cardId, tabIndex, `Custom ${tabIndex + 1}`)
                  })()}
                  onChange={(e) => {
                    const tabIndex = cardTabs[cardId] || 0
                    const nameKey = `${cardId}-${tabIndex}`
                    setEditingNames(prev => ({ ...prev, [nameKey]: e.target.value }))
                  }}
                  disabled={!isInEditMode(cardId)}
                  size="small"
                  variant="outlined"
                  sx={{
                    width: 200,
                    '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5 }
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    fontSize: '0.7rem',
                    minWidth: 50,
                    height: 24,
                    textTransform: 'none'
                  }}
                >
                  Save
                </Button>
              </Stack>

              {/* Steps Table */}
              <CompactTable component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell className="step-col">Step</TableCell>
                      <TableCell className="period-col">From<br />Period</TableCell>
                      <TableCell className="rate-col">Rate</TableCell>
                      <TableCell className="periods-col">Periods</TableCell>
                      <TableCell className="thru-col">Thru<br />Period</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.from({ length: getVisibleRowCount(cardId) }, (_, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="step-cell">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.8rem', textAlign: 'center', py: '2px' }}>
                            {getCalculatedFromPeriod(cardId, idx)}
                          </Typography>
                        </TableCell>
                        <TableCell className="rate-cell">
                          <TextField
                            value={getStepValue(cardId, idx, 'rate', idx === 0 ? defaultRate : '')}
                            onChange={(e) => setStepValue(cardId, idx, 'rate', e.target.value)}
                            disabled={!isInEditMode(cardId)}
                            size="small"
                            variant="standard"
                            placeholder="3.0%"
                            sx={{
                              width: '100%',
                              '& .MuiInputBase-input': {
                                fontSize: '0.8rem',
                                textAlign: 'center',
                                padding: '2px 0',
                                color: isInEditMode(cardId) ? color : 'text.primary',
                                fontWeight: 600
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="rate-cell">
                          <TextField
                            value={getStepValue(cardId, idx, 'periods', idx === 0 ? '12' : '')}
                            onChange={(e) => setStepValue(cardId, idx, 'periods', e.target.value)}
                            disabled={!isInEditMode(cardId)}
                            size="small"
                            variant="standard"
                            placeholder="12 or E"
                            sx={{
                              width: '100%',
                              '& .MuiInputBase-input': {
                                fontSize: '0.8rem',
                                textAlign: 'center',
                                padding: '2px 0',
                                color: isInEditMode(cardId) ? color : 'text.primary',
                                fontWeight: 600
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.8rem', textAlign: 'center', py: '2px' }}>
                            {getCalculatedThruPeriod(cardId, idx)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CompactTable>

              {/* Footer */}
              <Box textAlign="center" sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ color: color, fontSize: '0.8rem' }}>
                  ↓
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                  E = End of Analysis
                </Typography>
              </Box>
            </CardContent>
          </Box>
        </Collapse>
      </Paper>
    )
  }

  return (
    <ThemeProvider theme={materioTheme}>
      <Box sx={{ p: 3, minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Typography variant="h4" sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}>
          Global Assumptions
        </Typography>

        {/* Main Layout - Sections with aligned analysis cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Current Land Pricing Section with Analysis */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            <Card>
                <CardHeader
                  title="Current Land Pricing"
                  action={
                    !loading && activeLandUseTypes.length > 0 && hasUnsavedChanges && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={landPricingSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                        onClick={savePricingData}
                        disabled={landPricingSaving}
                        sx={{ textTransform: 'none', fontWeight: 500 }}
                      >
                        {landPricingSaving ? 'Saving...' : 'Save'}
                      </Button>
                    )
                  }
                />
                <CardContent>
                {loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                )}

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {!loading && activeLandUseTypes.length === 0 && (
                  <Box>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Pricing Requires at least 1 Project Parcel
                    </Alert>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={navigateToPlanning}
                      startIcon={<Chip label="Planning" size="small" />}
                    >
                      Go to Planning
                    </Button>
                  </Box>
                )}

                {!loading && activeLandUseTypes.length > 0 && (
                  <TableContainer component={Paper} sx={{ mt: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'rgba(138, 141, 147, 0.16)' }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', width: '20%' }}>Family</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', width: '30%' }}>Description</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', width: '12%' }}>LU Code</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', textAlign: 'right', width: '20%' }}>$/Unit</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', textAlign: 'center', width: '9%' }}>Unit</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', textAlign: 'center', width: '9%' }}>Inflate</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pricingData.map((item, index) => (
                          <TableRow
                            key={item.lu_type_code || index}
                            sx={{
                              '&:hover': { backgroundColor: 'action.hover' },
                              '&:nth-of-type(odd)': { backgroundColor: 'action.hover' }
                            }}
                          >
                            <TableCell sx={{ py: 0.5 }} tabIndex={-1}>
                              <Chip
                                label={activeLandUseTypes.find(t => t.code === item.lu_type_code)?.family_name || 'Unknown'}
                                size="small"
                                sx={{
                                  ...getChipColor(activeLandUseTypes.find(t => t.code === item.lu_type_code)?.family_name || ''),
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  height: '20px',
                                  '& .MuiChip-label': { px: 1 }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }} tabIndex={-1}>
                              <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                {item.type_name || activeLandUseTypes.find(t => t.code === item.lu_type_code)?.name || ''}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }} tabIndex={-1}>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                {item.lu_type_code}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right', py: 0.5 }}>
                              <TextField
                                size="small"
                                type="text"
                                variant="outlined"
                                value={formatCurrency(item.price_per_unit || 0)}
                                onChange={(e) => updatePricingData(item.lu_type_code, 'price_per_unit', parseCurrency(e.target.value))}
                                inputProps={{
                                  style: { textAlign: 'right', fontSize: '0.85rem', padding: '4px 6px' }
                                }}
                                sx={{
                                  width: '100%',
                                  '& .MuiOutlinedInput-root': {
                                    height: '28px',
                                    '& fieldset': { borderColor: 'divider' },
                                    '&:hover fieldset': { borderColor: 'primary.main' },
                                    '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center', py: 0.5 }}>
                              <FormControl size="small" sx={{ width: '100%' }}>
                                <Select
                                  value={item.unit_of_measure || 'LS'}
                                  onChange={(e) => updatePricingData(item.lu_type_code, 'unit_of_measure', e.target.value)}
                                  sx={{
                                    height: '28px',
                                    fontSize: '0.75rem',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                                  }}
                                >
                                  {(processedUOMOptions?.regular || uomOptions).map((option: any) => (
                                    <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                      {option.code}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center', py: 0.5 }}>
                              <FormControl size="small" sx={{ width: '100%' }}>
                                <Select
                                  value={item.inflation_type || 'Global'}
                                  onChange={(e) => {
                                    if (e.target.value === 'D') {
                                      onOpenGrowthDetail(`lu_${item.lu_type_code}`)
                                    } else {
                                      updatePricingData(item.lu_type_code, 'inflation_type', e.target.value)
                                    }
                                  }}
                                  sx={{
                                    height: '28px',
                                    fontSize: '0.75rem',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                                  }}
                                >
                                  {inflationOptions.map(option => (
                                    <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                      {option}
                                    </MenuItem>
                                  ))}
                                  <MenuItem value="D" sx={{ fontSize: '0.75rem' }}>D</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                </CardContent>
            </Card>

            {/* Land Pricing Analysis Card */}
            <Paper
              variant="outlined"
              sx={{
                height: 'fit-content',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderStyle: 'dashed',
                bgcolor: 'grey.50',
                minHeight: '220px'
              }}
            >
              <Box textAlign="center">
                <TrendingUp sx={{ color: 'text.disabled', mb: 1, fontSize: 40 }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Land Pricing Analysis
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                  Charts & Visualization
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* Market Factors Section with Analysis */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '45% 55%', gap: 3 }}>
            {/* Market Factors Section */}
            <Card>
              <CardHeader title="Market Factors" />
              <CardContent>
                <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
                    {/* Market Factors Section */}
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'rgba(138, 141, 147, 0.16)' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', width: '50%' }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', textAlign: 'center', width: '20%' }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', textAlign: 'center', width: '12%' }}>Unit</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', textAlign: 'center', width: '18%' }}>Inflate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Planning & Engineering Section */}
                      <TableRow sx={{ backgroundColor: 'rgba(138, 141, 147, 0.08)' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000' }} colSpan={4}>Planning & Engineering</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Entitlement Cost</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.entitlementCost)}
                            onChange={(e) => updateMarketFactor('entitlementCost', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.entitlementCost}
                            onChange={(e) => updateMarketFactorUnit('entitlementCost', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Engineering Cost</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.engineeringCost)}
                            onChange={(e) => updateMarketFactor('engineeringCost', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.engineeringCost}
                            onChange={(e) => updateMarketFactorUnit('engineeringCost', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>

                      {/* Development Section */}
                      <TableRow sx={{ backgroundColor: 'rgba(138, 141, 147, 0.08)' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000' }} colSpan={4}>Development</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Project Costs (Offsite)</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.offsiteCosts)}
                            onChange={(e) => updateMarketFactor('offsiteCosts', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.offsiteCosts}
                            onChange={(e) => updateMarketFactorUnit('offsiteCosts', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Project Costs (Onsite)</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.onsiteCosts)}
                            onChange={(e) => updateMarketFactor('onsiteCosts', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.onsiteCosts}
                            onChange={(e) => updateMarketFactorUnit('onsiteCosts', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Subdivision Development Cost</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.subdivisionCost)}
                            onChange={(e) => updateMarketFactor('subdivisionCost', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.subdivisionCost}
                            onChange={(e) => updateMarketFactorUnit('subdivisionCost', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>

                      {/* Operations Section */}
                      <TableRow sx={{ backgroundColor: 'rgba(138, 141, 147, 0.08)' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000' }} colSpan={4}>Operations</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Management Fees</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.managementFees)}
                            onChange={(e) => updateMarketFactor('managementFees', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.managementFees}
                            onChange={(e) => updateMarketFactorUnit('managementFees', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>General & Administrative</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.generalAdmin)}
                            onChange={(e) => updateMarketFactor('generalAdmin', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.generalAdmin}
                            onChange={(e) => updateMarketFactorUnit('generalAdmin', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Legal & Accounting</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.legalAccounting)}
                            onChange={(e) => updateMarketFactor('legalAccounting', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.legalAccounting}
                            onChange={(e) => updateMarketFactorUnit('legalAccounting', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Property Tax</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.propertyTax)}
                            onChange={(e) => updateMarketFactor('propertyTax', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.propertyTax}
                            onChange={(e) => updateMarketFactorUnit('propertyTax', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Insurance</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.insurance)}
                            onChange={(e) => updateMarketFactor('insurance', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.insurance}
                            onChange={(e) => updateMarketFactorUnit('insurance', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Commissions</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.commissions)}
                            onChange={(e) => updateMarketFactor('commissions', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', py: 0.5 }}>
                          <FormControl size="small" sx={{ minWidth: 60, width: '100%' }}>
                            <Select
                              value={marketFactorUnits.commissions}
                              onChange={(e) => updateMarketFactorUnit('commissions', e.target.value)}
                              sx={{
                                fontSize: '0.75rem',
                                height: '28px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.23)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                              }}
                            >
                              {uomOptions.map(option => (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            -
                          </Typography>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Other / COS</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.otherCOS)}
                            onChange={(e) => updateMarketFactor('otherCOS', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', py: 0.5 }}>
                          <FormControl size="small" sx={{ minWidth: 60, width: '100%' }}>
                            <Select
                              value={marketFactorUnits.otherCOS}
                              onChange={(e) => updateMarketFactorUnit('otherCOS', e.target.value)}
                              sx={{
                                fontSize: '0.75rem',
                                height: '28px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.23)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                              }}
                            >
                              {uomOptions.map(option => (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            -
                          </Typography>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Contingency</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.contingency)}
                            onChange={(e) => updateMarketFactor('contingency', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', py: 0.5 }}>
                          <FormControl size="small" sx={{ minWidth: 60, width: '100%' }}>
                            <Select
                              value={marketFactorUnits.contingency}
                              onChange={(e) => updateMarketFactorUnit('contingency', e.target.value)}
                              sx={{
                                fontSize: '0.75rem',
                                height: '28px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.23)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                              }}
                            >
                              {uomOptions.map(option => (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            -
                          </Typography>
                        </TableCell>
                      </TableRow>

                      {/* Other Section */}
                      <TableRow sx={{ backgroundColor: 'rgba(138, 141, 147, 0.08)' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000' }} colSpan={4}>Other</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Housing Demand</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.housingDemand)}
                            onChange={(e) => updateMarketFactor('housingDemand', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.housingDemand}
                            onChange={(e) => updateMarketFactorUnit('housingDemand', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Prices / Revenue</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.pricesRevenue)}
                            onChange={(e) => updateMarketFactor('pricesRevenue', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.pricesRevenue}
                            onChange={(e) => updateMarketFactorUnit('pricesRevenue', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Direct Project Costs</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small"
                            type="text"
                            value={formatCurrency(marketFactors.directProjectCosts)}
                            onChange={(e) => updateMarketFactor('directProjectCosts', parseCurrency(e.target.value))}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 6px', textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select
                            size="small"
                            value={marketFactorUnits.directProjectCosts}
                            onChange={(e) => updateMarketFactorUnit('directProjectCosts', e.target.value)}
                            sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}
                          >
                            {processedUOMOptions?.all?.map((option: any, index: number) => {
                              if ('isDivider' in option) {
                                return (
                                  <MenuItem key={`divider-${index}`} disabled sx={{
                                    borderTop: '1px solid #6b7280',
                                    backgroundColor: '#f5f5f5',
                                    height: '1px',
                                    minHeight: '1px',
                                    padding: 0
                                  }}>

                                  </MenuItem>
                                );
                              }
                              return (
                                <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                  {option.code}
                                </MenuItem>
                              );
                            }) || uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            {inflationOptions.map(option => (
                              <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Market Factors Analysis Card */}
            <Paper
              variant="outlined"
              sx={{
                height: 'fit-content',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderStyle: 'dashed',
                bgcolor: 'grey.50',
                minHeight: '220px'
              }}
            >
              <Box textAlign="center">
                <Analytics sx={{ color: 'text.disabled', mb: 1, fontSize: 40 }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Market Factors Analysis
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                  Impact & Sensitivity
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* Growth Rates / Inflation Section with Analysis */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '45% 55%', gap: 3 }}>
            {/* Growth Rates / Inflation Section */}
            <Card>
              <CardHeader title="Growth Rates / Inflation" />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.875rem' }}>
                  Step-based growth assumptions driving project economics.
                </Typography>

                {/* Interactive Growth Rate Cards - Vertically Stacked */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {renderGrowthRateCard(
                    'DEVELOPMENT_COSTS',
                    'Inflation: Project Costs',
                    '#7367f0',
                    Analytics,
                    'All project costs and cost factors grow annually at this rate.',
                    '3.0%'
                  )}
                  {renderGrowthRateCard(
                    'PRICE_APPRECIATION',
                    'Growth: Revenue Factors',
                    '#28c76f',
                    TrendingUp,
                    'All project revenue factors grow annually at this rate.',
                    '3.0%'
                  )}
                  {renderGrowthRateCard(
                    'SALES_ABSORPTION',
                    'Absorption: Annual Velocity',
                    '#ff9f43',
                    Timeline,
                    'Default absorption rates for subdivision products after development completion.',
                    '2.5%'
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Growth Rates Analysis Card */}
            <Paper
              variant="outlined"
              sx={{
                height: 'fit-content',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderStyle: 'dashed',
                bgcolor: 'grey.50',
                minHeight: '180px'
              }}
            >
              <Box textAlign="center">
                <Timeline sx={{ color: 'text.disabled', mb: 1, fontSize: 40 }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Growth Rates Timeline
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                  Inflation Impact
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default MarketAssumptionsNative;