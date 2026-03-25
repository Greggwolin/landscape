/**
 * TypeScript interfaces for the DB-driven report system.
 */

export interface ReportDefinition {
  id: number;
  report_code: string;
  report_name: string;
  report_category: string;
  property_types: string[];
  report_tier: 'essential' | 'advanced' | 'premium';
  description: string;
  argus_equivalent: string;
  data_readiness: 'ready' | 'partial' | 'not_ready';
  generator_class: string;
  is_active: boolean;
  sort_order: number;
  template_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReportPreviewSection {
  heading: string;
  type: 'table' | 'kpi_cards' | 'text';
  columns?: ReportColumn[];
  rows?: Record<string, unknown>[];
  totals?: Record<string, unknown>;
  group_by?: string;
  cards?: ReportKPICard[];
  content?: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: 'currency' | 'number' | 'percentage' | 'text';
}

export interface ReportKPICard {
  label: string;
  value: string;
  format?: string;
}

export interface ReportPreviewData {
  title: string;
  subtitle?: string;
  as_of_date?: string;
  message?: string;
  sections: ReportPreviewSection[];
}

export interface ReportPreviewResponse {
  report_code: string;
  report_name: string;
  report_category: string;
  status: 'success' | 'not_implemented' | 'error';
  message?: string;
  error?: string;
  generation_time_ms?: number;
  data: ReportPreviewData | null;
}

export interface ReportHistoryEntry {
  id: number;
  report_definition: number;
  report_code: string;
  report_name: string;
  project_id: number;
  parameters: Record<string, unknown>;
  generated_at: string;
  export_format: string;
  generation_time_ms: number;
}

/** Category display configuration */
export const REPORT_CATEGORIES: Record<string, { label: string; icon: string; order: number }> = {
  executive: { label: 'Executive', icon: 'cil-chart-pie', order: 1 },
  capital_structure: { label: 'Capital Structure', icon: 'cil-building', order: 2 },
  underwriting: { label: 'Underwriting', icon: 'cil-settings', order: 3 },
  property: { label: 'Property', icon: 'cil-home', order: 4 },
  operations: { label: 'Operations', icon: 'cil-spreadsheet', order: 5 },
  valuation: { label: 'Valuation', icon: 'cil-calculator', order: 6 },
  cash_flow: { label: 'Cash Flow', icon: 'cil-chart-line', order: 7 },
  budget: { label: 'Budget', icon: 'cil-dollar', order: 8 },
  revenue: { label: 'Revenue', icon: 'cil-cash', order: 9 },
};

/** Readiness badge configuration */
export const READINESS_CONFIG: Record<string, { label: string; color: string }> = {
  ready: { label: 'Ready', color: 'success' },
  partial: { label: 'Partial', color: 'warning' },
  not_ready: { label: 'Coming Soon', color: 'secondary' },
};
