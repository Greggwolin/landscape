export type AcquisitionEventType =
  | 'Deposit'
  | 'Open Escrow'
  | 'Closing'
  | 'Fee'
  | 'Credit'
  | 'Refund'
  | 'Adjustment'
  | 'Extension'
  | 'Effective Date'
  | 'Title Survey';

export interface AcquisitionEvent {
  acquisitionId: number;
  projectId: number;
  contactId: number | null;
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

export const ACQUISITION_EVENT_TYPES: AcquisitionEventType[] = [
  'Deposit',
  'Open Escrow',
  'Closing',
  'Fee',
  'Credit',
  'Refund',
  'Adjustment',
  'Extension',
  'Effective Date',
  'Title Survey',
];

export const acquisitionEventDebitCreditMap: Record<AcquisitionEventType, 'debit' | 'credit'> = {
  Deposit: 'credit',
  Credit: 'credit',
  Refund: 'credit',
  'Open Escrow': 'debit',
  Closing: 'debit',
  Fee: 'debit',
  Adjustment: 'debit',
  Extension: 'debit',
  'Effective Date': 'debit',
  'Title Survey': 'debit',
};

export const isCreditEvent = (eventType: AcquisitionEventType): boolean =>
  acquisitionEventDebitCreditMap[eventType] === 'credit';
