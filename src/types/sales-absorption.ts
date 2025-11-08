/**
 * Sales & Absorption Type Definitions
 * For LAND project parcel sales tracking and absorption analysis
 */

export type SaleType = 'single_closing' | 'structured_sale' | 'bulk_assignment';
export type SaleStatus = 'pending' | 'active' | 'closed' | 'terminated';

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
  closings?: ClosingEvent[];
}

/**
 * Closing Event
 * Individual closing/takedown within a sale event
 */
export interface ClosingEvent {
  closing_id: number;
  sale_event_id: number;
  closing_sequence: number;
  closing_date: string; // ISO date string
  lots_closed: number;
  gross_proceeds: number;
  less_commissions_amount?: number;
  less_closing_costs?: number;
  less_improvements_credit?: number;
  net_proceeds: number;
  cumulative_lots_closed: number;
  lots_remaining: number;
  escrow_release_amount?: number;
  escrow_release_date?: string;
  notes?: string;
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
  family_code: string;
  family_name: string;
  density_code: string;
  type_code: string;
  product_code: string;
  lot_product: string;
  acres: number;
  units: number;
  current_value_per_unit: number | null; // Inflated value from backend
  gross_value: number | null; // units * current_value_per_unit
  uom_code: string | null; // Unit of measure (FF, SF, AC, EA)
  sale_event?: ParcelSaleEvent;
  absorption_velocity?: number;
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
