// ============================================================================
// PROPERTY ANALYSIS - TypeScript Interfaces
// ============================================================================
// Purpose: Type definitions for the 7-tab unified property analysis interface
// ============================================================================

// ============================================================================
// TAB NAVIGATION TYPES
// ============================================================================

export type TabId =
  | 'rent-roll'
  | 'market'
  | 'operating'
  | 'financing'
  | 'cash-flow'
  | 'returns'
  | 'sensitivity';

export type TabType = 'input' | 'computed';

export interface Tab {
  id: TabId;
  label: string;
  type: TabType;
  description: string;
  isComplete: boolean;
  isLocked: boolean;
  hasErrors: boolean;
}

export interface TabProgress {
  completedInputs: number;
  totalInputs: number;
  completedComputed: number;
  totalComputed: number;
}

// ============================================================================
// QUICK STATS TYPES (Header)
// ============================================================================

export interface QuickStats {
  occupancy_pct: number;
  noi_annual: number;
  irr: number | null;
  vacant_spaces: number;
  expiring_next_year_pct: number;
  dscr: number | null;
}

export type StatHealth = 'good' | 'warning' | 'critical';

export interface QuickStat {
  label: string;
  value: string | number;
  health: StatHealth;
  targetTab: TabId;
  icon?: string;
}

// ============================================================================
// TAB 1: RENT ROLL TYPES
// ============================================================================

export interface RentRollSpace {
  space_id: number;
  suite_number: string;
  tenant_name: string | null;
  rentable_sf: number;
  lease_status: 'Active' | 'Vacant' | 'Expiring' | 'Future';
  lease_start_date: string | null;
  lease_end_date: string | null;
  monthly_base_rent: number;
  rent_psf_annual: number;
  occupancy_status: 'Occupied' | 'Vacant';
  lease_type: string | null;
  has_percentage_rent: boolean;
  recovery_structure: string | null;
}

export interface RentRollSummary {
  total_spaces: number;
  occupied_spaces: number;
  vacant_spaces: number;
  total_sf: number;
  occupied_sf: number;
  occupancy_pct: number;
  total_monthly_rent: number;
  avg_rent_psf: number;
  expiring_within_12mo: number;
}

// ============================================================================
// TAB 2: MARKET ASSUMPTIONS TYPES
// ============================================================================

export interface MarketAssumption {
  assumption_id: number;
  space_type: string;
  market_rent_psf_min: number;
  market_rent_psf_max: number;
  market_rent_psf_avg: number;
  ti_psf: number;
  free_rent_months: number;
  lease_term_months: number;
  concession_notes: string | null;
  source: string | null;
  as_of_date: string;
}

// ============================================================================
// TAB 3: OPERATING ASSUMPTIONS TYPES
// ============================================================================

export interface OperatingExpense {
  expense_id: number;
  expense_category: string;
  annual_amount: number;
  psf_annual: number;
  is_recoverable: boolean;
  recovery_pct: number;
  escalation_pct: number;
  notes: string | null;
}

export interface VacancyAssumption {
  vacancy_pct: number;
  credit_loss_pct: number;
  absorption_months_new_lease: number;
  absorption_months_renewal: number;
}

export interface CapitalReserve {
  reserve_id: number;
  reserve_type: string;
  annual_contribution: number;
  psf_annual: number;
  balance_current: number;
}

export interface TILeasing {
  ti_psf_new_lease: number;
  ti_psf_renewal: number;
  leasing_commission_pct_new: number;
  leasing_commission_pct_renewal: number;
  legal_costs_per_lease: number;
}

export interface OperatingAssumptions {
  expenses: OperatingExpense[];
  vacancy: VacancyAssumption;
  capital_reserves: CapitalReserve[];
  ti_leasing: TILeasing;
}

// ============================================================================
// TAB 4: FINANCING ASSUMPTIONS TYPES
// ============================================================================

export interface AcquisitionCosts {
  purchase_price: number;
  closing_costs: number;
  due_diligence_costs: number;
  total_acquisition_cost: number;
}

export interface DebtStructure {
  loan_amount: number;
  ltv_pct: number;
  interest_rate_pct: number;
  amortization_years: number;
  loan_term_years: number;
  io_period_months: number;
  annual_debt_service: number;
}

export interface EquityStructure {
  total_equity: number;
  lp_equity: number;
  gp_equity: number;
  lp_pct: number;
  gp_pct: number;
  preferred_return_pct: number;
  gp_promote_tiers: PromoteTier[];
}

export interface PromoteTier {
  tier_number: number;
  irr_threshold_pct: number;
  lp_split_pct: number;
  gp_split_pct: number;
}

export interface ExitAssumptions {
  hold_period_years: number;
  exit_cap_rate_pct: number;
  selling_costs_pct: number;
  exit_year: number;
}

export interface FinancingAssumptions {
  acquisition: AcquisitionCosts;
  debt: DebtStructure;
  equity: EquityStructure;
  exit: ExitAssumptions;
}

// ============================================================================
// TAB 5: CASH FLOW PROJECTION TYPES
// ============================================================================

export interface CashFlowPeriod {
  period_number: number;
  period_start_date: string;
  period_end_date: string;

  // Revenue
  base_rent: number;
  percentage_rent: number;
  expense_recovery: number;
  other_income: number;
  gross_revenue: number;
  vacancy_loss: number;
  credit_loss: number;
  effective_gross_income: number;

  // Operating Expenses
  property_taxes: number;
  insurance: number;
  utilities: number;
  repairs_maintenance: number;
  management_fee: number;
  other_operating: number;
  total_operating_expenses: number;

  // NOI
  net_operating_income: number;

  // Capital
  tenant_improvements: number;
  leasing_commissions: number;
  capital_reserves: number;
  total_capital_expenses: number;

  // Debt
  debt_service: number;
  interest_payment: number;
  principal_payment: number;

  // Cash Flow
  cash_flow_before_tax: number;

  // LP/GP Distribution
  lp_distribution: number;
  gp_distribution: number;
  total_distribution: number;
}

export interface CashFlowSummary {
  total_revenue: number;
  total_expenses: number;
  total_noi: number;
  total_debt_service: number;
  total_cash_flow: number;
  avg_occupancy: number;
  avg_dscr: number;
}

// ============================================================================
// TAB 6: INVESTMENT RETURNS TYPES
// ============================================================================

export interface InvestmentMetrics {
  // Levered Returns
  levered_irr: number;
  levered_npv: number;
  levered_equity_multiple: number;

  // Unlevered Returns
  unlevered_irr: number;
  unlevered_npv: number;
  unlevered_equity_multiple: number;

  // Cash-on-Cash
  cash_on_cash_year_1: number;
  cash_on_cash_stabilized: number;

  // Debt Metrics
  avg_dscr: number;
  min_dscr: number;
  max_dscr: number;

  // LP Returns
  lp_irr: number;
  lp_equity_multiple: number;
  lp_total_distributions: number;

  // GP Returns
  gp_irr: number;
  gp_equity_multiple: number;
  gp_total_distributions: number;
  gp_promote_total: number;

  // Exit
  exit_value: number;
  exit_proceeds: number;
  gain_on_sale: number;
}

export interface ReturnBreakdown {
  component: string;
  amount: number;
  pct_of_total: number;
}

// ============================================================================
// TAB 7: SENSITIVITY ANALYSIS TYPES
// ============================================================================

export type CriticalityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SensitivityResult {
  assumption_name: string;
  assumption_display: string;
  baseline_value: number;
  baseline_irr: number;

  // Downside scenarios
  minus_20_value: number;
  minus_20_irr: number;
  minus_20_impact_bps: number;

  minus_10_value: number;
  minus_10_irr: number;
  minus_10_impact_bps: number;

  // Upside scenarios
  plus_10_value: number;
  plus_10_irr: number;
  plus_10_impact_bps: number;

  plus_20_value: number;
  plus_20_irr: number;
  plus_20_impact_bps: number;

  // Summary
  max_impact_bps: number;
  criticality: CriticalityLevel;
  rank: number;
}

export interface SensitivitySummary {
  total_assumptions_tested: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  top_5_assumptions: string[];
}

export interface ScenarioAnalysis {
  scenario_name: string;
  scenario_type: 'optimistic' | 'pessimistic' | 'stress';
  assumptions_adjusted: string[];
  resulting_irr: number;
  irr_change_bps: number;
  resulting_npv: number;
  npv_change: number;
}

// ============================================================================
// CALCULATION ENGINE API TYPES
// ============================================================================

export interface CalculationRequest {
  property_id: number;
  start_date: string;
  num_periods: number;
  period_type: 'monthly' | 'annual';
  vacancy_pct?: number;
  credit_loss_pct?: number;
  debt_service_annual?: number;
}

export interface CalculationStatus {
  is_calculating: boolean;
  last_calculated: string | null;
  needs_recalculation: boolean;
  error_message: string | null;
}

// ============================================================================
// FORM STATE TYPES
// ============================================================================

export interface AnalysisFormState {
  propertyId: number;
  activeTab: TabId;
  tabs: Tab[];
  progress: TabProgress;
  calculationStatus: CalculationStatus;
  isDirty: boolean;
  lastSaved: string | null;
}

export type ViewMode = 'beginner' | 'advanced';

export interface AnalysisViewSettings {
  mode: ViewMode;
  showAdvancedFields: boolean;
  showCalculationDetail: boolean;
  periodView: 'annual' | 'monthly';
}
