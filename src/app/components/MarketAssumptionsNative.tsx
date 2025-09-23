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
  Paper
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

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
  const inflationOptions = ['Global', 'Custom 1', 'Custom 2', 'Custom 3']

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
          setUomOptions(uoms.map((uom: any) => ({ code: uom.uom_code, name: uom.name })))
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

  return (
    <ThemeProvider theme={materioTheme}>
      <Box sx={{ p: 3, minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Typography variant="h4" sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}>
          Global Assumptions
        </Typography>

        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Left Half - Current Land Pricing */}
          <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Current Land Pricing Card */}
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
                                {uomOptions.map(option => (
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
                                onChange={(e) => updatePricingData(item.lu_type_code, 'inflation_type', e.target.value)}
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
          </Box>

          {/* Right Half - Market Factors */}
          <Box sx={{ width: '50%' }}>
            {/* Market Factors Card */}
            <Card>
              <CardHeader title="Market Factors" />
              <CardContent>
                <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
                    {/* Market Factors Section */}
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'rgba(138, 141, 147, 0.16)' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', width: '40%' }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', textAlign: 'center', width: '20%' }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', textAlign: 'center', width: '20%' }}>Unit</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', textAlign: 'center', width: '20%' }}>Inflate</TableCell>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
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
                            {uomOptions.map(option => (
                              <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                {option.code}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Select size="small" defaultValue="Global" sx={{ fontSize: '0.75rem', height: '28px', width: '100%' }}>
                            <MenuItem value="Global">Global</MenuItem>
                            <MenuItem value="Custom 1">Custom 1</MenuItem>
                            <MenuItem value="Custom 2">Custom 2</MenuItem>
                            <MenuItem value="Custom 3">Custom 3</MenuItem>
                          </Select>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default MarketAssumptionsNative;