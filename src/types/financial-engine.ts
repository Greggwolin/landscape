/**
 * Landscape Financial Engine - TypeScript Type Definitions
 * Version: 1.0
 * Date: 2025-10-13
 *
 * Type definitions for the Financial Engine supporting:
 * - Land development modeling
 * - Income property analysis
 * - Mixed-use projects
 * - ARGUS Enterprise parity
 */

// =====================================================================
// ENUMERATIONS & CONSTANTS
// =====================================================================

export type ProjectType = 'Land Development' | 'Income Property' | 'Mixed Use';
export type FinancialModelType = 'Development' | 'Stabilized' | 'Value-Add';
export type CalculationFrequency = 'Monthly' | 'Quarterly' | 'Annual';

export type PhaseStatus = 'Planning' | 'Approved' | 'Under Construction' | 'Completed' | 'On Hold';

export type BuildingClass = 'A' | 'B' | 'C';

export type LotStatus = 'Available' | 'Reserved' | 'Sold' | 'Closed' | 'Leased' | 'Vacant';

export type LeaseStatus = 'Contract' | 'Speculative' | 'Month-to-Month' | 'Holdover' | 'Expired';
export type LeaseType = 'Office' | 'Retail' | 'Industrial' | 'Residential' | 'Mixed Use';
export type TenantClassification = 'Anchor' | 'Major' | 'Inline' | 'Kiosk';

export type RentType = 'Fixed' | 'Free' | 'Percentage' | 'Market' | 'Turnover';

export type EscalationType = 'Fixed Percentage' | 'CPI' | 'Fixed Dollar' | 'Stepped';
export type EscalationFrequency = 'Annual' | 'Monthly' | 'One-Time';

export type RecoveryStructure = 'None' | 'Single Net' | 'Double Net' | 'Triple Net' | 'Modified Gross' | 'Full Service';
export type RecoveryBasis = 'Base Year' | 'Stop' | 'Pro Rata';

export type ReimbursementStructure = 'Upfront' | 'Amortized' | 'Blend';

export type ExpenseType = 'Capital' | 'Operating';
export type BudgetTimingMethod = 'Lump Sum' | 'S-Curve' | 'Linear' | 'Custom';

export type AmountType = 'Annual' | 'Monthly' | 'Per SF' | 'Percentage of Revenue';
export type RecoveryPool = 'CAM' | 'Operating' | 'Tax' | 'Insurance';

export type LoanType = 'Construction' | 'Permanent' | 'Bridge' | 'Mezzanine';
export type InterestType = 'Fixed' | 'Floating';
export type InterestIndex = 'SOFR' | 'Prime' | 'Fixed';
export type PaymentFrequency = 'Monthly' | 'Quarterly';

export type EquityClass = 'Class A' | 'Class B' | 'GP' | 'LP' | 'Sponsor' | 'Investor';

export type CashflowCategory = 'Revenue' | 'Operating Expense' | 'Capital Expense' | 'Financing' | 'Distribution';
export type CalculationMethod = 'S-Curve' | 'Linear' | 'Lump Sum' | 'Lease Schedule';

// =====================================================================
// PROJECT & STRUCTURE
// =====================================================================

export interface ProjectFinancialConfig {
  project_id: number;
  project_type?: ProjectType;
  financial_model_type?: FinancialModelType;
  analysis_start_date?: string | Date;
  analysis_end_date?: string | Date;
  calculation_frequency?: CalculationFrequency;
  discount_rate_pct?: number;
  cost_of_capital_pct?: number;
  schema_version?: number;
  last_calculated_at?: string | Date;
}

export interface PhaseEnhanced {
  phase_id: number;
  area_id: number;
  project_id?: number;
  phase_name: string;
  phase_no?: number;
  label?: string;
  description?: string;
  phase_status?: PhaseStatus;
  phase_start_date?: string | Date;
  phase_completion_date?: string | Date;
  absorption_start_date?: string | Date;
}

export interface ParcelEnhanced {
  parcel_id: number;
  area_id?: number;
  phase_id?: number;
  project_id?: number;

  // Existing fields
  landuse_code?: string;
  landuse_type?: string;
  acres_gross?: number;
  lot_width?: number;
  lot_depth?: number;
  lot_product?: string;
  lot_area?: number;
  units_total?: number;

  // New fields for income properties
  parcel_name?: string;
  building_name?: string;
  building_class?: BuildingClass;
  year_built?: number;
  year_renovated?: number;
  rentable_sf?: number;
  common_area_sf?: number;
  load_factor_pct?: number;
  parking_spaces?: number;
  parking_ratio?: number;
  is_income_property?: boolean;
  property_metadata?: Record<string, any>;
}

// =====================================================================
// LOT / UNIT MODEL
// =====================================================================

export interface Lot {
  lot_id: number;
  parcel_id: number;
  phase_id?: number;
  project_id: number;

  // Identification
  lot_number?: string;
  unit_number?: string;
  suite_number?: string;

  // Physical Characteristics
  unit_type?: string;
  lot_sf?: number;
  unit_sf?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor_number?: number;

  // Pricing
  base_price?: number;
  price_psf?: number;
  options_price?: number;
  total_price?: number;

  // Status & Timing
  lot_status?: LotStatus;
  sale_date?: string | Date;
  close_date?: string | Date;
  lease_id?: number;

  // Metadata
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface LotCreate extends Omit<Lot, 'lot_id' | 'created_at' | 'updated_at'> {}
export interface LotUpdate extends Partial<LotCreate> {}

// =====================================================================
// LEASE MODEL
// =====================================================================

export interface Lease {
  lease_id: number;
  project_id: number;
  parcel_id?: number;
  lot_id?: number;

  // Tenant Information
  tenant_name: string;
  tenant_contact?: string;
  tenant_email?: string;
  tenant_phone?: string;
  tenant_classification?: TenantClassification;

  // Lease Terms
  lease_status?: LeaseStatus;
  lease_type?: LeaseType;
  suite_number?: string;
  floor_number?: number;

  // Dates
  lease_execution_date?: string | Date;
  lease_commencement_date: string | Date;
  rent_start_date?: string | Date;
  lease_expiration_date: string | Date;
  lease_term_months: number;

  // Space
  leased_sf: number;
  usable_sf?: number;

  // Renewal Options
  number_of_renewal_options?: number;
  renewal_option_term_months?: number;
  renewal_notice_months?: number;
  renewal_probability_pct?: number;

  // Termination
  early_termination_allowed?: boolean;
  termination_notice_months?: number;
  termination_penalty_amount?: number;

  // Security
  security_deposit_amount?: number;
  security_deposit_months?: number;

  // Flags
  affects_occupancy?: boolean;
  expansion_rights?: boolean;
  right_of_first_refusal?: boolean;

  // Clauses
  exclusive_use_clause?: string;
  co_tenancy_clause?: string;
  radius_restriction?: string;

  // Metadata
  notes?: string;
  lease_metadata?: Record<string, any>;
  created_at?: string | Date;
  created_by?: string;
  updated_at?: string | Date;
  updated_by?: string;
}

export interface LeaseCreate extends Omit<Lease, 'lease_id' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by'> {}
export interface LeaseUpdate extends Partial<LeaseCreate> {}

export interface BaseRent {
  base_rent_id: number;
  lease_id: number;

  period_number: number;
  period_start_date: string | Date;
  period_end_date: string | Date;

  // Rent Structure
  rent_type?: RentType;
  base_rent_psf_annual?: number;
  base_rent_annual?: number;
  base_rent_monthly?: number;

  // Percentage Rent
  percentage_rent_rate?: number;
  percentage_rent_breakpoint?: number;
  percentage_rent_annual?: number;

  // Free Rent
  free_rent_months?: number;

  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface BaseRentCreate extends Omit<BaseRent, 'base_rent_id' | 'created_at' | 'updated_at'> {}
export interface BaseRentUpdate extends Partial<BaseRentCreate> {}

export interface StepScheduleItem {
  step_start_date: string | Date;
  step_amount: number;
}

export interface Escalation {
  escalation_id: number;
  lease_id: number;

  escalation_type: EscalationType;
  escalation_pct?: number;
  escalation_frequency?: EscalationFrequency;
  compound_escalation?: boolean;

  // CPI-specific
  cpi_index?: string;
  cpi_floor_pct?: number;
  cpi_cap_pct?: number;
  tenant_cpi_share_pct?: number;

  // Fixed Dollar
  annual_increase_amount?: number;

  // Stepped Schedule
  step_schedule?: StepScheduleItem[];

  first_escalation_date?: string | Date;

  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface EscalationCreate extends Omit<Escalation, 'escalation_id' | 'created_at' | 'updated_at'> {}
export interface EscalationUpdate extends Partial<EscalationCreate> {}

export interface RecoveryCategory {
  name: string;
  included: boolean;
  cap?: number;
  basis?: RecoveryBasis;
}

export interface Recovery {
  recovery_id: number;
  lease_id: number;

  recovery_structure?: RecoveryStructure;
  expense_cap_pct?: number;

  categories: RecoveryCategory[];

  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface RecoveryCreate extends Omit<Recovery, 'recovery_id' | 'created_at' | 'updated_at'> {}
export interface RecoveryUpdate extends Partial<RecoveryCreate> {}

export interface AdditionalIncomeItem {
  label: string;
  amount: number;
  frequency: 'Monthly' | 'Annual';
}

export interface AdditionalIncome {
  additional_income_id: number;
  lease_id: number;

  parking_spaces?: number;
  parking_rate_monthly?: number;
  parking_annual?: number;

  other_income?: AdditionalIncomeItem[];

  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface AdditionalIncomeCreate extends Omit<AdditionalIncome, 'additional_income_id' | 'created_at' | 'updated_at'> {}
export interface AdditionalIncomeUpdate extends Partial<AdditionalIncomeCreate> {}

export interface TenantImprovement {
  tenant_improvement_id: number;
  lease_id: number;

  allowance_psf?: number;
  allowance_total?: number;
  actual_cost?: number;
  landlord_contribution?: number;
  reimbursement_structure?: ReimbursementStructure;
  amortization_months?: number;

  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface TenantImprovementCreate extends Omit<TenantImprovement, 'tenant_improvement_id' | 'created_at' | 'updated_at'> {}
export interface TenantImprovementUpdate extends Partial<TenantImprovementCreate> {}

export interface CommissionTier {
  breakpoint_psf: number;
  rate_pct: number;
}

export interface LeasingCommission {
  commission_id: number;
  lease_id: number;

  base_commission_pct?: number;
  renewal_commission_pct?: number;

  tiers?: CommissionTier[];

  commission_amount?: number;

  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface LeasingCommissionCreate extends Omit<LeasingCommission, 'commission_id' | 'created_at' | 'updated_at'> {}
export interface LeasingCommissionUpdate extends Partial<LeasingCommissionCreate> {}

// Full lease data package (for UI/API convenience)
export interface LeaseData {
  lease: Lease;
  rentSchedule: BaseRent[];
  escalations: Escalation[];
  recoveries?: Recovery;
  additionalIncome?: AdditionalIncome;
  improvements?: TenantImprovement;
  commissions?: LeasingCommission;
}

// =====================================================================
// FINANCIAL MODEL
// =====================================================================

export interface OperatingExpense {
  expense_id: number;
  project_id: number;
  parcel_id?: number;

  expense_category: string;
  expense_subcategory?: string;

  // Amount Structure
  amount_type?: AmountType;
  amount?: number;
  amount_psf?: number;
  percentage_of_revenue?: number;

  // Recoverable?
  is_recoverable?: boolean;
  recovery_pool?: RecoveryPool;

  // Growth
  annual_growth_pct?: number;

  notes?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface OperatingExpenseCreate extends Omit<OperatingExpense, 'expense_id' | 'created_at' | 'updated_at'> {}
export interface OperatingExpenseUpdate extends Partial<OperatingExpenseCreate> {}

export interface Loan {
  loan_id: number;
  project_id: number;

  loan_name: string;
  loan_type: LoanType;
  lender_name?: string;

  // Principal
  commitment_amount: number;
  loan_to_cost_pct?: number;
  loan_to_value_pct?: number;

  // Interest
  interest_rate_pct: number;
  interest_type?: InterestType;
  interest_index?: InterestIndex;
  interest_spread_bps?: number;

  // Fees
  origination_fee_pct?: number;
  exit_fee_pct?: number;
  unused_fee_pct?: number;

  // Terms
  loan_term_months?: number;
  amortization_months?: number;
  interest_only_months?: number;

  // Dates
  loan_start_date?: string | Date;
  loan_maturity_date?: string | Date;

  // Reserve
  interest_reserve_amount?: number;
  interest_reserve_funded_upfront?: boolean;

  // Payment
  payment_frequency?: PaymentFrequency;

  notes?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface LoanCreate extends Omit<Loan, 'loan_id' | 'created_at' | 'updated_at'> {}
export interface LoanUpdate extends Partial<LoanCreate> {}

export interface Equity {
  equity_id: number;
  project_id: number;

  equity_name: string;
  equity_class: EquityClass;
  equity_tier?: number;

  commitment_amount: number;
  funded_amount?: number;

  // Preferred Return
  preferred_return_pct?: number;
  preferred_return_compounds?: boolean;

  // Promote/Carried Interest
  promote_pct?: number;
  promote_tier_2_threshold?: number;
  promote_tier_2_pct?: number;

  notes?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface EquityCreate extends Omit<Equity, 'equity_id' | 'created_at' | 'updated_at'> {}
export interface EquityUpdate extends Partial<EquityCreate> {}

export interface WaterfallTier {
  tier: number;
  description: string;
  equity_class?: string;
  pct?: number;
  hurdle_irr?: number;
  until_gp_reaches_pct?: number;
  equity_class_splits?: Array<{
    class: string;
    pct: number;
  }>;
}

export interface Waterfall {
  waterfall_id: number;
  project_id: number;

  waterfall_name: string;
  tiers: WaterfallTier[];

  is_active?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface WaterfallCreate extends Omit<Waterfall, 'waterfall_id' | 'created_at' | 'updated_at'> {}
export interface WaterfallUpdate extends Partial<WaterfallCreate> {}

// =====================================================================
// CALCULATION ENGINE
// =====================================================================

export interface CalculationPeriod {
  period_id: number;
  project_id: number;
  period_number: number;
  period_start_date: string | Date;
  period_end_date: string | Date;
  period_type?: 'Monthly' | 'Quarterly' | 'Annual';
  fiscal_year?: number;
  fiscal_quarter?: number;
}

export interface Cashflow {
  cashflow_id: number;
  project_id: number;
  period_id: number;

  // Dimensional slicing
  parcel_id?: number;
  phase_id?: number;
  lot_id?: number;
  lease_id?: number;

  cashflow_category: CashflowCategory;
  cashflow_subcategory?: string;

  // Amounts
  amount: number;
  cumulative_amount?: number;

  // Calculation Metadata
  calculation_method?: CalculationMethod;
  source_table?: string;
  source_id?: number;

  calculated_at?: string | Date;
}

export interface CashflowCreate extends Omit<Cashflow, 'cashflow_id' | 'calculated_at'> {}

export interface CashflowSummary {
  summary_id: number;
  project_id: number;
  period_id: number;

  // Income Statement
  gross_revenue?: number;
  vacancy_loss?: number;
  credit_loss?: number;
  effective_gross_income?: number;

  operating_expenses?: number;
  net_operating_income?: number;

  // Below-line items
  capital_expenditures?: number;
  tenant_improvements?: number;
  leasing_commissions?: number;

  debt_service?: number;
  interest_expense?: number;
  principal_payment?: number;

  // Cash flows
  cash_flow_before_tax?: number;
  equity_contributions?: number;
  equity_distributions?: number;

  net_cash_flow?: number;
  cumulative_net_cash_flow?: number;

  calculated_at?: string | Date;
}

export interface ProjectMetrics {
  metrics_id: number;
  project_id: number;

  // Investment Metrics
  total_equity_invested?: number;
  total_debt_proceeds?: number;
  total_project_cost?: number;

  // Returns
  project_irr_pct?: number;
  equity_irr_pct?: number;
  levered_irr_pct?: number;
  unlevered_irr_pct?: number;

  equity_multiple?: number;

  // Value Metrics
  stabilized_noi?: number;
  exit_cap_rate_pct?: number;
  exit_value?: number;

  residual_land_value_per_acre?: number;
  residual_land_value_per_unit?: number;

  // Debt Coverage
  peak_debt?: number;
  avg_dscr?: number;
  min_dscr?: number;

  // Timing
  development_duration_months?: number;
  absorption_duration_months?: number;

  calculated_at?: string | Date;
  calculation_version?: number;
}

// =====================================================================
// API RESPONSE TYPES
// =====================================================================

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  ok: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =====================================================================
// CALCULATION REQUEST/RESPONSE TYPES
// =====================================================================

export interface CalculationRequest {
  project_id: number;
  recalculate_all?: boolean;
  start_date?: string | Date;
  end_date?: string | Date;
}

export interface CalculationResponse {
  ok: boolean;
  project_id: number;
  calculation_version: number;
  metrics: ProjectMetrics;
  calculated_at: string | Date;
  duration_ms: number;
}

export interface CashflowTimelineRequest {
  project_id: number;
  start_date?: string | Date;
  end_date?: string | Date;
  parcel_id?: number;
  phase_id?: number;
  category?: CashflowCategory;
}

export interface CashflowTimelineResponse {
  ok: boolean;
  periods: Array<{
    period_id: number;
    period_start_date: string;
    period_end_date: string;
    summary: CashflowSummary;
    details: Cashflow[];
  }>;
}

// =====================================================================
// VIEW TYPES (for convenience queries)
// =====================================================================

export interface LeaseSummary {
  project_id: number;
  project_name: string;
  total_leases: number;
  contract_leases: number;
  speculative_leases: number;
  total_leased_sf: number;
  occupied_sf: number;
  occupancy_pct: number;
}

export interface RentRoll {
  lease_id: number;
  project_id: number;
  tenant_name: string;
  suite_number?: string;
  lease_status: LeaseStatus;
  lease_type?: LeaseType;
  leased_sf: number;
  lease_commencement_date: string | Date;
  lease_expiration_date: string | Date;
  lease_term_months: number;
  base_rent_psf_annual?: number;
  base_rent_annual?: number;
  base_rent_monthly?: number;
  renewal_probability_pct?: number;
  months_to_expiration?: number;
}

// =====================================================================
// VALIDATION & ERROR TYPES
// =====================================================================

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// =====================================================================
// EXPORT CONVENIENCE TYPES
// =====================================================================

export type {
  // Re-export existing lease types for compatibility
  LeaseStatus as LeaseStatusType,
  LeaseType as LeaseTypeEnum,
  Lease as LeaseModel,
  BaseRent as BaseRentModel,
  Escalation as EscalationModel,
  Recovery as RecoveryModel,
};
