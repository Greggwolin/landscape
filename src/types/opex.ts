// Operating Expenses Type Definitions

export interface OpExExpense {
  opex_id?: number;
  project_id: number;
  expense_category: string;
  expense_type: string;
  annual_amount: number;
  amount_per_sf?: number;
  is_recoverable?: boolean;
  recovery_rate?: number;
  escalation_type?: 'NONE' | 'FIXED_PERCENT' | 'CPI';
  escalation_rate?: number;
  start_period: number;
  payment_frequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OpExDefaults {
  [key: string]: {
    annualAmount: number;
    perUnit?: number;
    perSF?: number;
    escalationRate: number;
  };
}

export interface PropertyMetrics {
  units: number;
  rentableSF: number;
  purchasePrice?: number;
  effectiveGrossIncome?: number;
  city?: string;
  state?: string;
  propertyClass?: 'A' | 'B' | 'C';
  yearBuilt?: number;
  hasPool?: boolean;
  hasElevator?: boolean;
}
