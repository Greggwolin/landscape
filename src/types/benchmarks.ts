/**
 * Global Benchmarks Library - TypeScript Type Definitions
 * Phase 1: Core types for benchmarks, AI suggestions, and growth rates
 */

// =============================================================================
// CORE BENCHMARK TYPES
// =============================================================================

export type BenchmarkCategoryKey =
  | 'growth_rate'
  | 'transaction_cost'
  | 'unit_cost'
  | 'absorption'
  | 'contingency'
  | 'market_timing'
  | 'land_use_pricing'
  | 'commission'
  | 'op_cost'
  | 'income'
  | 'capital_stack'
  | 'debt_standard';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type SourceType = 'user_input' | 'document_extraction' | 'project_data' | 'system_default' | 'global_default';

export type PropertyType = 'multifamily' | 'retail' | 'office' | 'industrial' | 'mixed_use' | 'land';

export interface BenchmarkCategory {
  key: BenchmarkCategoryKey;
  label: string;
  icon?: string;
  count: number;
  description?: string;
}

export type ScopeLevel = 'global' | 'project' | 'product';

export interface Benchmark {
  benchmark_id: number;
  user_id: string;
  category: BenchmarkCategoryKey;
  subcategory?: string;
  benchmark_name: string;
  description?: string;
  market_geography?: string;
  property_type?: PropertyType;
  source_type: SourceType;
  source_document_id?: number;
  source_project_id?: number;
  extraction_date?: string;
  confidence_level: ConfidenceLevel;
  usage_count: number;
  as_of_date: string;
  cpi_index_value?: number;
  context_metadata?: Record<string, any>;
  is_active: boolean;
  is_global: boolean;
  scope_level?: ScopeLevel; // 'global', 'project', or 'product' - added for sale benchmarks
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Computed properties
  age_days?: number;
  is_stale?: boolean;
  // Joined data (from detail tables)
  value?: number;
  uom_code?: string;
}

export interface BenchmarkDetail extends Benchmark {
  sources: BenchmarkSource[];
  inflation_history: InflationHistoryPoint[];
  detail?: UnitCostDetail | TransactionCostDetail | any;
}

export interface BenchmarkSource {
  source_type: SourceType;
  document_name?: string;
  project_name?: string;
  extraction_date?: string;
  value: number;
  context?: Record<string, any>;
}

export interface InflationHistoryPoint {
  date: string;
  value: number;
  cpi: number;
}

// =============================================================================
// ABSORPTION VELOCITY TYPES
// =============================================================================

export type ProjectScale = 'small' | 'medium' | 'large';

export interface AbsorptionVelocity {
  absorption_velocity_id: number;
  velocity_annual: number;
  market_geography?: string | null;
  project_scale?: ProjectScale | null;
  detail_count: number;
  data_sources: string[];
  last_updated: string;
}

export interface LandscaperAbsorptionDetail {
  detail_id: number;
  benchmark_id?: number | null;
  data_source_type: 'RCLCO_national' | 'Zonda_local' | 'MLS' | 'project_actual' | string;
  as_of_period?: string | null;
  subdivision_name?: string | null;
  mpc_name?: string | null;
  city?: string | null;
  state?: string | null;
  annual_sales?: number | null;
  yoy_change_pct?: number | null;
  monthly_rate?: number | null;
  lot_size_sf?: number | null;
  price_point_low?: number | null;
  price_point_high?: number | null;
  builder_name?: string | null;
  active_subdivisions_count?: number | null;
  product_mix_json?: Record<string, number> | null;
  market_tier?: string | null;
  competitive_supply?: string | null;
  notes?: string | null;
  market_geography?: string | null;
  extraction_date: string;
}

// =============================================================================
// UNIT COST TEMPLATE LIBRARY (Phase 2) - Universal Lifecycle Taxonomy
// =============================================================================

/**
 * Universal cost lifecycle activities that work across ALL property types
 * (land, multifamily, office, retail, industrial, etc.)
 * Renamed from LifecycleStage to Activity for clarity
 */
export type Activity =
  | 'Acquisition'
  | 'Planning & Engineering'
  | 'Improvements'  // Renamed from 'Development' in migration 042
  | 'Operations'
  | 'Disposition'
  | 'Financing';

// Backward compatibility alias - will be removed in future version
export type LifecycleStage = Activity;

/**
 * Category tag for flexible classification
 * Tags can be context-specific (Improvements: Hard/Soft, Operations: OpEx/CapEx, etc.)
 */
export interface CategoryTag {
  tag_id: number;
  tag_name: string;
  tag_context: string; // Which activity/activities this applies to
  is_system_default: boolean;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Unit cost category with activities and flexible tags
 */
export interface UnitCostCategoryReference {
  category_id: number;
  parent?: number;
  parent_name?: string;
  category_name: string;
  activitys: Activity[]; // Categories can belong to multiple lifecycle stages
  tags: string[]; // Array of tag names (e.g., ["Hard", "Professional Services"])
  sort_order: number;
  is_active: boolean;
  depth?: number;
  has_children?: boolean;
  item_count: number;  // Renamed from template_count in migration 0018
  created_at?: string;
  updated_at?: string;
}

/**
 * Category hierarchy with nested children
 */
export interface UnitCostCategoryHierarchy {
  category_id: number;
  category_name: string;
  activitys: Activity[]; // Categories can belong to multiple lifecycle stages
  tags: string[];
  sort_order: number;
  is_active: boolean;
  children: UnitCostCategoryHierarchy[];
}

/**
 * Link between unit cost items and benchmarks.
 * Renamed from TemplateBenchmarkLink in migration 0018.
 */
export interface ItemBenchmarkLink {
  link_id: number;
  benchmark_id: number;
  benchmark_name: string;
  benchmark_type?: string;
  market_geography?: string;
  is_primary: boolean;
}

// Backward compatibility alias
export type TemplateBenchmarkLink = ItemBenchmarkLink;

/**
 * Summary of a unit cost item (individual cost line item within a category).
 * Renamed from UnitCostTemplateSummary in migration 0018.
 */
export interface UnitCostItemSummary {
  item_id: number;  // Renamed from template_id
  category_id: number;
  category_name: string;
  item_name: string;
  default_uom_code: string;
  quantity?: number | null;
  typical_mid_value?: number | null;
  market_geography?: string | null;
  source?: string | null;
  as_of_date?: string | null;
  project_type_code: string;
  usage_count: number;
  last_used_date?: string | null;
  has_benchmarks: boolean;
  created_from_ai: boolean;
  created_from_project_id?: number | null;
  is_active: boolean;
}

// Backward compatibility alias
export type UnitCostTemplateSummary = UnitCostItemSummary;

/**
 * Detailed view of a unit cost item including benchmark links.
 * Renamed from UnitCostTemplateDetail in migration 0018.
 */
export interface UnitCostItemDetail extends UnitCostItemSummary {
  created_at?: string;
  updated_at?: string;
  benchmarks?: ItemBenchmarkLink[];
}

// Backward compatibility alias
export type UnitCostTemplateDetail = UnitCostItemDetail;

// =============================================================================
// UNIT COST BENCHMARKS
// =============================================================================

export interface UnitCostDetail {
  unit_cost_id: number;
  benchmark_id: number;
  value: number;
  uom_code: string; // '$/SF', '$/FF', '$/CY', etc.
  uom_alt_code?: string;
  low_value?: number;
  high_value?: number;
  cost_phase?: string; // 'planning', 'site_work', 'utilities', etc.
  work_type?: string; // 'grading', 'underground_utilities', etc.
  created_at: string;
  updated_at: string;
}

export interface CreateUnitCostBenchmark {
  benchmark_name: string;
  description?: string;
  market_geography?: string;
  value: number;
  uom_code: string;
  uom_alt_code?: string;
  low_value?: number;
  high_value?: number;
  cost_phase?: string;
  work_type?: string;
  confidence_level?: ConfidenceLevel;
  context_metadata?: Record<string, any>;
}

// =============================================================================
// TRANSACTION COST BENCHMARKS
// =============================================================================

export type ValueType = 'percentage' | 'flat_fee' | 'per_unit';

export interface TransactionCostDetail {
  transaction_cost_id: number;
  benchmark_id: number;
  cost_type: string; // 'closing_costs', 'title_insurance', 'legal', etc.
  value: number;
  value_type: ValueType;
  basis?: string; // 'purchase_price', 'sale_price', 'loan_amount'
  deal_size_min?: number;
  deal_size_max?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionCostBenchmark {
  benchmark_name: string;
  description?: string;
  market_geography?: string;
  cost_type: string;
  value: number;
  value_type: ValueType;
  basis?: string;
  deal_size_min?: number;
  deal_size_max?: number;
  confidence_level?: ConfidenceLevel;
}

// =============================================================================
// AI SUGGESTION TYPES
// =============================================================================

export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'modified';

export type SuggestionAction = 'approved' | 'variant' | 'rejected';

export interface AISuggestion {
  suggestion_id: number;
  user_id: string;
  document_id: number;
  project_id?: number;
  extraction_date: string;
  category: BenchmarkCategoryKey;
  subcategory?: string;
  suggested_name: string;
  suggested_value: number;
  suggested_uom?: string;
  market_geography?: string;
  property_type?: PropertyType;
  confidence_score?: number; // 0.00 to 1.00
  extraction_context?: Record<string, any>;
  existing_benchmark_id?: number;
  variance_percentage?: number;
  inflation_adjusted_comparison?: InflationComparison;
  status: SuggestionStatus;
  user_response?: UserResponse;
  reviewed_at?: string;
  reviewed_by?: string;
  created_benchmark_id?: number;
  created_at: string;
  // Joined data
  document_name?: string;
  project_name?: string;
}

export interface InflationComparison {
  existing_value: number;
  existing_date: string;
  cpi_factor: number;
  inflation_adjusted: number;
  suggested_value: number;
  variance_percentage: number;
  real_premium_pct: number;
  message: string;
}

export interface UserResponse {
  action: SuggestionAction;
  notes?: string;
  variant_name?: string;
  reason?: string;
}

export interface ReviewSuggestionRequest {
  action: SuggestionAction;
  notes?: string;
  variant_name?: string;
  reason?: string;
}

export interface ReviewSuggestionResponse {
  success: boolean;
  benchmark_id?: number;
  message: string;
}

// =============================================================================
// GROWTH RATE TYPES
// =============================================================================

export type RateType = 'flat' | 'stepped' | 'auto_updated';

export interface GrowthRateSet {
  set_id: number;
  project_id?: number;
  card_type?: string;
  set_name: string;
  is_default?: boolean;
  is_global?: boolean;
  is_system?: boolean;
  rate_type: RateType;
  current_rate?: number; // For flat rates
  step_count?: number; // For stepped rates
  market_geography?: string;
  benchmark_id?: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
  steps?: GrowthRateStep[];
}

export interface GrowthRateStep {
  step_id?: number;
  set_id?: number;
  step_number: number;
  from_period: number;
  periods: number | 'E'; // 'E' for perpetuity
  rate: number; // Percentage (2.0 = 2%)
  thru_period: number;
  created_at?: string;
}

export interface CreateGrowthRateSet {
  name: string;
  description?: string;
  geography?: string;
  steps: GrowthRateStepInput[];
}

export interface GrowthRateStepInput {
  from_period: number;
  rate: number;
  periods: number | 'E';
  thru_period: number;
}

export interface UpdateGrowthRateSet extends CreateGrowthRateSet {
  set_id: number;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface BenchmarksListResponse {
  benchmarks: Benchmark[];
  grouped_by_category: Record<BenchmarkCategoryKey, number>;
  total: number;
}

export interface BenchmarkDetailResponse {
  benchmark: Benchmark;
  detail: UnitCostDetail | TransactionCostDetail | any;
  sources: BenchmarkSource[];
  inflation_history: InflationHistoryPoint[];
}

export interface AISuggestionsResponse {
  suggestions: AISuggestion[];
  summary: {
    total_pending: number;
    by_category: Record<BenchmarkCategoryKey, number>;
    high_confidence: number;
    medium_confidence: number;
    low_confidence: number;
  };
}

export interface GrowthRateSetsResponse {
  sets: GrowthRateSet[];
}

export interface InflationAnalysisResponse {
  category: BenchmarkCategoryKey;
  market_geography?: string;
  period: string;
  cpi_change_pct: number;
  benchmarks_analyzed: number;
  trends: InflationTrend[];
}

export interface InflationTrend {
  subcategory: string;
  avg_change_pct: number;
  cpi_component_pct: number;
  real_change_pct: number;
  message: string;
  sample_size: number;
}

// =============================================================================
// FILTER AND QUERY TYPES
// =============================================================================

export interface BenchmarkFilters {
  category?: BenchmarkCategoryKey;
  market_geography?: string;
  property_type?: PropertyType;
  is_active?: boolean;
  include_stale?: boolean;
  user_id?: string;
}

export interface AISuggestionFilters {
  category?: BenchmarkCategoryKey;
  status?: SuggestionStatus | 'all';
  user_id?: string;
}

export interface GrowthRateFilters {
  geography?: string;
  include_inactive?: boolean;
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

export type LandscaperMode = 'silent' | 'helpful' | 'teaching';

export interface BenchmarksPageState {
  selectedCategory: BenchmarkCategory | null;
  benchmarks: Record<BenchmarkCategoryKey, Benchmark[]>;
  aiSuggestions: AISuggestion[];
  landscaperMode: LandscaperMode;
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// LANDSCAPER ASSISTANT TYPES
// =============================================================================

export interface LandscaperInsight {
  type: 'warning' | 'info' | 'success';
  message: string;
  category?: BenchmarkCategoryKey;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface LandscaperActivity {
  timestamp: string;
  description: string;
  type: 'created' | 'updated' | 'deleted' | 'approved';
  benchmark_name?: string;
}

// =============================================================================
// FORM TYPES
// =============================================================================

export interface BenchmarkFormData {
  benchmark_name: string;
  description?: string;
  category: BenchmarkCategoryKey;
  subcategory?: string;
  market_geography?: string;
  property_type?: PropertyType;
  confidence_level: ConfidenceLevel;
  source_type: SourceType;
  context_metadata?: Record<string, any>;
  // Category-specific fields populated based on category
  [key: string]: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
