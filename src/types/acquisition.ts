/**
 * Acquisition Event Types
 *
 * Event types are now driven by tbl_system_picklist (picklist_type = 'ACQUISITION_EVENT_TYPE').
 * The `event_type` column stores picklist CODES (e.g., 'CLOSING', 'DEPOSIT'), not display names.
 *
 * Two groups exist, distinguished by parent_id in the picklist:
 *   - MILESTONE group: date-only events (no Amount/Category/Subcategory)
 *   - FINANCIAL group: events with Amount, Category, Subcategory
 *
 * Legacy compatibility: hardcoded arrays are retained as FALLBACK_* constants
 * for use when the picklist fetch hasn't resolved yet.
 */

// ---------------------------------------------------------------------------
// Picklist-driven option shape (matches usePicklistOptions return)
// ---------------------------------------------------------------------------
export interface AcquisitionEventTypeOption {
  value: string;   // picklist code (stored in event_type column)
  label: string;   // display name
  parent_id?: number | null;  // null = group header, number = child of group
}

// ---------------------------------------------------------------------------
// Legacy string literal type — retained for TypeScript compatibility.
// New code should treat event_type as `string` since values come from DB.
// ---------------------------------------------------------------------------
export type AcquisitionEventType = string;

// ---------------------------------------------------------------------------
// Fallback constants — used when picklist data hasn't loaded yet.
// Codes match what will be seeded into tbl_system_picklist.
// Per session GX decision: 'Closing Date' → 'CLOSING'
// ---------------------------------------------------------------------------
export const FALLBACK_MILESTONE_CODES = ['MILESTONE', 'OPEN_ESCROW', 'CRITICAL_DATE'] as const;
export const FALLBACK_FINANCIAL_CODES = ['CLOSING', 'DEPOSIT', 'FEE', 'CREDIT', 'REFUND', 'ADJUSTMENT', 'CLOSING_COSTS'] as const;

export const FALLBACK_MILESTONE_OPTIONS: AcquisitionEventTypeOption[] = [
  { value: 'MILESTONE', label: 'Milestone', parent_id: null },
  { value: 'OPEN_ESCROW', label: 'Open Escrow', parent_id: null },
  { value: 'CRITICAL_DATE', label: 'Critical Date', parent_id: null },
];

export const FALLBACK_FINANCIAL_OPTIONS: AcquisitionEventTypeOption[] = [
  { value: 'CLOSING', label: 'Closing', parent_id: null },
  { value: 'DEPOSIT', label: 'Deposit', parent_id: null },
  { value: 'FEE', label: 'Fee', parent_id: null },
  { value: 'CREDIT', label: 'Credit', parent_id: null },
  { value: 'REFUND', label: 'Refund', parent_id: null },
  { value: 'ADJUSTMENT', label: 'Adjustment', parent_id: null },
  { value: 'CLOSING_COSTS', label: 'Closing Costs', parent_id: null },
];

export const FALLBACK_ALL_OPTIONS: AcquisitionEventTypeOption[] = [
  ...FALLBACK_MILESTONE_OPTIONS,
  ...FALLBACK_FINANCIAL_OPTIONS,
];

// ---------------------------------------------------------------------------
// Deprecated aliases — keep imports working in existing code until grid is updated.
// These map old display-name arrays to new code arrays for the transition period.
// ---------------------------------------------------------------------------
/** @deprecated Use picklist hook or FALLBACK_MILESTONE_CODES */
export const MILESTONE_ACTIONS: string[] = ['MILESTONE', 'OPEN_ESCROW', 'CRITICAL_DATE'];
/** @deprecated Use picklist hook or FALLBACK_FINANCIAL_CODES */
export const FINANCIAL_ACTIONS: string[] = ['CLOSING', 'DEPOSIT', 'FEE', 'CREDIT', 'REFUND', 'ADJUSTMENT', 'CLOSING_COSTS'];
/** @deprecated Use picklist hook or FALLBACK_ALL_OPTIONS */
export const ACQUISITION_EVENT_TYPES: string[] = [...MILESTONE_ACTIONS, ...FINANCIAL_ACTIONS];

// ---------------------------------------------------------------------------
// Group membership helpers — work with both codes and fetched options
// ---------------------------------------------------------------------------

/** Set of milestone codes for fast lookup */
const MILESTONE_CODE_SET = new Set<string>(FALLBACK_MILESTONE_CODES);

/**
 * Check if an event type code is a milestone (date-only, no financial fields).
 * Accepts a picklist code string.
 * When picklist options are available, pass the milestoneCodeSet from the hook.
 */
export const isMilestoneAction = (
  code: string | null | undefined,
  milestoneCodeSet?: Set<string>
): boolean => {
  if (!code) return false;
  const lookup = milestoneCodeSet ?? MILESTONE_CODE_SET;
  return lookup.has(code);
};

/**
 * Check if an event type code is a financial event (has Amount, Category).
 */
export const isFinancialAction = (
  code: string | null | undefined,
  milestoneCodeSet?: Set<string>
): boolean => {
  if (!code) return false;
  return !isMilestoneAction(code, milestoneCodeSet);
};

// ---------------------------------------------------------------------------
// Debit/Credit classification
// ---------------------------------------------------------------------------
const CREDIT_CODES = new Set(['CREDIT', 'REFUND', 'DEPOSIT']);

export const isCreditEvent = (eventType: string): boolean =>
  CREDIT_CODES.has(eventType);

/** @deprecated Use isCreditEvent with code strings */
export const acquisitionEventDebitCreditMap: Record<string, 'debit' | 'credit'> = {
  MILESTONE: 'debit',
  OPEN_ESCROW: 'debit',
  CLOSING: 'debit',
  DEPOSIT: 'credit',
  CREDIT: 'credit',
  REFUND: 'credit',
  FEE: 'debit',
  ADJUSTMENT: 'debit',
  CLOSING_COSTS: 'debit',
};

// ---------------------------------------------------------------------------
// Entity interfaces (unchanged)
// ---------------------------------------------------------------------------

export interface AcquisitionEvent {
  acquisitionId: number;
  projectId: number;
  contactId: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  categoryName: string | null;
  subcategoryName: string | null;
  eventDate: string | null;
  eventType: string;
  description: string | null;
  amount: number | null;
  isAppliedToPurchase: boolean | null;
  goesHardDate: string | null;
  isConditional: boolean | null;
  unitsConveyed: number | null;
  measureId: number | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AcquisitionCategoryOption {
  category_id: number;
  category_name: string;
  account_number: string | null;
  sort_order: number;
}

export interface AcquisitionCategoriesResponse {
  categories: AcquisitionCategoryOption[];
  subcategories_by_parent: Record<string, AcquisitionCategoryOption[]>;
}

export interface AcquisitionHeader {
  project_id: number;
  purchase_price: number | null;
  acquisition_date: string | null;
  due_diligence_days: number | null;
  earnest_money: number | null;
  hold_period_years?: number | null;
  exit_cap_rate?: number | null;
  sale_date?: string | null;
  closing_costs_pct?: number | null;
  sale_costs_pct?: number | null;
  broker_commission_pct?: number | null;
  price_per_unit?: number | null;
  price_per_sf?: number | null;
  legal_fees?: number | null;
  financing_fees?: number | null;
  third_party_reports?: number | null;
  depreciation_basis?: number | null;
  land_pct?: number | null;
  improvement_pct?: number | null;
  is_1031_exchange?: boolean | null;
  acquisition_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}
