// ============================================================================
// TYPE DEFINITIONS FOR ASSUMPTION FIELD SYSTEM
// ============================================================================
// Purpose: Progressive disclosure UI for real estate investment assumptions
// Context: Napkin → Mid → Pro tier morphing interface
// Date: 2025-10-17
// ============================================================================

// Core types for assumption field system
export type ComplexityTier = 'napkin' | 'mid' | 'pro';
export type FieldType = 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'dropdown' | 'toggle' | 'grid';

export interface FieldDefinition {
  key: string;                          // Database column name
  label: string;                        // Display label
  type: FieldType;                      // Input type
  tier: ComplexityTier;                 // When does it appear?
  group?: string;                       // Optional: field group ID
  required?: boolean | ComplexityTier;  // Required at which tier?

  helpText: {
    napkin: string;                     // Plain English: "Why does this matter?"
    mid: string;                        // Industry standard definition
    pro: string;                        // Technical explanation + formula
  };

  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    customValidator?: (value: string | number | boolean | null, allValues: Record<string, string | number | boolean | null>) => string | null;
  };

  autoCalc?: (values: Record<string, string | number | boolean | null>) => string | number | boolean | null; // Auto-calculation function
  dependsOn?: string[];                 // Other fields this depends on

  // For dropdown types
  options?: Array<{ value: string | number; label: string }>;

  // For currency/percentage formatting
  format?: {
    prefix?: string;                    // e.g., "$"
    suffix?: string;                    // e.g., "%", " years"
    decimals?: number;
    thousandsSeparator?: boolean;
  };
}

export interface FieldGroup {
  id: string;
  label: string;
  description?: string;
  tier: ComplexityTier;                 // Group appears at this tier
  fields: string[];                     // Array of field keys
  collapsible?: boolean;                // Can user collapse this group?
  defaultCollapsed?: boolean;           // Start collapsed?
}

export interface BasketConfig {
  basketId: number;
  basketName: string;
  basketDescription: string;
  icon?: string;                        // Icon for basket header
  tableName: string;                    // Primary database table
  relatedTables?: string[];             // Related tables for pro tier
  fieldGroups: FieldGroup[];
  fields: FieldDefinition[];
}

export interface UserAssumptionPreferences {
  user_id: string;
  project_id: number;
  basket_modes: {
    basket1: ComplexityTier;
    basket2: ComplexityTier;
    basket3: ComplexityTier;
    basket4: ComplexityTier;
    basket5: ComplexityTier;
  };
  global_mode?: ComplexityTier;         // If using global toggle
}

// Database entity types
export interface PropertyAcquisition {
  acquisition_id?: number;
  project_id: number;

  // Napkin tier
  purchase_price: number;
  acquisition_date: string;
  hold_period_years: number;
  exit_cap_rate: number;
  sale_date?: string;

  // Mid tier
  closing_costs_pct?: number;
  due_diligence_days?: number;
  earnest_money?: number;
  sale_costs_pct?: number;
  broker_commission_pct?: number;
  price_per_unit?: number;
  price_per_sf?: number;

  // Pro tier
  legal_fees?: number;
  financing_fees?: number;
  third_party_reports?: number;
  depreciation_basis?: number;
  land_pct?: number;
  improvement_pct?: number;
  is_1031_exchange?: boolean;

  created_at?: string;
  updated_at?: string;
}

export interface RevenueRent {
  rent_id?: number;
  project_id: number;

  // Napkin tier
  current_rent_psf: number;
  occupancy_pct: number;
  annual_rent_growth_pct: number;

  // Mid tier
  in_place_rent_psf?: number;
  market_rent_psf?: number;
  rent_loss_to_lease_pct?: number;
  lease_up_months?: number;
  stabilized_occupancy_pct?: number;
  rent_growth_years_1_3_pct?: number;
  rent_growth_stabilized_pct?: number;
  free_rent_months?: number;
  ti_allowance_per_unit?: number;
  renewal_probability_pct?: number;

  created_at?: string;
  updated_at?: string;
}

export interface RevenueOther {
  other_income_id?: number;
  project_id: number;

  // Napkin tier
  other_income_per_unit_monthly: number;

  // Mid tier
  parking_income_per_space?: number;
  parking_spaces?: number;
  pet_fee_per_pet?: number;
  pet_penetration_pct?: number;
  laundry_income_per_unit?: number;
  storage_income_per_unit?: number;
  application_fees_annual?: number;

  // Pro tier
  late_fees_annual?: number;
  utility_reimbursements_annual?: number;
  furnished_unit_premium_pct?: number;
  short_term_rental_income?: number;
  ancillary_services_income?: number;
  vending_income?: number;
  package_locker_fees?: number;
  reserved_parking_premium?: number;
  ev_charging_fees?: number;
  other_miscellaneous?: number;

  created_at?: string;
  updated_at?: string;
}

export interface VacancyAssumption {
  vacancy_id?: number;
  project_id: number;

  // Napkin tier
  vacancy_loss_pct: number;
  collection_loss_pct: number;

  // Mid tier
  physical_vacancy_pct?: number;
  economic_vacancy_pct?: number;
  bad_debt_pct?: number;
  concession_cost_pct?: number;
  turnover_vacancy_days?: number;

  // Pro tier
  seasonal_vacancy_adjustment?: Record<string, number>; // JSONB
  lease_up_absorption_curve?: Record<string, number>; // JSONB
  market_vacancy_rate_pct?: number;
  submarket_vacancy_rate_pct?: number;
  competitive_set_vacancy_pct?: number;

  created_at?: string;
  updated_at?: string;
}

export interface OperatingExpense {
  expense_id?: number;
  project_id: number;

  // Napkin tier
  total_opex_per_unit_annual: number;
  management_fee_pct: number;

  // Mid tier
  property_taxes_annual?: number;
  insurance_annual?: number;
  utilities_annual?: number;
  repairs_maintenance_annual?: number;
  payroll_annual?: number;
  marketing_leasing_annual?: number;
  admin_legal_annual?: number;
  landscaping_annual?: number;
  trash_removal_annual?: number;
  pest_control_annual?: number;
  security_annual?: number;
  other_expenses_annual?: number;

  created_at?: string;
  updated_at?: string;
}

export interface CapexReserve {
  capex_id?: number;
  project_id: number;

  // Napkin tier
  capex_per_unit_annual: number;

  // Mid tier
  immediate_capex?: number;
  roof_reserve_per_unit?: number;
  hvac_reserve_per_unit?: number;
  appliance_reserve_per_unit?: number;
  other_reserve_per_unit?: number;

  // Pro tier
  roof_replacement_year?: number;
  roof_replacement_cost?: number;
  hvac_replacement_cycle_years?: number;
  hvac_replacement_cost_per_unit?: number;
  parking_lot_reseal_year?: number;
  parking_lot_reseal_cost?: number;
  exterior_paint_cycle_years?: number;
  exterior_paint_cost?: number;
  elevator_modernization_cost?: number;
  unit_renovation_per_turn?: number;

  created_at?: string;
  updated_at?: string;
}

export interface Loan {
  loan_id: number;
  loan_name: string;
  loan_type:
    | 'CONSTRUCTION'
    | 'BRIDGE'
    | 'PERMANENT'
    | 'MEZZANINE'
    | 'LINE_OF_CREDIT'
    | 'PREFERRED_EQUITY'
    | string;
  facility_structure?: 'TERM' | 'REVOLVER' | string | null;
  structure_type?: 'TERM' | 'REVOLVER' | string | null;
  lender_name: string | null;
  seniority: number;
  status: 'active' | 'pending' | 'closed' | 'defeased';
  commitment_amount: number;
  loan_amount: number | null;
  loan_to_cost_pct: number | null;
  loan_to_value_pct: number | null;
  interest_rate_pct: number | null;
  interest_type: 'Fixed' | 'Floating' | string | null;
  interest_index?: 'SOFR' | 'PRIME' | 'FIXED' | string | null;
  interest_spread_bps?: number | null;
  loan_term_months: number | null;
  loan_term_years: number | null;
  amortization_months: number | null;
  amortization_years: number | null;
  interest_only_months: number | null;
  payment_frequency:
    | 'MONTHLY'
    | 'QUARTERLY'
    | 'SEMI_ANNUAL'
    | 'ANNUAL'
    | 'AT_MATURITY'
    | 'Monthly'
    | 'Quarterly'
    | string
    | null;
  loan_start_date: string | null;
  loan_maturity_date: string | null;
  origination_fee_pct: number | null;
  exit_fee_pct: number | null;
  unused_fee_pct?: number | null;
  interest_reserve_inflator?: number | null;
  repayment_acceleration?: number | null;
  draw_trigger_type?: 'COST_INCURRED' | 'MANUAL' | string | null;
  collateral_basis_type?: 'PROJECT_COST' | 'RESIDUAL_LAND_VALUE' | string | null;
  closing_costs_appraisal?: number | null;
  closing_costs_legal?: number | null;
  closing_costs_closing?: number | null;
  closing_costs_other?: number | null;
  recourse_type?: 'FULL' | 'NON_RECOURSE' | 'PARTIAL' | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanSummary {
  loan_id: number;
  loan_name: string;
  loan_type: string;
  facility_structure?: string | null;
  structure_type?: string | null;
  lender_name: string | null;
  commitment_amount: number;
  loan_amount: number | null;
  interest_rate_pct: number | null;
  seniority: number;
  status: string;
  loan_maturity_date: string | null;
  loan_term_months?: number | null;
  amortization_months?: number | null;
  interest_only_months?: number | null;
  loan_start_date?: string | null;
  interest_type?: string | null;
}

export interface DebtDrawSchedule {
  draw_id: number;
  loan_id: number;
  period_id: number;
  draw_number: number | null;
  draw_amount: number | null;
  cumulative_drawn: number | null;
  available_remaining: number | null;
  beginning_balance: number | null;
  ending_balance: number | null;
  draw_status: 'PROJECTED' | 'REQUESTED' | 'FUNDED' | 'ACTUAL';
  interest_amount: number | null;
  principal_payment: number | null;
}

export type DebtFacility = Loan;

export interface EquityStructure {
  equity_structure_id?: number;
  project_id: number;

  // Napkin tier
  lp_ownership_pct: number;
  gp_ownership_pct: number;
  preferred_return_pct: number;

  // Mid tier
  gp_promote_after_pref?: number;
  catch_up_pct?: number;
  equity_multiple_target?: number;
  irr_target_pct?: number;
  distribution_frequency?: string;

  created_at?: string;
  updated_at?: string;
}

export interface WaterfallTier {
  tier_id?: number;
  equity_structure_id: number;

  tier_number: number;
  tier_description?: string;

  hurdle_type?: string;
  hurdle_rate?: number;

  lp_split_pct?: number;
  gp_split_pct?: number;

  has_catch_up?: boolean;
  catch_up_pct?: number;

  created_at?: string;
  updated_at?: string;
}
