// v2.0 · 2025-11-15 · Complete Budget Field Expansion for ARGUS Parity
// Comprehensive type definitions for Napkin/Standard/Detail modes

import type { LifecycleStage } from './benchmarks';

export type BudgetMode = 'napkin' | 'standard' | 'detail';

// ============================================================================
// ENUMERATED TYPES
// ============================================================================

export type EscalationMethod = 'to_start' | 'through_duration';
export type TimingMethod = 'distributed' | 'milestone' | 'curve';
export type CurveProfile = 'standard' | 'front_loaded' | 'back_loaded';
export type BudgetStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'conceptual';
export type CostType = 'direct' | 'indirect' | 'soft' | 'financing';
export type TaxTreatment = 'capitalizable' | 'deductible' | 'non_deductible';
export type BudgetVersion = 'original' | 'revised' | 'forecast';
export type DrawSchedule = 'as_incurred' | 'monthly' | 'milestone';
export type InvoiceFrequency = 'monthly' | 'milestone' | 'completion';
export type CostAllocation = 'direct' | 'shared' | 'pro_rata';
export type AllocationMethod = 'even' | 'curve' | 'custom';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// ============================================================================
// MAIN BUDGET ITEM INTERFACE
// Fields organized by mode: Napkin (9) → Standard (+18) → Detail (+21)
// ============================================================================

export interface BudgetItem {
  // =========================================================================
  // PRIMARY KEYS & REFERENCES
  // =========================================================================
  fact_id: number;
  project_id: number;
  division_id: number | null;
  scope: string | null; // Derived from division

  // =========================================================================
  // CATEGORY HIERARCHY (L1-L4)
  // =========================================================================
  category_l1_id: number | null;
  category_l1_name: string | null;
  category_l1_code: string | null;

  category_l2_id: number | null;
  category_l2_name: string | null;
  category_l2_code: string | null;

  category_l3_id: number | null;
  category_l3_name: string | null;
  category_l3_code: string | null;

  category_l4_id: number | null;
  category_l4_name: string | null;
  category_l4_code: string | null;

  category_breadcrumb?: string; // Full path for display

  // =========================================================================
  // NAPKIN MODE FIELDS (10 fields)
  // These are the core fields visible in simplest mode
  // =========================================================================
  notes: string | null; // Description/line item name
  activity: LifecycleStage | null; // Cost lifecycle activity (Acquisition, Planning & Engineering, Development, Operations, Disposition, Financing)
  qty: number | null;
  uom_code: string | null;
  rate: number | null;
  amount: number | null; // Can be calculated (qty * rate) or manual override
  start_period: number | null; // Period number (1, 2, 3...)
  periods_to_complete: number | null; // Duration in periods (renamed from 'periods')
  end_period?: number | null; // Calculated: start_period + periods_to_complete - 1

  // =========================================================================
  // STANDARD MODE: Timing & Escalation (7 fields)
  // =========================================================================
  escalation_rate: number | null; // Annual inflation % (0-20)
  escalation_method: EscalationMethod | null; // How escalation compounds
  start_date: string | null; // Alternative to period number
  end_date: string | null; // Alternative to duration
  timing_method: TimingMethod | null; // How costs distribute
  curve_profile: CurveProfile | null; // S-curve shape (if timing_method = 'curve')
  curve_steepness: number | null; // 0-100 (if timing_method = 'curve')
  curve_id?: number | null; // FK to core_fin_curve

  // =========================================================================
  // STANDARD MODE: Cost Controls (7 fields)
  // =========================================================================
  contingency_pct: number | null; // Cost buffer %
  confidence_level: ConfidenceLevel | null; // Estimation confidence
  vendor_name: string | null; // Vendor or supplier
  vendor_contact_id: number | null; // FK to contacts table
  contract_number: string | null; // Contract reference
  purchase_order: string | null; // PO number
  is_committed: boolean | null; // Cannot delete if true

  // =========================================================================
  // STANDARD MODE: Classification (5 fields)
  // =========================================================================
  scope_override: string | null; // Force into different scope
  cost_type: CostType | null; // Direct/indirect/soft/financing
  tax_treatment: TaxTreatment | null; // Tax accounting classification
  internal_memo: string | null; // Internal notes (not exported)
  // notes field already listed above (public notes)

  // =========================================================================
  // STANDARD MODE: Variance (1 field)
  // Parent vs children variance - displayed inline in grid
  // =========================================================================
  variance_amount?: number; // Computed: parent amount - sum(children amounts)

  // =========================================================================
  // DETAIL MODE: Advanced Timing / CPM (11 fields)
  // =========================================================================
  baseline_start_date: string | null; // Original planned start (locked)
  baseline_end_date: string | null; // Original planned end (locked)
  actual_start_date: string | null; // When work actually began
  actual_end_date: string | null; // When work actually completed
  percent_complete: number | null; // Progress tracking (0-100)
  status: BudgetStatus | null; // Current work status
  is_critical: boolean | null; // On critical path (CPM computed)
  float_days: number | null; // Schedule slack (CPM computed)
  early_start_date: string | null; // CPM forward pass
  late_finish_date: string | null; // CPM backward pass
  dependency_count?: number; // Number of dependencies (computed)
  milestone_id?: number | null; // FK to milestones table

  // =========================================================================
  // DETAIL MODE: Financial Controls (10 fields)
  // =========================================================================
  budget_version: BudgetVersion | null; // Original/revised/forecast
  version_as_of_date: string | null; // When this version was created
  funding_id: number | null; // FK to funding source
  funding_source_name?: string; // Joined from funding table
  funding_draw_pct: number | null; // % from this source (0-100)
  draw_schedule: DrawSchedule | null; // When funds are drawn
  retention_pct: number | null; // Holdback % (0-100)
  payment_terms: string | null; // e.g., 'net_30', 'net_60'
  invoice_frequency: InvoiceFrequency | null; // How often invoiced
  cost_allocation: CostAllocation | null; // How allocated to parcels
  is_reimbursable: boolean | null; // Can recover from buyers

  // =========================================================================
  // DETAIL MODE: Period Allocation (8 fields)
  // =========================================================================
  allocation_method: AllocationMethod | null; // Even/curve/custom
  period_allocations?: PeriodAllocation[]; // Joined from allocations table
  cf_start_flag: boolean | null; // Marks cash flow beginning
  cf_distribution?: string; // Summary of pattern (computed)
  allocated_total: number | null; // Sum of all allocations
  allocation_variance: number | null; // allocated_total - amount (should be 0)

  // =========================================================================
  // DETAIL MODE: Documentation & Audit (10 fields)
  // =========================================================================
  bid_date: string | null; // When estimate received
  bid_amount: number | null; // Original quoted amount
  bid_variance: number | null; // amount - bid_amount (computed)
  change_order_count: number | null; // Number of change orders
  change_order_total: number | null; // Net $ impact of COs
  approval_status: ApprovalStatus | null; // Pending/approved/rejected
  approved_by: number | null; // User ID who approved
  approved_by_name?: string; // Joined from users
  approval_date: string | null; // When approved
  document_count: number | null; // Number of attachments
  last_modified_by: number | null; // User ID who last edited
  last_modified_by_name?: string; // Joined from users
  last_modified_date: string | null; // When last changed

  // =========================================================================
  // LEGACY FIELDS (maintain backward compatibility)
  // =========================================================================
  category_id?: number; // Legacy single category reference
  category_name?: string;
  category_code?: string;
  container_name?: string;
  container_display?: string;
  vendor_contact?: number | null; // FK to contacts table
  growth_rate_set_id?: number | null; // FK to growth rate sets

  // =========================================================================
  // UI STATE (client-side only)
  // =========================================================================
  is_expanded?: boolean; // Row expansion state
  has_children?: boolean; // Has child items
  level?: number; // Hierarchy level (1-4)
  parent_fact_id?: number | null; // Parent budget item
}

// ============================================================================
// PERIOD ALLOCATION STRUCTURE
// ============================================================================

export interface PeriodAllocation {
  allocation_id: number;
  fact_id: number;
  period_id: number;
  period_sequence: number;
  period_label: string; // e.g., "Jan 2025" or "Period 12"
  amount: number;
  cumulative_amount: number;
  cumulative_percent: number;
}

// ============================================================================
// FIELD CONFIGURATION
// Defines metadata for each field (type, validation, visibility)
// ============================================================================

export interface FieldConfig {
  name: keyof BudgetItem;
  label: string;
  type: FieldType;
  mode: 'napkin' | 'standard' | 'detail'; // Which mode introduces this field
  group: string; // Which field group it belongs to
  editable: boolean;
  readonly?: boolean;
  computed?: boolean;
  dependsOn?: string[]; // Other fields that affect visibility
  validation?: ValidationRule;
  helpText?: string;
  options?: { value: string; label: string }[]; // For dropdowns
  width?: number; // Recommended width in pixels (for inline fields)
  fullWidth?: boolean; // If true, spans all 3 columns in expandable row
  colWidth?: 'auto'; // If 'auto', uses minimal space (col-auto) for compact single-row layout
}

export type FieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'dropdown'
  | 'date'
  | 'checkbox'
  | 'textarea'
  | 'slider'
  | 'mini-grid' // Period allocation preview
  | 'button'
  | 'link'
  | 'user-lookup'
  | 'datetime';

export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any, item: BudgetItem) => string | null; // Returns error message or null
}

// ============================================================================
// FIELD GROUPING
// Organizes fields into collapsible sections within expandable row
// ============================================================================

export interface FieldGroup {
  id: string;
  label: string;
  mode: 'standard' | 'detail'; // When this group becomes visible
  collapsed: boolean; // Initial collapsed state
  fields: FieldConfig[];
  icon?: string; // Optional icon for group header
  color?: string; // Optional color indicator
}

// ============================================================================
// FIELD MODE SUMMARY
// Quick reference for field counts by mode
// ============================================================================

export const BUDGET_FIELD_COUNTS = {
  napkin: {
    inline: 9, // All fields visible in grid
    expandable: 0, // No expandable row
    total: 9,
    description: 'Napkin mode: 9 core fields for quick estimates',
  },
  standard: {
    inline: 10, // 9 napkin + 1 variance column
    expandable: 18, // Timing (7) + Cost Controls (6) + Classification (5)
    total: 28,
    description: 'Standard mode: 10 columns + 18 expandable fields',
  },
  detail: {
    inline: 10, // Same as standard
    expandable: 39, // Standard (18) + Advanced Timing (11) + Financial (10) + Allocation (8) + Audit (10) - some overlap
    total: 49,
    description: 'Detail mode: 10 columns + 39 expandable fields (full ARGUS parity)',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get field visibility based on mode
 */
export function isFieldVisibleInMode(
  field: FieldConfig,
  currentMode: BudgetMode
): boolean {
  const modeHierarchy: Record<BudgetMode, number> = {
    napkin: 1,
    standard: 2,
    detail: 3,
  };

  const fieldModeValue = modeHierarchy[field.mode];
  const currentModeValue = modeHierarchy[currentMode];

  return currentModeValue >= fieldModeValue;
}

/**
 * Check if field should be visible based on dependencies
 */
export function shouldShowField(
  field: FieldConfig,
  item: BudgetItem
): boolean {
  if (!field.dependsOn || field.dependsOn.length === 0) return true;

  // Example: curve_profile and curve_steepness only show when timing_method = 'curve'
  if (field.dependsOn.includes('timing_method')) {
    return item.timing_method === 'curve';
  }

  return true;
}

/**
 * Get all fields for a given mode
 */
export function getFieldsByMode(mode: BudgetMode): FieldConfig[] {
  // This will be populated from fieldGroups.ts
  return [];
}

/**
 * Calculate variance between parent and children
 */
export function calculateVariance(
  parentAmount: number,
  childrenSum: number
): number {
  return parentAmount - childrenSum;
}
