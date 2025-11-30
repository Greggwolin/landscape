export type MeasureCategory = 'area' | 'linear' | 'volume' | 'count' | 'time' | 'currency';

export interface UnitOfMeasure {
  measure_code: string;
  measure_name: string;
  measure_category: MeasureCategory;
  is_system: boolean;
  sort_order?: number | null;
  usage_contexts?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type UnitOfMeasureDraft = Pick<UnitOfMeasure, 'measure_code' | 'measure_name' | 'measure_category' | 'is_system'>;

export const MEASURE_CATEGORIES: ReadonlyArray<{ value: MeasureCategory; label: string }> = [
  { value: 'area', label: 'Area (SF, AC, HA)' },
  { value: 'linear', label: 'Linear (LF, FF, MI)' },
  { value: 'volume', label: 'Volume (CY, CF, GAL)' },
  { value: 'count', label: 'Count (EA, LOT, UNIT)' },
  { value: 'time', label: 'Time (MO, QTR, YR)' },
  { value: 'currency', label: 'Currency (USD, CAD)' },
];

export const MEASURE_CATEGORY_SET = new Set(MEASURE_CATEGORIES.map((entry) => entry.value));

export const normalizeMeasureCode = (value: string) => value.trim().toUpperCase();

export const normalizeMeasureName = (value: string) => value.trim();

export const normalizeMeasureCategory = (value: string) =>
  (value || '').trim().toLowerCase() as MeasureCategory;

export const sortMeasures = (items: UnitOfMeasure[]) =>
  [...items].sort((a, b) => {
    const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    if (a.measure_category !== b.measure_category) {
      return a.measure_category.localeCompare(b.measure_category);
    }
    return a.measure_code.localeCompare(b.measure_code);
  });

// Default usage contexts by code for display fallback when DB column is missing or empty
const DEFAULT_CONTEXTS_BY_CODE: Record<string, string[]> = {
  AC: ['land_pricing', 'budget_cost', 'budget_qty'],
  SF: ['land_pricing', 'budget_cost', 'budget_qty'],
  SY: ['land_pricing', 'budget_cost', 'budget_qty'],
  FF: ['land_pricing', 'budget_cost', 'budget_qty'],
  LF: ['land_pricing', 'budget_cost', 'budget_qty'],
  EA: ['land_pricing', 'budget_cost', 'budget_qty'],
  UNIT: ['land_pricing', 'budget_cost', 'budget_qty'],
  LOT: ['land_pricing', 'budget_cost', 'budget_qty'],
  DOOR: ['budget_cost', 'budget_qty'],
  STALL: ['budget_cost', 'budget_qty'],
  LS: ['budget_cost'],
  CY: ['budget_cost', 'budget_qty'],
  MO: ['absorption', 'budget_cost'],
  QTR: ['absorption'],
  YR: ['absorption', 'budget_cost'],
  WK: ['absorption'],
  DAY: ['budget_cost'],
  '%': ['rate_factor'],
};

export const getDefaultUsageContexts = (code: string): string[] => {
  const key = (code || '').toUpperCase();
  return DEFAULT_CONTEXTS_BY_CODE[key] ?? [];
};
