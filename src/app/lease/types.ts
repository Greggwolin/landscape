export type LeaseStatus = 'Contract' | 'Speculative' | 'Month-to-Month' | 'Holdover';
export type LeaseType = 'Office' | 'Retail' | 'Industrial' | 'Mixed Use';

export interface Lease {
  lease_id: number;
  project_id: number;
  parcel_id: number;
  tenant_name: string;
  tenant_contact?: string;
  tenant_email?: string;
  tenant_phone?: string;
  lease_status: LeaseStatus;
  lease_type: LeaseType;
  suite_number?: string;
  lease_commencement_date: string;
  rent_start_date?: string;
  lease_expiration_date: string;
  lease_term_months: number;
  leased_sf: number;
  floor_number?: number;
  number_of_renewal_options: number;
  renewal_option_term_months?: number;
  renewal_notice_months?: number;
  renewal_probability_pct?: number;
  early_termination_allowed: boolean;
  termination_notice_months?: number;
  termination_penalty_amount?: number;
  security_deposit_amount?: number;
  security_deposit_months?: number;
  tenant_classification?: string;
  affects_occupancy: boolean;
  expansion_rights: boolean;
  right_of_first_refusal: boolean;
  exclusive_use_clause?: string;
  co_tenancy_clause?: string;
  radius_restriction?: string;
  notes?: string;
}

export interface BaseRent {
  base_rent_id: number;
  lease_id: number;
  period_number: number;
  period_start_date: string;
  period_end_date: string;
  base_rent_psf_annual: number;
  base_rent_annual: number;
  base_rent_monthly: number;
  rent_type: 'Fixed' | 'Free' | 'Percentage' | 'Market';
  free_rent_months: number;
}

export interface Escalation {
  escalation_id: number;
  lease_id: number;
  escalation_type: 'Fixed Percentage' | 'CPI' | 'Fixed Dollar' | 'Stepped';
  escalation_pct?: number;
  escalation_frequency?: string;
  compound_escalation: boolean;
  cpi_index?: string;
  cpi_floor_pct?: number;
  cpi_cap_pct?: number;
  tenant_cpi_share_pct?: number;
  annual_increase_amount?: number;
  step_schedule?: Array<{
    step_start_date: string;
    step_amount: number;
  }>;
  first_escalation_date?: string;
}

export interface RecoveryCategory {
  name: string;
  included: boolean;
  cap?: number;
  basis?: 'Base Year' | 'Stop' | 'Pro Rata';
}

export interface Recovery {
  recovery_id: number;
  lease_id: number;
  recovery_structure: 'None' | 'Single Net' | 'Double Net' | 'Triple Net';
  expense_cap_pct?: number;
  categories: RecoveryCategory[];
}

export interface AdditionalIncomeItem {
  label: string;
  amount: number;
  frequency: 'Monthly' | 'Annual';
}

export interface AdditionalIncome {
  parking_spaces: number;
  parking_rate: number;
  other_income: AdditionalIncomeItem[];
}

export interface TenantImprovement {
  tenant_improvement_id: number;
  lease_id: number;
  allowance_psf: number;
  allowance_total: number;
  reimbursement_structure: 'Upfront' | 'Amortized' | 'Blend';
}

export interface CommissionTier {
  breakpoint_psf: number;
  rate_pct: number;
}

export interface Commission {
  commission_id: number;
  lease_id: number;
  base_commission_pct: number;
  renewal_commission_pct?: number;
  tiers?: CommissionTier[];
}

export interface MarketAssumption {
  year: number;
  projected_rent_psf: number;
  renewal_cost_psf: number;
  turnover_cost_psf: number;
}

export interface LeaseTimelineEvent {
  date: string;
  description: string;
  details?: string;
  completed: boolean;
}

export interface LeaseMetrics {
  annual_base_rent: number;
  rent_per_sf: number;
  free_rent_months: number;
  walt_months: number;
}

export interface LeaseData {
  lease: Lease;
  rentSchedule: BaseRent[];
  escalations: Escalation[];
  recoveries: Recovery;
  additionalIncome: AdditionalIncome;
  improvements: TenantImprovement;
  commissions: Commission;
  marketAssumptions: MarketAssumption[];
  timeline: LeaseTimelineEvent[];
  metrics: LeaseMetrics;
}

export interface LeaseValidationErrors {
  [key: string]: string | undefined;
}
