/**
 * TypeScript types for Valuation System
 *
 * Supports three approaches to value:
 * - Sales Comparison Approach
 * - Cost Approach
 * - Income Approach
 */

// ============================================================================
// SALES COMPARISON APPROACH
// ============================================================================

export interface UnitMixBreakdown {
  count: number;
  percentage: number;
}

export interface UnitMix {
  studio?: UnitMixBreakdown;
  one_bedroom?: UnitMixBreakdown;
  two_bedroom?: UnitMixBreakdown;
  three_bedroom?: UnitMixBreakdown;
  [key: string]: UnitMixBreakdown | undefined;
}

export type AdjustmentType =
  // Transaction Adjustments
  | 'property_rights'
  | 'financing'
  | 'conditions_of_sale'
  | 'market_conditions'
  | 'other'
  // Property Rights Adjustments
  | 'location'
  | 'physical_condition'
  | 'physical_age'
  | 'physical_unit_mix'
  | 'economic'
  | 'legal';

// Adjustment category groupings (based on Appraisal of Real Estate 14th Edition)
export type AdjustmentCategory = 'transaction' | 'property_rights';

export const ADJUSTMENT_CATEGORIES: Record<AdjustmentCategory, {
  label: string;
  types: AdjustmentType[];
}> = {
  transaction: {
    label: 'Transaction',
    types: ['property_rights', 'financing', 'conditions_of_sale', 'market_conditions', 'other']
  },
  property_rights: {
    label: 'Property rights',
    types: ['location', 'physical_condition', 'economic', 'legal', 'other']
  }
};

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

export interface AIAdjustmentSuggestion {
  ai_suggestion_id: number;
  comparable_id: number;
  adjustment_type: string;
  suggested_pct: number | null;
  confidence_level: ConfidenceLevel | null;
  justification: string | null;
  model_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesCompAdjustment {
  adjustment_id: number;
  comparable_id: number;
  adjustment_type: AdjustmentType;
  adjustment_type_display: string;
  adjustment_pct: number | null;
  adjustment_amount: number | null;
  justification: string | null;
  user_adjustment_pct: number | null;
  ai_accepted: boolean;
  user_notes: string | null;
  last_modified_by: string | null;
  created_at: string;
}

export interface SalesComparable {
  comparable_id: number;
  project_id: number;
  comp_number: number | null;
  property_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  sale_date: string | null;
  sale_price: number | null;
  price_per_unit: number | null;
  price_per_sf: number | null;
  year_built: number | null;
  units: number | null;
  building_sf: number | null;
  cap_rate: number | null;
  grm: number | null;
  distance_from_subject: string | null;
  latitude: number | null;
  longitude: number | null;
  unit_mix: UnitMix | null;
  notes: string | null;
  adjustments: SalesCompAdjustment[];
  ai_suggestions: AIAdjustmentSuggestion[];
  adjusted_price_per_unit: number | null;
  total_adjustment_pct: number;
  created_at: string;
  updated_at: string;
}

export interface SalesComparisonSummary {
  total_comps: number;
  indicated_value_per_unit: number | null;
  weighted_average_per_unit: number | null;
  total_indicated_value: number | null;
}

// ============================================================================
// COST APPROACH
// ============================================================================

export type LandValuationMethod =
  | 'sales_comparison'
  | 'allocation'
  | 'extraction'
  | 'other';

export type CostMethod =
  | 'comparative_unit'
  | 'unit_in_place'
  | 'quantity_survey'
  | 'marshall_swift'
  | 'other';

export interface CostApproach {
  cost_approach_id: number;
  project_id: number;

  // Land Value
  land_valuation_method: LandValuationMethod | null;
  land_valuation_method_display: string | null;
  land_area_sf: number | null;
  land_value_per_sf: number | null;
  total_land_value: number | null;

  // Replacement Cost
  cost_method: CostMethod | null;
  cost_method_display: string | null;
  building_area_sf: number | null;
  cost_per_sf: number | null;
  base_replacement_cost: number | null;
  entrepreneurial_incentive_pct: number | null;
  total_replacement_cost: number | null;

  // Depreciation
  physical_curable: number | null;
  physical_incurable_short: number | null;
  physical_incurable_long: number | null;
  functional_curable: number | null;
  functional_incurable: number | null;
  external_obsolescence: number | null;
  total_depreciation: number | null;
  depreciated_improvements: number | null;

  // Site Improvements
  site_improvements_cost: number | null;
  site_improvements_description: string | null;

  // Result
  indicated_value: number | null;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// INCOME APPROACH
// ============================================================================

export type CapRateMethod =
  | 'comp_sales'
  | 'band_investment'
  | 'investor_survey'
  | 'other';

export interface CapRateComp {
  cap_rate_comp_id: number;
  income_approach_id: number;
  property_address: string | null;
  sale_price: number | null;
  noi: number | null;
  implied_cap_rate: number | null;
  sale_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface IncomeApproach {
  income_approach_id: number;
  project_id: number;

  // Direct Capitalization
  market_cap_rate_method: CapRateMethod | null;
  market_cap_rate_method_display: string | null;
  selected_cap_rate: number | null;
  cap_rate_justification: string | null;
  direct_cap_value: number | null;

  // DCF
  forecast_period_years: number | null;
  terminal_cap_rate: number | null;
  discount_rate: number | null;
  dcf_value: number | null;

  // Related
  cap_rate_comps: CapRateComp[];

  created_at: string;
  updated_at: string;
}

// ============================================================================
// VALUATION RECONCILIATION
// ============================================================================

export interface ValuationReconciliation {
  reconciliation_id: number;
  project_id: number;
  sales_comparison_value: number | null;
  sales_comparison_weight: number | null;
  cost_approach_value: number | null;
  cost_approach_weight: number | null;
  income_approach_value: number | null;
  income_approach_weight: number | null;
  final_reconciled_value: number | null;
  reconciliation_narrative: string | null;
  valuation_date: string | null;
  total_weight: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VALUATION SUMMARY
// ============================================================================

export interface ValuationSummary {
  project_id: number;
  sales_comparables: SalesComparable[];
  sales_comparison_summary: SalesComparisonSummary;
  cost_approach: CostApproach | null;
  income_approach: IncomeApproach | null;
  reconciliation: ValuationReconciliation | null;
}

// ============================================================================
// FORM TYPES (for create/update operations)
// ============================================================================

export interface SalesComparableForm {
  project_id: number;
  comp_number?: number;
  property_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  sale_date?: string;
  sale_price?: number;
  price_per_unit?: number;
  price_per_sf?: number;
  year_built?: number;
  units?: number;
  building_sf?: number;
  cap_rate?: number;
  grm?: number;
  distance_from_subject?: string;
  unit_mix?: UnitMix;
  notes?: string;
}

export interface SalesCompAdjustmentForm {
  comparable_id: number;
  adjustment_type: AdjustmentType;
  adjustment_pct?: number;
  adjustment_amount?: number;
  justification?: string;
}

export interface ValuationReconciliationForm {
  project_id: number;
  sales_comparison_value?: number;
  sales_comparison_weight?: number;
  cost_approach_value?: number;
  cost_approach_weight?: number;
  income_approach_value?: number;
  income_approach_weight?: number;
  final_reconciled_value?: number;
  reconciliation_narrative?: string;
  valuation_date?: string;
}
