// Growth Rate Types for NeonDB Integration

export interface GrowthRateStep {
  step: number;
  period: number;
  rate: string;
  periods: string | number;
  thru: number;
  product?: string;
  timing?: string;
}

export interface GrowthRateImpact {
  dollarAmount: string;
  percentOfProject: string;
  irrImpact: string;
}

export interface GrowthRateTab {
  label: string;
  content: string;
}

export interface GrowthRateAssumption {
  id: number;
  name: string;
  category: string;
  globalRate: string;
  steps: GrowthRateStep[];
  impact: GrowthRateImpact;
  tabs: GrowthRateTab[];
}

export interface GrowthRatesResponse {
  assumptions: GrowthRateAssumption[];
}

export interface UpdateGrowthRateRequest {
  id: number;
  projectId?: number;
  globalRate?: string;
  steps?: GrowthRateStep[];
  impact?: GrowthRateImpact;
}

export interface CreateGrowthRateRequest {
  projectId?: number;
  category: string;
  name: string;
  globalRate?: string;
  steps?: GrowthRateStep[];
  impact?: GrowthRateImpact;
}

export type GrowthRateCategory =
  | 'DEVELOPMENT_COSTS'
  | 'PRICE_APPRECIATION'
  | 'SALES_ABSORPTION'
  | 'GROWTH_RATES';

export interface GrowthRateValidationError {
  field: string;
  message: string;
}

export interface GrowthRateApiError {
  error: string;
  details?: string;
  validationErrors?: GrowthRateValidationError[];
}