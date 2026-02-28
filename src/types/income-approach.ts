/**
 * TypeScript types for Income Approach Valuation UI
 *
 * Session: QK-11
 */

// ============================================================================
// NOI BASIS TYPES
// ============================================================================

// F-12 Current = Current rents (in-place), F-12 Market = Market rents, Stabilized = Market at stabilized vacancy
export type NOIBasis = 'f12_current' | 'f12_market' | 'stabilized';

// Legacy basis type for backwards compatibility during migration
export type LegacyNOIBasis = 'trailing_12' | 'forward_12' | 'avg_straddle' | 'stabilized';

export type CapRateMethod = 'comp_sales' | 'band_investment' | 'investor_survey' | 'other';

// ============================================================================
// VALUE TILE
// ============================================================================

export interface NOICalculation {
  gpr: number;
  vacancy_loss: number;
  vacancy_rate: number;
  credit_loss: number;
  credit_loss_rate: number;
  other_income: number;
  egi: number;
  base_opex: number;
  management_fee: number;
  management_fee_pct: number;
  replacement_reserves: number;
  total_opex: number;
  noi: number;
  expense_ratio: number;
}

export interface ValueTile {
  id: NOIBasis;
  label: string;
  value: number | null;
  noi: number;
  cap_rate: number;
  price_per_unit: number | null;
  price_per_sf: number | null;
  calculation: NOICalculation;
  uses_stabilized_vacancy?: boolean;
}

// ============================================================================
// RENT ROLL & OPEX
// ============================================================================

export interface RentRollItem {
  line_item_key: string;
  label: string;
  unit_count: number;
  avg_sf: number;
  monthly_rent: number;
  annual_total: number;
}

export interface RentRollData {
  t12_gpr: number;
  forward_gpr: number;
  items: RentRollItem[];
}

export interface OpExItem {
  category: string;
  expense_type: string;
  annual_amount: number;
  per_unit: number;
  per_sf: number;
}

export interface OperatingExpensesData {
  total: number;
  items: OpExItem[];
}

// ============================================================================
// ASSUMPTIONS
// ============================================================================

export interface IncomeApproachAssumptions {
  // Income - These are READ-ONLY (pulled from Operations Tab)
  vacancy_rate: number;           // From Operations - physical vacancy
  credit_loss_rate: number;       // From Operations
  concessions_rate?: number;      // From Operations

  // Income - These are EDITABLE (Income Approach specific)
  stabilized_vacancy_rate: number; // Editable - for Stabilized scenario only
  other_income: number;           // Editable - other income assumption
  income_growth_rate: number;     // Editable - for DCF projection

  // Expenses - READ-ONLY (pulled from Operations Tab)
  management_fee_pct: number;     // From Operations
  total_opex?: number;            // From Operations - total annual OpEx

  // Expenses - EDITABLE (Income Approach specific)
  replacement_reserves_per_unit: number; // Editable
  expense_growth_rate: number;    // Editable - for DCF projection

  // Capitalization (all editable)
  selected_cap_rate: number;
  cap_rate_interval: number;
  market_cap_rate_method: CapRateMethod;
  cap_rate_justification: string;

  // Band of Investment (editable, shown when method = band_investment)
  band_mortgage_ltv: number | null;
  band_mortgage_rate: number | null;
  band_amortization_years: number | null;
  band_equity_dividend_rate: number | null;

  // DCF Parameters (all editable)
  hold_period_years: number;
  terminal_cap_rate: number;
  discount_rate: number;
  discount_rate_interval: number;
  selling_costs_pct: number;

  // Selection
  noi_capitalization_basis: NOIBasis;
}

/**
 * Indicates which fields are read-only vs editable in Income Approach
 */
export interface IncomeApproachFieldMetadata {
  isReadOnly: boolean;
  source: 'operations' | 'income_approach' | 'rent_roll';
  label: string;
}

// ============================================================================
// SENSITIVITY MATRIX
// ============================================================================

export interface SensitivityPoint {
  cap_rate: number;
  value: number | null;
  price_per_unit: number | null;
  is_selected: boolean;
}

// ============================================================================
// KEY METRICS
// ============================================================================

export interface KeyMetrics {
  price_per_unit: number | null;
  price_per_sf: number | null;
  grm: number | null;
  expense_ratio: number;
  opex_per_unit: number | null;
  opex_per_sf: number | null;
  break_even_occupancy: number | null;
}

// ============================================================================
// PROPERTY SUMMARY
// ============================================================================

export interface PropertySummary {
  unit_count: number;
  total_sf: number;
  avg_unit_sf: number;
}

// ============================================================================
// FULL API RESPONSE
// ============================================================================

export interface IncomeApproachData {
  project_id: number;
  project_name: string;
  project_type_code: string;

  property_summary: PropertySummary;
  rent_roll: RentRollData;
  operating_expenses: OperatingExpensesData;
  assumptions: IncomeApproachAssumptions;

  value_tiles: ValueTile[];

  selected_basis: NOIBasis;
  selected_calculation: NOICalculation;
  selected_value: number | null;

  sensitivity_matrix: SensitivityPoint[];
  key_metrics: KeyMetrics;

  income_approach_id: number;
}

// ============================================================================
// UPDATE PAYLOAD
// ============================================================================

export type IncomeApproachUpdatePayload = Partial<IncomeApproachAssumptions>;

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface ValueTilesProps {
  tiles: ValueTile[];
  selectedBasis: NOIBasis;
  onSelectBasis: (basis: NOIBasis) => void;
  unitCount: number;
}

export interface AssumptionsPanelProps {
  assumptions: IncomeApproachAssumptions;
  rentRoll: RentRollData;
  operatingExpenses: OperatingExpensesData;
  onAssumptionChange: (field: keyof IncomeApproachAssumptions, value: number | string) => void;
  isLoading?: boolean;
  isSaving?: boolean;
}

export interface DirectCapViewProps {
  calculation: NOICalculation;
  value: number | null;
  capRate: number;
  propertySummary: PropertySummary;
  rentRollItems: RentRollItem[];
  opexItems: OpExItem[];
  sensitivityMatrix: SensitivityPoint[];
  keyMetrics: KeyMetrics;
  selectedBasis: NOIBasis;
  /** All value tiles for 3-column P&L display */
  allTiles?: ValueTile[];
}

export interface SensitivityMatrixProps {
  data: SensitivityPoint[];
  selectedCapRate: number;
  unitCount: number;
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatCurrencyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function formatPercent(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatPerUnit(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}/unit`;
}

export function formatPerSF(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `$${value.toFixed(2)}/SF`;
}

export function formatMultiple(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(2)}x`;
}

// ============================================================================
// NOI BASIS LABELS
// ============================================================================

export const NOI_BASIS_LABELS: Record<NOIBasis, string> = {
  f12_current: 'F-12 Current',
  f12_market: 'F-12 Market',
  stabilized: 'Stabilized',
};

export const NOI_BASIS_DESCRIPTIONS: Record<NOIBasis, string> = {
  f12_current: 'Forward 12 months using current in-place rents',
  f12_market: 'Forward 12 months using market rents',
  stabilized: 'Market rent at stabilized occupancy',
};

// Legacy labels for migration compatibility
export const LEGACY_NOI_BASIS_LABELS: Record<LegacyNOIBasis, string> = {
  trailing_12: 'T-12',
  forward_12: 'Forward 12',
  avg_straddle: 'Average',
  stabilized: 'Stabilized',
};

// ============================================================================
// TILE COLORS
// ============================================================================

type TileColor = { bg: string; border: string; text: string };

const TILE_COLORS_DARK: Record<NOIBasis, TileColor> = {
  f12_current: {
    bg: 'rgba(71, 85, 105, 0.2)',
    border: '#475569',
    text: '#94a3b8',
  },
  f12_market: {
    bg: 'rgba(13, 148, 136, 0.2)',
    border: '#0D9488',
    text: '#5eead4',
  },
  stabilized: {
    bg: 'rgba(5, 150, 105, 0.2)',
    border: '#059669',
    text: '#6ee7b7',
  },
};

const TILE_COLORS_LIGHT: Record<NOIBasis, TileColor> = {
  f12_current: {
    bg: 'rgba(71, 85, 105, 0.08)',
    border: '#475569',
    text: '#334155',
  },
  f12_market: {
    bg: 'rgba(13, 148, 136, 0.08)',
    border: '#0D9488',
    text: '#0F766E',
  },
  stabilized: {
    bg: 'rgba(5, 150, 105, 0.08)',
    border: '#059669',
    text: '#047857',
  },
};

/** @deprecated Use getTileColors(theme) instead for theme-aware colors */
export const TILE_COLORS: Record<NOIBasis, TileColor> = TILE_COLORS_DARK;

export function getTileColors(theme: 'light' | 'dark'): Record<NOIBasis, TileColor> {
  return theme === 'light' ? TILE_COLORS_LIGHT : TILE_COLORS_DARK;
}

// DCF tile color (separate since it's a different valuation method)
const DCF_TILE_COLOR_DARK: TileColor = {
  bg: 'rgba(124, 58, 237, 0.2)',
  border: '#7C3AED',
  text: '#c4b5fd',
};

const DCF_TILE_COLOR_LIGHT: TileColor = {
  bg: 'rgba(124, 58, 237, 0.08)',
  border: '#7C3AED',
  text: '#6D28D9',
};

/** @deprecated Use getDCFTileColor(theme) instead for theme-aware colors */
export const DCF_TILE_COLOR = DCF_TILE_COLOR_DARK;

export function getDCFTileColor(theme: 'light' | 'dark'): TileColor {
  return theme === 'light' ? DCF_TILE_COLOR_LIGHT : DCF_TILE_COLOR_DARK;
}

// ============================================================================
// DCF TYPES
// ============================================================================

/**
 * DCF Cash Flow Period - one year of projected cash flows
 */
export interface DCFCashFlowPeriod {
  year: number;
  gpr: number;
  vacancy_loss: number;
  credit_loss: number;
  other_income: number;
  egi: number;
  base_opex: number;
  management_fee: number;
  replacement_reserves: number;
  total_opex: number;
  noi: number;
  pv_factor: number;
  pv_noi: number;
}

/**
 * DCF Exit Analysis - terminal value calculation
 */
export interface DCFExitAnalysis {
  terminal_noi: number;
  exit_value: number;
  selling_costs: number;
  net_reversion: number;
  pv_reversion: number;
}

/**
 * DCF Metrics - key return metrics
 */
export interface DCFMetrics {
  present_value: number;
  irr: number | null;
  npv: number | null;
  equity_multiple: number | null;
  price_per_unit: number | null;
  price_per_sf: number | null;
}

/**
 * DCF Property Summary - base data used for projections
 */
export interface DCFPropertySummary {
  unit_count: number;
  total_sf: number;
  current_annual_rent: number;
  base_opex: number;
}

/**
 * DCF Assumptions - input parameters for DCF calculation
 */
export interface DCFAssumptions {
  hold_period_years: number;
  discount_rate: number;
  terminal_cap_rate: number;
  selling_costs_pct: number;
  income_growth_rate: number;
  expense_growth_rate: number;
  vacancy_rate: number;
  credit_loss_rate: number;
  management_fee_pct: number;
  replacement_reserves_per_unit: number;
}

/**
 * DCF Sensitivity Row - one row of the 2D sensitivity matrix
 */
export interface DCFSensitivityRow {
  discount_rate: number;
  exit_cap_rates: number[];
  values: number[];
  is_base_discount: boolean;
}

/**
 * Full DCF Analysis Response from API
 */
export interface DCFAnalysisData {
  project_id: number;
  assumptions: DCFAssumptions;
  property_summary: DCFPropertySummary;
  projections: DCFCashFlowPeriod[];
  exit_analysis: DCFExitAnalysis;
  metrics: DCFMetrics;
  sensitivity_matrix: DCFSensitivityRow[];
}

/**
 * DCF Value Tile - for display in ValueTiles component
 */
export interface DCFValueTile {
  id: 'dcf';
  label: string;
  present_value: number;
  irr: number | null;
  equity_multiple: number | null;
  price_per_unit: number | null;
  hold_period_years: number;
}

// ============================================================================
// DCF COMPONENT PROPS
// ============================================================================

export interface DCFViewProps {
  data: DCFAnalysisData;
  propertySummary: PropertySummary;
  isLoading?: boolean;
}

export interface DCFSensitivityMatrixProps {
  data: DCFSensitivityRow[];
  selectedDiscountRate: number;
  selectedExitCapRate: number;
  unitCount: number;
}
