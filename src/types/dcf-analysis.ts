/**
 * TypeScript types for Unified DCF Analysis
 *
 * Used by both CRE and Land Development property types.
 * Maps to tbl_dcf_analysis table.
 *
 * Session: QK-28
 */

// ============================================================================
// PROPERTY TYPE
// ============================================================================

export type PropertyType = 'cre' | 'land_dev';

export type CapRateMethod = 'comp_sales' | 'band' | 'survey' | 'direct_entry';

// ============================================================================
// DCF ANALYSIS
// ============================================================================

export interface DcfAnalysis {
  dcf_analysis_id: number;
  project_id: number;
  property_type: PropertyType;

  // Common fields (both property types)
  hold_period_years: number | null;
  discount_rate: number | null;
  exit_cap_rate: number | null;
  selling_costs_pct: number | null;

  // CRE-specific
  going_in_cap_rate?: number | null;
  cap_rate_method?: CapRateMethod | null;
  sensitivity_interval?: number | null;
  vacancy_rate?: number | null;
  stabilized_vacancy?: number | null;
  credit_loss?: number | null;
  management_fee_pct?: number | null;
  reserves_per_unit?: number | null;
  income_growth_set_id?: number | null;
  expense_growth_set_id?: number | null;

  // Land Dev-specific
  price_growth_set_id?: number | null;
  cost_inflation_set_id?: number | null;
  bulk_sale_enabled?: boolean;
  bulk_sale_period?: number | null;
  bulk_sale_discount_pct?: number | null;

  // Audit
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// GROWTH RATE SETS
// ============================================================================

export interface GrowthRateSet {
  set_id: number;
  set_name: string;
  card_type: string;  // 'revenue', 'cost', 'custom'
  is_global: boolean;
  is_default: boolean;
  project_id?: number | null;
  default_rate?: number | null;  // First step rate for display in dropdowns
}

export interface GrowthRateStep {
  step_id: number;
  step_number: number;
  from_period: number;
  to_period: number | null;
  rate: number;
}

export interface GrowthRateSetWithSteps extends GrowthRateSet {
  steps: GrowthRateStep[];
}

// ============================================================================
// API REQUEST/RESPONSE
// ============================================================================

export type DcfAnalysisUpdatePayload = Partial<Omit<DcfAnalysis,
  'dcf_analysis_id' | 'project_id' | 'property_type' | 'created_at' | 'updated_at'
>>;

export interface DcfAnalysisResponse extends DcfAnalysis {
  created?: boolean;  // True if record was just created with defaults
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface DcfParametersSectionProps {
  projectId: number;
  propertyType: PropertyType;
  data?: DcfAnalysis;
  onChange: (field: keyof DcfAnalysis, value: number | string | boolean | null) => void;
  isLoading?: boolean;
}

export interface GrowthRateSelectProps {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  cardType: 'revenue' | 'cost';
  projectId: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine property type from project_type_code
 */
export function getPropertyTypeFromProjectCode(projectTypeCode: string): PropertyType {
  return projectTypeCode === 'LAND' ? 'land_dev' : 'cre';
}

/**
 * Check if property type is Land Development
 */
export function isLandDev(propertyType: PropertyType): boolean {
  return propertyType === 'land_dev';
}

/**
 * Check if property type is Commercial Real Estate
 */
export function isCre(propertyType: PropertyType): boolean {
  return propertyType === 'cre';
}

// ============================================================================
// RESOLVED ASSUMPTIONS (for cash flow engine)
// ============================================================================

/**
 * Resolved DCF assumptions with all rates calculated.
 * Used by the cash flow engine for calculations.
 */
export interface ResolvedDcfAssumptions {
  project_id: number;
  property_type: PropertyType;

  // Common parameters
  discount_rate: number;           // Annual discount rate (decimal, e.g., 0.10 for 10%)
  hold_period_years: number;       // Analysis period in years
  selling_costs_pct: number;       // Selling costs as decimal (e.g., 0.02 for 2%)
  exit_cap_rate: number;           // Terminal cap rate (decimal)

  // Land Dev specific - resolved rates
  price_growth_rate: number;       // Annual price growth rate (decimal)
  cost_inflation_rate: number;     // Annual cost inflation rate (decimal)
  price_growth_set_id?: number | null;
  cost_inflation_set_id?: number | null;

  // Bulk sale settings
  bulk_sale_enabled: boolean;
  bulk_sale_period: number | null;
  bulk_sale_discount_pct: number;

  // CRE specific - resolved rates
  income_growth_rate?: number;
  expense_growth_rate?: number;
  going_in_cap_rate?: number;
  vacancy_rate?: number;
  stabilized_vacancy?: number;
  credit_loss?: number;
  management_fee_pct?: number;
  reserves_per_unit?: number;
}
