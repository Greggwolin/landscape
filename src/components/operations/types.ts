/**
 * Types for Operations P&L View
 */

export type SectionType = 'rental_income' | 'vacancy_deductions' | 'other_income' | 'operating_expenses';
export type ViewMode = 'detail' | 'summary';
export type GrowthType = 'global' | 'custom' | 'fee';

/**
 * Evidence data for a single scenario
 */
export interface EvidenceData {
  total?: number;
  per_unit?: number;
  per_sf?: number;
  rate?: number;
}

/**
 * Evidence values by scenario name
 */
export interface EvidenceByScenario {
  [scenario: string]: EvidenceData;
}

/**
 * User input values for As-Is column
 */
export interface AsIsInputs {
  count?: number | null;
  rate?: number | null;
  market_rate?: number | null; // Market rent (for comparison with current)
  per_sf?: number | null;
  market_per_sf?: number | null; // Market $/SF
  total: number;
  market_total?: number; // Market total (for comparison)
  growth_rate?: number;
  growth_type?: GrowthType;
}

/**
 * User input values for Post-Reno column
 */
export interface PostRenoInputs {
  count?: number | null;
  rate?: number | null;
  per_sf?: number | null;
  total: number;
}

/**
 * A single line item in the P&L
 */
export interface LineItemRow {
  line_item_key: string;
  label: string;
  category_id?: number;
  parent_key?: string;
  level: number; // 0=parent, 1=child
  is_calculated: boolean; // true for parent rollup rows
  is_percentage?: boolean; // true for vacancy %, management fee %
  is_readonly?: boolean; // true for read-only fields (from rent roll, calculated vacancy)
  calculation_base?: string; // 'gpr', 'egi', 'nri' for % calculations

  // User inputs (editable)
  as_is: AsIsInputs;
  post_reno?: PostRenoInputs;

  // Evidence by scenario (read-only)
  evidence: EvidenceByScenario;

  // Preferred evidence for collapsed view
  preferred_evidence?: EvidenceData & { scenario: string };

  // Child rows (for hierarchical sections)
  children?: LineItemRow[];
  is_expanded?: boolean;

  // Drag-and-drop support for OpEx categorization
  opex_id?: number;
  parent_category?: string;
  is_draggable?: boolean; // true for unclassified items
  is_unclassified_section?: boolean; // true for the unclassified parent group
}

/**
 * Section data with rows and totals
 */
export interface SectionData {
  section_type: 'flat' | 'hierarchical';
  is_readonly?: boolean; // true if entire section is read-only
  has_detailed_rent_roll?: boolean; // true if data comes from detailed rent roll
  calculated_physical_vacancy?: number | null; // calculated vacancy rate from rent roll
  rows: LineItemRow[];
  section_total: {
    as_is: number;
    as_is_market?: number; // Market rent total
    post_reno: number;
  };
}

/**
 * Property summary info
 */
export interface PropertySummary {
  unit_count: number;
  total_sf: number;
  avg_unit_sf: number;
  inflation_rate?: number;
}

/**
 * Calculated totals
 */
export interface OperationsTotals {
  // Current rent totals (F-12 Current)
  gross_potential_rent: number;
  gross_potential_rent_market?: number; // Market GPR (F-12 Market)
  net_rental_income: number;
  net_rental_income_market?: number;
  total_other_income: number;
  effective_gross_income: number;
  effective_gross_income_market?: number;
  total_operating_expenses: number;
  as_is_noi: number; // F-12 Current NOI
  market_noi?: number; // F-12 Market NOI
  post_reno_noi: number;
  noi_uplift: number;
  noi_uplift_percent: number;
}

/**
 * Full operations response from API
 */
export interface OperationsResponse {
  project_id: number;
  project_type_code: string;
  property_summary: PropertySummary;

  // Toggle state
  value_add_enabled: boolean;

  // Data source indicators
  has_detailed_rent_roll?: boolean; // true if detailed unit data exists
  calculated_physical_vacancy?: number | null; // calculated vacancy from rent roll

  // Four P&L sections
  rental_income: SectionData;
  vacancy_deductions: SectionData;
  other_income: SectionData;
  operating_expenses: SectionData;

  // Calculated totals
  totals: OperationsTotals;

  // Available evidence scenarios ordered by priority
  available_scenarios: string[];
  preferred_scenario: string;
}

/**
 * Request to save user inputs
 */
export interface SaveInputRequest {
  section: SectionType;
  line_item_key: string;
  category_id?: number;
  as_is_value?: number | null;
  as_is_count?: number | null;
  as_is_rate?: number | null;
  as_is_growth_rate?: number | null;
  post_reno_value?: number | null;
  post_reno_count?: number | null;
  post_reno_rate?: number | null;
}

/**
 * Request to update operations settings
 */
export interface OperationsSettingsRequest {
  value_add_enabled: boolean;
}

/**
 * Column configuration for table display
 */
export interface ColumnConfig {
  id: string;
  label: string;
  width: string;
  align: 'left' | 'right';
  isEvidence?: boolean;
  isPostReno?: boolean;
}

/**
 * Default column configurations for each section type
 */
export const RENTAL_INCOME_COLUMNS: ColumnConfig[] = [
  { id: 'label', label: 'Unit Type', width: '18%', align: 'left' },
  { id: 'count', label: 'Count', width: '6%', align: 'right' },
  { id: 'rate', label: 'Rate/Mo', width: '9%', align: 'right' },
  { id: 'per_sf', label: '$/SF', width: '7%', align: 'right' },
  { id: 'total', label: 'Total', width: '10%', align: 'right' },
  { id: 'growth', label: 'Growth', width: '8%', align: 'right' },
  { id: 'post_reno_rate', label: 'Post-Reno', width: '9%', align: 'right', isPostReno: true },
  { id: 'post_reno_total', label: 'Reno Total', width: '10%', align: 'right', isPostReno: true },
];

export const VACANCY_COLUMNS: ColumnConfig[] = [
  { id: 'label', label: 'Deduction', width: '18%', align: 'left' },
  { id: 'count', label: 'Count', width: '6%', align: 'right' },
  { id: 'rate', label: 'Rate', width: '9%', align: 'right' },
  { id: 'placeholder1', label: '—', width: '7%', align: 'right' },
  { id: 'total', label: 'Amount', width: '10%', align: 'right' },
  { id: 'placeholder2', label: '—', width: '8%', align: 'right' },
  { id: 'post_reno_rate', label: 'Post-Reno', width: '9%', align: 'right', isPostReno: true },
  { id: 'post_reno_total', label: 'Reno Amt', width: '10%', align: 'right', isPostReno: true },
];

export const OTHER_INCOME_COLUMNS: ColumnConfig[] = [
  { id: 'label', label: 'Income Category', width: '18%', align: 'left' },
  { id: 'count', label: 'Count', width: '6%', align: 'right' },
  { id: 'rate', label: 'Rate/Mo', width: '9%', align: 'right' },
  { id: 'placeholder', label: '—', width: '7%', align: 'right' },
  { id: 'total', label: 'Total', width: '10%', align: 'right' },
  { id: 'growth', label: 'Growth', width: '8%', align: 'right' },
  { id: 'post_reno_rate', label: 'Post-Reno', width: '9%', align: 'right', isPostReno: true },
  { id: 'post_reno_total', label: 'Reno Total', width: '10%', align: 'right', isPostReno: true },
];

export const OPEX_COLUMNS: ColumnConfig[] = [
  { id: 'label', label: 'Expense Category', width: '18%', align: 'left' },
  { id: 'count', label: 'Count', width: '6%', align: 'right' },
  { id: 'per_unit', label: '$/Unit', width: '9%', align: 'right' },
  { id: 'per_sf', label: '$/SF', width: '7%', align: 'right' },
  { id: 'total', label: 'Total', width: '10%', align: 'right' },
  { id: 'growth', label: 'Growth', width: '8%', align: 'right' },
  { id: 'post_reno_per_unit', label: 'Post-Reno', width: '9%', align: 'right', isPostReno: true },
  { id: 'post_reno_total', label: 'Reno Total', width: '10%', align: 'right', isPostReno: true },
];

/**
 * Default vacancy deduction types
 */
export const DEFAULT_VACANCY_ITEMS = [
  { key: 'physical_vacancy', label: 'Physical Vacancy', is_percentage: true },
  { key: 'credit_loss', label: 'Credit Loss', is_percentage: true },
  { key: 'concessions', label: 'Concessions', is_percentage: true },
  { key: 'manager_unit', label: 'Manager Unit', is_percentage: true },
  { key: 'model_unit', label: 'Model Unit', is_percentage: true },
  { key: 'employee_unit', label: 'Employee Unit', is_percentage: true },
  { key: 'loss_to_lease', label: 'Loss to Lease', is_percentage: true },
];

/**
 * Scenario priority order for evidence display
 */
export const SCENARIO_PRIORITY = [
  'T3_ANNUALIZED',
  'T12',
  'T-12',
  'CURRENT_PRO_FORMA',
  'BROKER_PRO_FORMA',
  'STABILIZED',
  'default',
];

/**
 * Format helpers
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatPerUnit(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPerSF(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `$${value.toFixed(2)}`;
}
