import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  Alert,
  Switch,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccountBalance as BankIcon,
  Groups as EquityIcon,
  TrendingUp as WaterfallIcon,
  Schedule as DrawScheduleIcon,
} from '@mui/icons-material';

type ComplexityMode = 'basic' | 'standard' | 'advanced';

interface DebtFacility {
  facility_id: number;
  facility_name: string;
  loan_amount: number;
  interest_rate_pct: number;
  amortization_years: number;
  loan_term_years: number;
  ltv_pct: number;
  dscr: number;
  is_construction_loan: boolean;
  guarantee_type?: string;
  loan_covenant_dscr_min?: number;
  loan_covenant_ltv_max?: number;
}

interface EquityTranche {
  tranche_id: number;
  tranche_name: string;
  partner_type: 'LP' | 'GP';
  ownership_pct: number;
  preferred_return_pct: number;
  capital_contributed: number;
  promote_pct?: number;
  catch_up_pct?: number;
  irr_target_pct?: number;
}

interface WaterfallTier {
  tier_id: number;
  tier_number: number;
  tier_name: string;
  irr_threshold_pct?: number;
  equity_multiple_threshold?: number;
  lp_split_pct: number;
  gp_split_pct: number;
  is_active: boolean;
}

interface DrawScheduleItem {
  draw_id: number;
  period_name: string;
  draw_amount: number;
  draw_purpose: string;
  draw_date: string;
}

const CapitalizationTab: React.FC<{ projectId: number; mode: ComplexityMode }> = ({ 
  projectId, 
  mode 
}) => {
  // Mock data - replace with API calls
  const [debtFacilities, setDebtFacilities] = useState<DebtFacility[]>([
    {
      facility_id: 1,
      facility_name: 'Construction Loan',
      loan_amount: 10500000,
      interest_rate_pct: 5.75,
      amortization_years: 30,
      loan_term_years: 10,
      ltv_pct: 70,
      dscr: 1.25,
      is_construction_loan: true,
      guarantee_type: 'Recourse',
      loan_covenant_dscr_min: 1.20,
      loan_covenant_ltv_max: 75,
    }
  ]);

  const [equityTranches, setEquityTranches] = useState<EquityTranche[]>([
    {
      tranche_id: 1,
      tranche_name: 'Limited Partner',
      partner_type: 'LP',
      ownership_pct: 90,
      preferred_return_pct: 8,
      capital_contributed: 4500000,
      irr_target_pct: 15,
    },
    {
      tranche_id: 2,
      tranche_name: 'General Partner',
      partner_type: 'GP',
      ownership_pct: 10,
      preferred_return_pct: 8,
      capital_contributed: 0,
      promote_pct: 20,
      catch_up_pct: 50,
    }
  ]);

  const [waterfallTiers, setWaterfallTiers] = useState<WaterfallTier[]>([
    {
      tier_id: 1,
      tier_number: 1,
      tier_name: 'Return of Capital',
      lp_split_pct: 90,
      gp_split_pct: 10,
      is_active: true,
    },
    {
      tier_id: 2,
      tier_number: 2,
      tier_name: 'Preferred Return (8%)',
      irr_threshold_pct: 8,
      lp_split_pct: 90,
      gp_split_pct: 10,
      is_active: true,
    },
    {
      tier_id: 3,
      tier_number: 3,
      tier_name: 'GP Catch-Up',
      irr_threshold_pct: 10,
      lp_split_pct: 50,
      gp_split_pct: 50,
      is_active: mode === 'advanced',
    },
    {
      tier_id: 4,
      tier_number: 4,
      tier_name: 'Promote (80/20 Split)',
      irr_threshold_pct: 15,
      lp_split_pct: 80,
      gp_split_pct: 20,
      is_active: mode !== 'basic',
    }
  ]);

  const [drawSchedule, setDrawSchedule] = useState<DrawScheduleItem[]>([
    { draw_id: 1, period_name: 'Month 1', draw_amount: 2000000, draw_purpose: 'Acquisition', draw_date: '2025-01-15' },
    { draw_id: 2, period_name: 'Month 3', draw_amount: 1500000, draw_purpose: 'Renovations', draw_date: '2025-03-15' },
    { draw_id: 3, period_name: 'Month 6', draw_amount: 1000000, draw_purpose: 'Lease-up', draw_date: '2025-06-15' },
  ]);

  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedDebt, setExpandedDebt] = useState<number | null>(null);
  const [expandedEquity, setExpandedEquity] = useState<number | null>(null);

  // Calculate summary metrics
  const totalDebt = debtFacilities.reduce((sum, f) => sum + f.loan_amount, 0);
  const totalEquity = equityTranches.reduce((sum, t) => sum + t.capital_contributed, 0);
  const totalCapitalization = totalDebt + totalEquity;
  const leverageRatio = totalCapitalization > 0 ? (totalDebt / totalCapitalization) * 100 : 0;

  // Field visibility based on mode
  const showBasicFields = true;
  const showStandardFields = mode === 'standard' || mode === 'advanced';
  const showAdvancedFields = mode === 'advanced';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'grey.950', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: 'grey.100', mb: 1 }}>
          Capitalization Structure
        </Typography>
        <Typography variant="body2" sx={{ color: 'grey.400' }}>
          Model debt sources, equity tranches, and distribution waterfalls
        </Typography>
      </Box>

      {/* Summary Cards Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 3 }}>
        {/* Total Capitalization Card */}
        <Card sx={{ bgcolor: 'grey.900', border: '1px solid', borderColor: 'grey.800' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'grey.400' }}>
                Total Capitalization
              </Typography>
              <BankIcon sx={{ color: 'blue.400', fontSize: 20 }} />
            </Box>
            <Typography variant="h4" sx={{ color: 'grey.100', mb: 0.5 }}>
              {formatCurrency(totalCapitalization)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.500' }}>
              {debtFacilities.length} debt source(s) + {equityTranches.length} equity tranche(s)
            </Typography>
          </CardContent>
        </Card>

        {/* Debt Summary Card */}
        <Card sx={{ bgcolor: 'grey.900', border: '1px solid', borderColor: 'grey.800' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'grey.400' }}>
                Total Debt
              </Typography>
              <BankIcon sx={{ color: 'red.400', fontSize: 20 }} />
            </Box>
            <Typography variant="h4" sx={{ color: 'grey.100', mb: 0.5 }}>
              {formatCurrency(totalDebt)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.500' }}>
              {formatPercent(leverageRatio)} of total cap
            </Typography>
          </CardContent>
        </Card>

        {/* Equity Summary Card */}
        <Card sx={{ bgcolor: 'grey.900', border: '1px solid', borderColor: 'grey.800' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'grey.400' }}>
                Total Equity
              </Typography>
              <EquityIcon sx={{ color: 'green.400', fontSize: 20 }} />
            </Box>
            <Typography variant="h4" sx={{ color: 'grey.100', mb: 0.5 }}>
              {formatCurrency(totalEquity)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.500' }}>
              {formatPercent(100 - leverageRatio)} of total cap
            </Typography>
          </CardContent>
        </Card>

        {/* Waterfall Status Card */}
        <Card sx={{ bgcolor: 'grey.900', border: '1px solid', borderColor: 'grey.800' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'grey.400' }}>
                Distribution Waterfall
              </Typography>
              <WaterfallIcon sx={{ color: 'purple.400', fontSize: 20 }} />
            </Box>
            <Typography variant="h4" sx={{ color: 'grey.100', mb: 0.5 }}>
              {waterfallTiers.filter(t => t.is_active).length} Tiers
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.500' }}>
              {waterfallTiers.find(t => t.promote_pct)?.promote_pct}% GP promote after pref
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Main Content Tabs */}
      <Card sx={{ bgcolor: 'grey.900', border: '1px solid', borderColor: 'grey.800' }}>
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'grey.800',
            '& .MuiTab-root': { color: 'grey.400' },
            '& .Mui-selected': { color: 'blue.400' },
          }}
        >
          <Tab label="Debt Sources" />
          <Tab label="Equity Structure" />
          <Tab label="Waterfall Tiers" />
          {showStandardFields && <Tab label="Draw Schedule" />}
        </Tabs>

        {/* Tab Panel: Debt Sources */}
        {selectedTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'grey.100' }}>
                Debt Facilities
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                sx={{ bgcolor: 'blue.600', '&:hover': { bgcolor: 'blue.700' } }}
              >
                Add Debt Source
              </Button>
            </Box>

            {debtFacilities.map((facility) => (
              <Card
                key={facility.facility_id}
                sx={{
                  mb: 2,
                  bgcolor: 'grey.800',
                  border: '1px solid',
                  borderColor: 'grey.700',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Typography variant="h6" sx={{ color: 'grey.100' }}>
                          {facility.facility_name}
                        </Typography>
                        {facility.is_construction_loan && (
                          <Chip
                            label="Construction"
                            size="small"
                            sx={{ bgcolor: 'orange.900', color: 'orange.300' }}
                          />
                        )}
                      </Box>

                      {/* Basic Fields - Always Visible */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'grey.500' }}>
                            Loan Amount
                          </Typography>
                          <Typography variant="body1" sx={{ color: 'grey.100', fontWeight: 600 }}>
                            {formatCurrency(facility.loan_amount)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'grey.500' }}>
                            Interest Rate
                          </Typography>
                          <Typography variant="body1" sx={{ color: 'grey.100', fontWeight: 600 }}>
                            {formatPercent(facility.interest_rate_pct)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'grey.500' }}>
                            LTV Ratio
                          </Typography>
                          <Typography variant="body1" sx={{ color: 'grey.100', fontWeight: 600 }}>
                            {formatPercent(facility.ltv_pct)}
                          </Typography>
                        </Box>
                        {showBasicFields && (
                          <Box>
                            <Typography variant="caption" sx={{ color: 'grey.500' }}>
                              DSCR
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'grey.100', fontWeight: 600 }}>
                              {facility.dscr.toFixed(2)}x
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Standard Fields */}
                      {showStandardFields && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: 'grey.500' }}>
                              Amortization
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'grey.100' }}>
                              {facility.amortization_years} years
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ color: 'grey.500' }}>
                              Loan Term
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'grey.100' }}>
                              {facility.loan_term_years} years
                            </Typography>
                          </Box>
                          {facility.guarantee_type && (
                            <Box>
                              <Typography variant="caption" sx={{ color: 'grey.500' }}>
                                Guarantee Type
                              </Typography>
                              <Typography variant="body1" sx={{ color: 'grey.100' }}>
                                {facility.guarantee_type}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Advanced Fields */}
                      {showAdvancedFields && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.900', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ color: 'grey.300', mb: 1 }}>
                            Loan Covenants
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                            <Box>
                              <Typography variant="caption" sx={{ color: 'grey.500' }}>
                                Minimum DSCR
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'grey.200' }}>
                                {facility.loan_covenant_dscr_min?.toFixed(2)}x
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: 'grey.500' }}>
                                Maximum LTV
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'grey.200' }}>
                                {facility.loan_covenant_ltv_max}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" sx={{ color: 'grey.400' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" sx={{ color: 'grey.400' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Tab Panel: Equity Structure */}
        {selectedTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'grey.100' }}>
                Equity Tranches
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                sx={{ bgcolor: 'green.600', '&:hover': { bgcolor: 'green.700' } }}
              >
                Add Equity Tranche
              </Button>
            </Box>

            {equityTranches.map((tranche) => (
              <Card
                key={tranche.tranche_id}
                sx={{
                  mb: 2,
                  bgcolor: 'grey.800',
                  border: '1px solid',
                  borderColor: 'grey.700',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Typography variant="h6" sx={{ color: 'grey.100' }}>
                          {tranche.tranche_name}
                        </Typography>
                        <Chip
                          label={tranche.partner_type}
                          size="small"
                          sx={{
                            bgcolor: tranche.partner_type === 'LP' ? 'blue.900' : 'purple.900',
                            color: tranche.partner_type === 'LP' ? 'blue.300' : 'purple.300',
                          }}
                        />
                      </Box>

                      {/* Basic Fields */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'grey.500' }}>
                            Ownership %
                          </Typography>
                          <Typography variant="body1" sx={{ color: 'grey.100', fontWeight: 600 }}>
                            {formatPercent(tranche.ownership_pct)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'grey.500' }}>
                            Preferred Return
                          </Typography>
                          <Typography variant="body1" sx={{ color: 'grey.100', fontWeight: 600 }}>
                            {formatPercent(tranche.preferred_return_pct)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'grey.500' }}>
                            Capital Contributed
                          </Typography>
                          <Typography variant="body1" sx={{ color: 'grey.100', fontWeight: 600 }}>
                            {formatCurrency(tranche.capital_contributed)}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Standard Fields */}
                      {showStandardFields && tranche.partner_type === 'GP' && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                          {tranche.promote_pct !== undefined && (
                            <Box>
                              <Typography variant="caption" sx={{ color: 'grey.500' }}>
                                Promote After Pref
                              </Typography>
                              <Typography variant="body1" sx={{ color: 'purple.300', fontWeight: 600 }}>
                                {formatPercent(tranche.promote_pct)}
                              </Typography>
                            </Box>
                          )}
                          {tranche.catch_up_pct !== undefined && (
                            <Box>
                              <Typography variant="caption" sx={{ color: 'grey.500' }}>
                                GP Catch-Up
                              </Typography>
                              <Typography variant="body1" sx={{ color: 'grey.100' }}>
                                {formatPercent(tranche.catch_up_pct)}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Advanced Fields */}
                      {showAdvancedFields && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.900', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ color: 'grey.300', mb: 1 }}>
                            Return Targets
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                            {tranche.irr_target_pct && (
                              <Box>
                                <Typography variant="caption" sx={{ color: 'grey.500' }}>
                                  Target IRR
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'grey.200' }}>
                                  {formatPercent(tranche.irr_target_pct)}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" sx={{ color: 'grey.400' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" sx={{ color: 'grey.400' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Tab Panel: Waterfall Tiers */}
        {selectedTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'grey.100' }}>
                Distribution Waterfall
              </Typography>
              {showAdvancedFields && (
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  size="small"
                  sx={{ bgcolor: 'purple.600', '&:hover': { bgcolor: 'purple.700' } }}
                >
                  Add Waterfall Tier
                </Button>
              )}
            </Box>

            <Alert severity="info" sx={{ mb: 2, bgcolor: 'blue.950', color: 'blue.200' }}>
              Distributions flow from top to bottom. Each tier must be satisfied before proceeding to the next.
            </Alert>

            <TableContainer component={Paper} sx={{ bgcolor: 'grey.800' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.900' }}>
                    <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>Tier Name</TableCell>
                    {showStandardFields && (
                      <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>IRR Threshold</TableCell>
                    )}
                    <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>LP Split</TableCell>
                    <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>GP Split</TableCell>
                    <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>Status</TableCell>
                    {showAdvancedFields && (
                      <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>Actions</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {waterfallTiers
                    .filter(tier => mode === 'advanced' || tier.is_active)
                    .map((tier) => (
                      <TableRow
                        key={tier.tier_id}
                        sx={{
                          '&:hover': { bgcolor: 'grey.750' },
                          opacity: tier.is_active ? 1 : 0.5,
                        }}
                      >
                        <TableCell sx={{ color: 'grey.100' }}>{tier.tier_number}</TableCell>
                        <TableCell sx={{ color: 'grey.100', fontWeight: 500 }}>
                          {tier.tier_name}
                        </TableCell>
                        {showStandardFields && (
                          <TableCell sx={{ color: 'grey.300' }}>
                            {tier.irr_threshold_pct
                              ? `${formatPercent(tier.irr_threshold_pct)} IRR`
                              : '—'}
                          </TableCell>
                        )}
                        <TableCell sx={{ color: 'blue.300', fontWeight: 600 }}>
                          {formatPercent(tier.lp_split_pct)}
                        </TableCell>
                        <TableCell sx={{ color: 'purple.300', fontWeight: 600 }}>
                          {formatPercent(tier.gp_split_pct)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tier.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            sx={{
                              bgcolor: tier.is_active ? 'green.900' : 'grey.800',
                              color: tier.is_active ? 'green.300' : 'grey.500',
                            }}
                          />
                        </TableCell>
                        {showAdvancedFields && (
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton size="small" sx={{ color: 'grey.400' }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" sx={{ color: 'grey.400' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            {mode !== 'advanced' && waterfallTiers.filter(t => !t.is_active).length > 0 && (
              <Alert severity="info" sx={{ mt: 2, bgcolor: 'grey.850', color: 'grey.300' }}>
                {waterfallTiers.filter(t => !t.is_active).length} additional tier(s) available in Advanced mode
              </Alert>
            )}
          </Box>
        )}

        {/* Tab Panel: Draw Schedule */}
        {selectedTab === 3 && showStandardFields && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'grey.100' }}>
                Construction Draw Schedule
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                sx={{ bgcolor: 'orange.600', '&:hover': { bgcolor: 'orange.700' } }}
              >
                Add Draw
              </Button>
            </Box>

            <Alert severity="warning" sx={{ mb: 2, bgcolor: 'orange.950', color: 'orange.200' }}>
              Interest accrues only on drawn amounts. Draw schedule directly impacts carrying costs.
            </Alert>

            <TableContainer component={Paper} sx={{ bgcolor: 'grey.800' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.900' }}>
                    <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>Period</TableCell>
                    <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>Draw Amount</TableCell>
                    <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>Purpose</TableCell>
                    <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>Draw Date</TableCell>
                    <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>Cumulative</TableCell>
                    {showAdvancedFields && (
                      <TableCell sx={{ color: 'grey.300', fontWeight: 600 }}>Actions</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drawSchedule.map((draw, index) => {
                    const cumulativeAmount = drawSchedule
                      .slice(0, index + 1)
                      .reduce((sum, d) => sum + d.draw_amount, 0);

                    return (
                      <TableRow
                        key={draw.draw_id}
                        sx={{ '&:hover': { bgcolor: 'grey.750' } }}
                      >
                        <TableCell sx={{ color: 'grey.100' }}>{draw.period_name}</TableCell>
                        <TableCell sx={{ color: 'grey.100', fontWeight: 600 }}>
                          {formatCurrency(draw.draw_amount)}
                        </TableCell>
                        <TableCell sx={{ color: 'grey.300' }}>{draw.draw_purpose}</TableCell>
                        <TableCell sx={{ color: 'grey.300' }}>
                          {new Date(draw.draw_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell sx={{ color: 'orange.300', fontWeight: 600 }}>
                          {formatCurrency(cumulativeAmount)}
                        </TableCell>
                        {showAdvancedFields && (
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton size="small" sx={{ color: 'grey.400' }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" sx={{ color: 'grey.400' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.850', borderRadius: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'grey.500' }}>
                    Total Commitment
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'grey.100' }}>
                    {formatCurrency(debtFacilities[0]?.loan_amount || 0)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'grey.500' }}>
                    Total Drawn
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'orange.300' }}>
                    {formatCurrency(drawSchedule.reduce((sum, d) => sum + d.draw_amount, 0))}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'grey.500' }}>
                    Remaining Capacity
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'green.300' }}>
                    {formatCurrency(
                      (debtFacilities[0]?.loan_amount || 0) -
                        drawSchedule.reduce((sum, d) => sum + d.draw_amount, 0)
                    )}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Card>

      {/* Mode Indicator */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Chip
          label={`${mode.toUpperCase()} MODE`}
          sx={{
            bgcolor: mode === 'basic' ? 'green.900' : mode === 'standard' ? 'blue.900' : 'purple.900',
            color: mode === 'basic' ? 'green.300' : mode === 'standard' ? 'blue.300' : 'purple.300',
            fontWeight: 600,
          }}
        />
      </Box>
    </Box>
  );
};

export default CapitalizationTab;
