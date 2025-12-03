/**
 * Sales & Absorption Type Definitions
 * For LAND project parcel sales tracking and absorption analysis
 */

export type SaleType = 'single_closing' | 'multi_closing' | 'structured_sale' | 'bulk_assignment';
export type SaleStatus = 'pending' | 'active' | 'closed' | 'cancelled';

/**
 * Parcel Sale Event
 * Represents a contract to sell lots from a parcel
 */
export interface ParcelSaleEvent {
  sale_event_id: number;
  project_id: number;
  parcel_id: number;
  phase_id?: number;
  sale_type: SaleType;
  buyer_entity: string;
  buyer_contact_id?: number;
  contract_date: string; // ISO date string
  total_lots_contracted: number;
  base_price_per_lot: number;
  price_escalation_formula?: string;
  deposit_amount?: number;
  deposit_date?: string;
  deposit_terms?: string;
  deposit_applied_to_purchase: boolean;
  has_escrow_holdback: boolean;
  escrow_holdback_amount?: number;
  escrow_release_terms?: string;
  sale_status: SaleStatus;
  notes?: string;

  // Custom overrides (apply to all closings)
  commission_pct?: number | null;
  closing_cost_per_unit?: number | null;
  onsite_cost_pct?: number | null;
  has_custom_overrides?: boolean;

  closings?: ClosingEvent[];

  // Frontend-friendly aliases (map from DB column names)
  total_units?: number; // Alias for total_lots_contracted
}

/**
 * Closing Event
 * Individual closing/takedown within a sale event
 */
export interface ClosingEvent {
  closing_id?: number;
  sale_event_id?: number;
  closing_sequence: number;
  closing_date: string; // ISO date string
  lots_closed: number;

  // Calculated fields (populated by backend)
  base_price_per_unit?: number;
  inflated_price_per_unit?: number;
  uom_code?: string;
  gross_proceeds?: number;
  gross_value?: number;

  // Deductions
  onsite_costs?: number;
  less_commissions_amount?: number;
  commission_amount?: number;
  less_closing_costs?: number;
  closing_costs?: number;
  less_improvements_credit?: number;

  net_proceeds?: number;
  cumulative_lots_closed?: number;
  lots_remaining?: number;
  escrow_release_amount?: number;
  escrow_release_date?: string;
  notes?: string;

  // Frontend-friendly aliases
  closing_number?: number; // Alias for closing_sequence
  units_closing?: number; // Alias for lots_closed
}

/**
 * Annual Inventory Gauge Data
 * Year-by-year lot inventory tracking
 */
export interface InventoryGaugeData {
  project_id: number;
  years: InventoryYear[];
}

export interface InventoryYear {
  year: number;
  lots_delivered: number;
  lots_absorbed: number;
  year_end_inventory: number;
}

/**
 * Parcel with Sale Data
 * Combined parcel info with current sale status
 */
export interface ParcelWithSale {
  parcel_id: number;
  parcel_code: string;
  phase_id?: number;
  phase_name?: string;
  area_id?: number;
  dev_phase_id?: number;
  family_code: string;
  family_name: string;
  density_code: string;
  type_code: string;
  product_code: string;
  lot_product: string;
  acres: number;
  units: number;
  base_price_per_unit?: number | null;
  pricing_effective_date?: string | null;
  growth_rate?: number | null;
  current_value_per_unit: number | null; // Inflated value from backend
  gross_value: number | null; // units * current_value_per_unit
  net_proceeds?: number | null;
  pending_net_proceeds?: boolean;
  uom_code: string | null; // Unit of measure (FF, SF, AC, EA)
  sale_phase_code?: string | null;
  sale_phase_label?: string | null;
  sale_phase_number?: number | null; // short integer entered by user
  sale_date?: string | null;
  sale_period?: number | null; // Absolute month index for sale timing
  onsite_cost_pct?: number | null;
  onsite_cost_amount?: number | null;
  commission_pct?: number | null;
  commission_amount?: number | null;
  closing_cost_per_unit?: number | null;
  closing_cost_total?: number | null;
  has_custom_overrides?: boolean;
  sale_event?: ParcelSaleEvent;
  absorption_velocity?: number;
}

export interface SalePhaseBenchmarks {
  onsite_cost_pct: number | null;
  commission_pct: number | null;
  closing_cost_per_unit: number | null;
}

export interface SalePhaseSummary extends SalePhaseBenchmarks {
  phase_code: string;
  phase_id?: number;
  phase_number?: number;
  sale_date: string | null;
  parcel_count: number;
  area_id?: number;
  dev_phase_id?: number;
}

export interface ParcelSalesDataset {
  parcels: ParcelWithSale[];
  sale_phases: SalePhaseSummary[];
  benchmark_defaults?: SalePhaseBenchmarks;
}

export interface CreateSalePhasePayload extends SalePhaseBenchmarks {
  parcel_id: number;
  sale_phase_number: number;
  sale_date: string;
}

export interface AssignParcelToPhasePayload {
  parcel_id: number;
  sale_phase_code: string | null;
}

export interface ParcelSaleOverridePayload {
  parcel_id: number;
  onsite_cost_pct?: number | null;
  onsite_cost_amount?: number | null;
  commission_pct?: number | null;
  commission_amount?: number | null;
  closing_cost_per_unit?: number | null;
  closing_cost_total?: number | null;
}

export interface UpdateParcelSaleDatePayload {
  parcel_id: number;
  sale_date: string | null;
}

/**
 * Parcel Absorption Profile
 * Absorption velocity tracking per parcel
 */
export interface ParcelAbsorptionProfile {
  absorption_profile_id: number;
  project_id: number;
  parcel_id: number;
  sale_event_id?: number;
  product_classification_code?: string;
  absorption_velocity_override?: number; // units per month
  sales_start_date?: string;
  initial_inventory_lots: number;
  projected_sellout_date?: string;
  months_to_sellout?: number;
  notes?: string;
}

/**
 * Benchmark Absorption Velocity
 * Global/market benchmarks for absorption rates
 */
export interface BenchmarkAbsorptionVelocity {
  benchmark_velocity_id: number;
  classification_code: string;
  classification_display_name: string;
  units_per_month: number;
  builder_inventory_target_min_months: number;
  builder_inventory_target_max_months: number;
  market_geography?: string;
  data_source?: string;
  last_updated?: string;
  is_active: boolean;
  sort_order: number;
  notes?: string;
}

/**
 * Market Timing Benchmark
 * Global benchmarks for development timing
 */
export interface BenchmarkMarketTiming {
  benchmark_timing_id: number;
  phase_code: string;
  phase_display_name: string;
  typical_duration_months: number;
  market_geography?: string;
  data_source?: string;
  last_updated?: string;
  is_active: boolean;
  sort_order: number;
  notes?: string;
}

/**
 * Phase Summary Stats
 * Rollup data for phase tiles
 */
export interface PhaseSalesStats {
  phase_id: number;
  phase_name: string;
  total_acres: number;
  total_parcels: number;
  total_units: number;
  contracted_lots?: number;
  sold_lots?: number;
  remaining_lots?: number;
  phase_color?: string;
}

/**
 * Form data for creating single closing sale
 */
export interface SingleClosingSaleForm {
  parcel_id: number;
  buyer_entity: string;
  contract_date: string;
  closing_date: string;
  total_lots: number;
  price_per_lot: number;
  commissions_amount?: number;
  commissions_percent?: number;
  closing_costs?: number;
}

/**
 * Calculated sale proceeds
 */
export interface SaleProceeds {
  gross_proceeds: number;
  commissions: number;
  closing_costs: number;
  net_proceeds: number;
}

/**
 * Project Pricing Assumption
 * Land use product pricing with growth rates
 */
export interface PricingAssumption {
  id?: number;
  project_id: number;
  lu_type_code: string;
  product_code?: string;
  price_per_unit: number;
  unit_of_measure: string; // FF, SF, AC, EA
  growth_rate: number; // Decimal (e.g., 0.035 for 3.5%)
  created_at?: string;
  updated_at?: string;
  inflated_value?: number; // Calculated by backend
}

/**
 * Parcel Product Type
 * Unique combinations of type_code and product_code from parcels
 */
export interface ParcelProductType {
  type_code: string;
  product_code: string | null;
  family_name: string;
  parcel_count: number;
  total_units: number;
}

/**
 * Create Parcel Sale Payload
 * Payload for creating a new sale event with closings
 */
export interface CreateParcelSalePayload {
  parcel_id: number;
  sale_type: 'single_closing' | 'multi_closing';
  buyer_entity?: string;
  contract_date?: string;

  // Custom overrides (optional, apply to all closings)
  commission_pct?: number;
  closing_cost_per_unit?: number;
  onsite_cost_pct?: number;
  has_custom_overrides?: boolean;

  closings: CreateClosingPayload[];
}

/**
 * Create Closing Payload
 * Nested payload for individual closings
 */
export interface CreateClosingPayload {
  closing_number: number;
  closing_date: string;
  units_closing: number;
}

/**
 * Update Parcel Sale Payload
 * Payload for updating sale type or overrides
 */
export interface UpdateParcelSalePayload {
  sale_type?: 'single_closing' | 'multi_closing';
  buyer_entity?: string;
  commission_pct?: number | null;
  closing_cost_per_unit?: number | null;
  onsite_cost_pct?: number | null;
  has_custom_overrides?: boolean;
}

/**
 * Update Closing Payload
 * Payload for updating an existing closing
 */
export interface UpdateClosingPayload {
  closing_date?: string;
  units_closing?: number;
}

// ============================================================================
// Sale Calculation System Types
// ============================================================================

/**
 * Sale Benchmark
 * Benchmark defaults for improvement offsets and transaction costs
 * Uses hierarchy: product > project > global
 */
export interface SaleBenchmark {
  benchmark_id: number;
  scope_level: 'global' | 'project' | 'product';
  project_id?: number;
  lu_type_code?: string;
  product_code?: string;
  benchmark_type: 'improvement_offset' | 'legal' | 'commission' | 'closing' | 'title_insurance' | 'custom';
  benchmark_name?: string;
  rate_pct?: number; // e.g., 0.0300 = 3%
  amount_per_uom?: number; // e.g., $1,000/FF
  fixed_amount?: number; // e.g., $5,000
  uom_code?: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * Transaction Cost Item
 * Used for displaying benchmark-based costs in the modal
 */
export interface TransactionCostItem {
  type: 'legal' | 'commission' | 'closing' | 'title_insurance';
  rate: number; // Percentage as decimal
  amount: number; // Calculated dollar amount
  source: 'global' | 'project' | 'product' | 'manual_override';
  description?: string;
}

/**
 * Custom Transaction Cost
 * User-defined additional costs
 */
export interface CustomTransactionCost {
  name: string;
  amount: number;
  type: '$' | '%';
  description?: string;
  is_saved_as_benchmark?: boolean;
}

/**
 * Sale Calculation
 * Complete breakdown of sale proceeds calculation
 */
export interface SaleCalculation {
  sale_date: string;

  // Gross pricing
  base_price_per_unit: number;
  price_uom: string; // FF, SF, AC, EA, UN, $$$
  inflation_rate: number;
  inflated_price_per_unit: number;
  gross_parcel_price: number;

  // Improvement offset
  improvement_offset_per_uom: number;
  improvement_offset_total: number;
  improvement_offset_source: string; // 'benchmark_product', 'benchmark_project', 'benchmark_global', 'manual_override'

  // Gross sale proceeds (after improvement offset)
  gross_sale_proceeds: number;

  // Transaction costs
  legal_pct: number;
  legal_amount: number;
  legal_is_fixed: boolean;
  commission_pct: number;
  commission_amount: number;
  commission_is_fixed: boolean;
  closing_cost_pct: number;
  closing_cost_amount: number;
  closing_cost_is_fixed: boolean;
  title_insurance_pct: number;
  title_insurance_amount: number;
  title_insurance_is_fixed: boolean;

  // Custom costs
  custom_transaction_costs: CustomTransactionCost[];

  // Net result
  total_transaction_costs: number;
  net_sale_proceeds: number;
  net_proceeds_per_uom: number;

  // Benchmarks used in calculation
  benchmarks?: {
    improvement_offset?: {
      amount_per_uom: number;
      uom: string;
      source: string;
      description?: string;
    };
    legal?: {
      rate: number;
      source: string;
      description?: string;
    };
    commission?: {
      rate: number;
      source: string;
      description?: string;
    };
    closing?: {
      rate: number;
      source: string;
      description?: string;
    };
    title_insurance?: {
      rate: number;
      source: string;
      description?: string;
    };
  };
}

/**
 * Parcel Sale Assumption
 * Saved calculation result for a parcel
 */
export interface ParcelSaleAssumption extends SaleCalculation {
  assumption_id: number;
  parcel_id: number;
  improvement_offset_override: boolean;
  legal_override: boolean;
  commission_override: boolean;
  closing_cost_override: boolean;
  title_insurance_override: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create Benchmark Payload
 * Payload for creating a new benchmark
 */
export interface CreateBenchmarkPayload {
  scope_level: 'project' | 'product';
  project_id: number;
  lu_type_code?: string;
  product_code?: string;
  benchmark_type: 'improvement_offset' | 'legal' | 'commission' | 'closing' | 'title_insurance' | 'custom';
  benchmark_name?: string;
  rate_pct?: number;
  amount_per_uom?: number;
  fixed_amount?: number;
  uom_code?: string;
  description?: string;
}

/**
 * Calculate Sale Payload
 * Request payload for calculating sale proceeds
 */
export interface CalculateSalePayload {
  sale_date: string;
  overrides?: {
    improvement_offset_per_uom?: number;
    legal_pct?: number;
    commission_pct?: number;
    closing_cost_pct?: number;
    title_insurance_pct?: number;
    custom_transaction_costs?: CustomTransactionCost[];
  };
}

/**
 * Save Assumptions Payload
 * Request payload for saving parcel sale assumptions
 */
export interface SaveAssumptionsPayload {
  sale_date: string;
  overrides?: {
    improvement_offset_per_uom?: number;
    legal_pct?: number;
    commission_pct?: number;
    closing_cost_pct?: number;
    title_insurance_pct?: number;
    custom_transaction_costs?: CustomTransactionCost[];
  };
}
