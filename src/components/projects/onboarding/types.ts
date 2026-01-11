/**
 * Types for the New Project Onboarding Modal
 */

export interface FieldValue {
  value: any;
  source: 'chat' | 'document' | 'user_edit';
  confidence: number;
  timestamp: Date;
  label?: string;
  fieldType?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    fieldsExtracted?: string[];
    documentId?: number;
    confidence?: number;
    structuredData?: any;
  };
}

export interface ReadinessResult {
  readiness_score: number;
  populated_count: number;
  total_input_fields: number;
  missing_critical: Array<{ field_key: string; label: string }>;
  missing_important: Array<{ field_key: string; label: string }>;
  can_run_model: boolean;
  confidence_level: 'high' | 'medium' | 'low' | 'insufficient';
}

export interface ValidationComparison {
  field_key: string;
  calculated: number | null;
  document_stated: number | null;
  delta: number | null;
  delta_pct: number | null;
  match: boolean;
  review_required: boolean;
}

export interface ValidationResult {
  calculated_outputs: Record<string, number | null>;
  comparisons: ValidationComparison[];
  all_match: boolean;
  review_required_count: number;
}

export interface DocumentProcessingResult {
  fields: Record<string, FieldValue>;
  validation: ValidationResult | null;
  readiness: ReadinessResult;
  contentInventory: {
    unitTypeCount: number;
    unitCount: number;
    opexCategoryCount: number;
    rentCompCount: number;
    salesCompCount: number;
  };
  documentId: number;
  documentName: string;
}

export type ViewMode = 'table' | 'tabs';

export type ChannelTab = 'property' | 'budget' | 'market' | 'underwriter';

export interface NewProjectState {
  // Project data
  projectId: number | null;
  projectName: string;
  propertyType: string;

  // Field values (growing list)
  fields: Map<string, FieldValue>;

  // UI state
  viewMode: ViewMode;
  activeTab: ChannelTab;

  // Chat state
  messages: ChatMessage[];
  isProcessing: boolean;

  // Document state
  pendingDocument: File | null;
  extractionProgress: number;

  // Readiness
  modelReadiness: ReadinessResult | null;
}

// Field definitions for each channel tab
export const PROPERTY_SIMPLIFIED_FIELDS = [
  'property_name',
  'street_address',
  'city',
  'state',
  'zip_code',
  'property_type',
  'property_class',
  'total_units',
  'year_built',
  'year_renovated',
  'stories',
  'rentable_sf',
  'lot_size_acres',
  'parking_spaces_total',
  'parking_ratio',
];

export const BUDGET_SIMPLIFIED_FIELDS = [
  // OpEx categories
  'opex_real_estate_taxes',
  'opex_property_insurance',
  'opex_utilities_water',
  'opex_utilities_electric',
  'opex_utilities_gas',
  'opex_repairs_maintenance',
  'opex_contract_services',
  'opex_turnover_costs',
  'opex_landscaping',
  'opex_management_fee',
  'opex_payroll',
  // Other income
  'income_parking',
  'income_laundry',
  'income_pet_fees',
  'income_storage',
  'income_utility_reimbursement',
];

export const MARKET_SIMPLIFIED_FIELDS = [
  'submarket',
  'submarket_vacancy',
  'submarket_rent_growth',
  'submarket_avg_rent',
  'submarket_occupancy',
  'median_hh_income_1mi',
  'population_3mi',
  'walk_score',
  'transit_score',
];

export const UNDERWRITER_SIMPLIFIED_FIELDS = [
  'asking_price',
  'acquisition_price',
  'cap_rate_going_in',
  'cap_rate_exit',
  'hold_period_years',
  'physical_vacancy_pct',
  'economic_vacancy_pct',
  'rent_growth_year_1',
  'rent_growth_stabilized',
  'expense_growth_pct',
  'discount_rate',
  'loss_to_lease_pct',
];

// Threshold for table -> tabs transition
export const FIELD_COUNT_THRESHOLD = 15;

// Minimum fields required to enable Create Project button
export const MINIMUM_CREATE_FIELDS = ['project_name', 'property_type', 'city', 'state'] as const;
