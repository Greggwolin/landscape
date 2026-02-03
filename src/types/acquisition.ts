export type AcquisitionEventType =
  // Milestone events (date-only, no Amount/Category/Subcategory)
  | 'Milestone'
  | 'Open Escrow'
  | 'Closing Date'
  // Financial events (have Amount, Category, Subcategory)
  | 'Deposit'
  | 'Fee'
  | 'Credit'
  | 'Refund'
  | 'Adjustment'
  | 'Closing Costs';

export interface AcquisitionEvent {
  acquisitionId: number;
  projectId: number;
  contactId: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  categoryName: string | null;
  subcategoryName: string | null;
  eventDate: string | null;
  eventType: AcquisitionEventType;
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

// Milestone actions (date-only, no financial fields)
export const MILESTONE_ACTIONS: AcquisitionEventType[] = [
  'Milestone',
  'Open Escrow',
  'Closing Date',
];

// Financial actions (have Amount, Category, Subcategory)
export const FINANCIAL_ACTIONS: AcquisitionEventType[] = [
  'Deposit',
  'Fee',
  'Credit',
  'Refund',
  'Adjustment',
  'Closing Costs',
];

// Combined list - milestones first, then financial
export const ACQUISITION_EVENT_TYPES: AcquisitionEventType[] = [
  // Milestones
  'Milestone',
  'Open Escrow',
  'Closing Date',
  // Financial
  'Deposit',
  'Fee',
  'Credit',
  'Refund',
  'Adjustment',
  'Closing Costs',
];

export const isMilestoneAction = (action: AcquisitionEventType | null): boolean => {
  return action ? MILESTONE_ACTIONS.includes(action) : false;
};

export const isFinancialAction = (action: AcquisitionEventType | null): boolean => {
  return action ? FINANCIAL_ACTIONS.includes(action) : false;
};

export const acquisitionEventDebitCreditMap: Record<AcquisitionEventType, 'debit' | 'credit'> = {
  // Milestones - default to debit (no financial impact)
  Milestone: 'debit',
  'Open Escrow': 'debit',
  'Closing Date': 'debit',
  // Financial
  Deposit: 'credit',
  Credit: 'credit',
  Refund: 'credit',
  Fee: 'debit',
  Adjustment: 'debit',
  'Closing Costs': 'debit',
};

export const isCreditEvent = (eventType: AcquisitionEventType): boolean =>
  acquisitionEventDebitCreditMap[eventType] === 'credit';
