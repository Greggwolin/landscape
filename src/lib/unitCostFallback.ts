import { readFile } from 'fs/promises';
import path from 'path';
import * as xlsx from 'xlsx';
import type { UnitCostTemplateSummary } from '@/types/benchmarks';

const WORKBOOK_PATH = path.join(process.cwd(), 'uploads', 'Benchmark_UnitCost_Seed.xlsx');

const DEFAULT_LOCATION = 'Maricopa, AZ';
const DEFAULT_SOURCE = 'Copper Nail Development';
const DEFAULT_AS_OF_DATE = '2024-10-01';
const DEFAULT_PROJECT_TYPE = 'LAND';

const CATEGORY_ALIAS: Record<string, string> = {
  Grading: 'Grading / Site Prep',
  'General Contractor': 'Contractor',
  Category: ''
};

type FallbackCategory = {
  category_id: number;
  parent?: number;
  parent_name?: string;
  category_name: string;
  activitys: string[];
  tags: string[];
  sort_order: number;
  is_active: boolean;
  item_count: number;
};

type FallbackData = {
  categories: FallbackCategory[];
  templates: UnitCostTemplateSummary[];
};

let cachedFallback: FallbackData | null = null;

function cleanNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === '-' || trimmed === '--') return null;
  const normalized = trimmed.replace(/,/g, '').replace(/%/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUom(raw: unknown): string {
  if (raw === null || raw === undefined) return 'EA';
  const trimmed = String(raw).trim();
  if (!trimmed) return 'EA';

  const withoutLeadingDigits = trimmed.replace(/^[0-9]+/u, '').trim();
  const sanitized = withoutLeadingDigits.replace(/[^A-Za-z%]/g, '').toUpperCase();

  switch (sanitized) {
    case 'DAY':
    case 'DAYS':
      return 'DAY';
    case 'MO':
    case 'MOS':
    case 'MONTH':
    case 'MONTHS':
      return 'MO';
    case 'LS':
    case 'LUMP':
    case 'LUMPSUM':
      return 'LS';
    case '':
      return 'EA';
    default:
      return sanitized;
  }
}

function generateStableId(seed: string, offset: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const base = Math.abs(hash) + offset;
  return base;
}

function resolveTags(categoryName: string): string[] {
  const tags: string[] = [];
  const lower = categoryName.toLowerCase();

  if (lower.includes('deposit') || lower.includes('bond')) {
    tags.push('Deposits');
  } else if (
    lower.includes('permit') ||
    lower.includes('insurance') ||
    lower.includes('testing') ||
    lower.includes('warranty') ||
    lower.includes('tax') ||
    lower.includes('contractor')
  ) {
    tags.push('Soft');
  } else if (lower.includes('other')) {
    tags.push('Other');
  } else {
    tags.push('Hard');
  }

  return tags;
}

async function loadWorkbook(): Promise<UnitCostTemplateSummary[]> {
  try {
    await readFile(WORKBOOK_PATH);
  } catch (error) {
    console.warn(
      `Benchmark workbook not found at ${WORKBOOK_PATH}. Unit cost fallback data will be empty.`
    );
    return [];
  }

  let workbook;
  try {
    workbook = xlsx.readFile(WORKBOOK_PATH);
  } catch (error) {
    console.error(`Cannot access file ${WORKBOOK_PATH}`, error);
    return [];
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    console.warn('Benchmark workbook has no sheets; fallback data unavailable.');
    return [];
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.warn(`Unable to read sheet "${sheetName}" from benchmark workbook.`);
    return [];
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true }) as unknown[][];
  const templates: UnitCostTemplateSummary[] = [];

  // Skip first 2 rows: row 0 is empty, row 1 is headers
  // Current Excel structure: Category, Item, Quantity, UOM, Price, Source
  rows.slice(2).forEach((row, index) => {
    if (!row || row.length < 2) return;
    const [categoryRaw, itemNameRaw, quantityRaw, uomRaw, valueRaw, sourceRaw] = row;
    const originalCategory = typeof categoryRaw === 'string' ? categoryRaw.trim() : '';
    const mappedCategory = CATEGORY_ALIAS[originalCategory] ?? originalCategory;
    const categoryName = mappedCategory.trim();
    const itemName = typeof itemNameRaw === 'string' ? itemNameRaw.trim() : '';
    if (!categoryName || !itemName) return;

    const typicalMidValue = cleanNumber(valueRaw);
    const normalizedUom = normalizeUom(uomRaw);
    let quantity = cleanNumber(quantityRaw);
    if (quantity === 0) quantity = null;

    // Use Source column if available, otherwise fall back to default
    const source = sourceRaw && typeof sourceRaw === 'string' && sourceRaw.trim()
      ? sourceRaw.trim()
      : DEFAULT_SOURCE;

    const categoryId = generateStableId(categoryName, 10_000);
    templates.push({
      template_id: generateStableId(`${categoryName}-${itemName}-${index}`, 1_000_000),
      category_id: categoryId,
      category_name: categoryName,
      item_name: itemName,
      default_uom_code: normalizedUom || 'EA',
      quantity,
      typical_mid_value: typicalMidValue,
      market_geography: DEFAULT_LOCATION,
      source,
      as_of_date: DEFAULT_AS_OF_DATE,
      project_type_code: DEFAULT_PROJECT_TYPE,
      usage_count: 0,
      last_used_date: null,
      has_benchmarks: false,
      created_from_ai: false,
      created_from_project_id: null,
      is_active: true
    });
  });

  return templates;
}

async function buildFallbackData(): Promise<FallbackData> {
  const templates = await loadWorkbook();
  if (templates.length === 0) {
    return { categories: [], templates: [] };
  }

  const categoryMap = new Map<number, FallbackCategory>();

  templates.forEach((template) => {
    const existing = categoryMap.get(template.category_id);
    if (existing) {
      existing.item_count += 1;
      return;
    }

    categoryMap.set(template.category_id, {
      category_id: template.category_id,
      category_name: template.category_name,
      activitys: ['Development'],
      tags: resolveTags(template.category_name),
      sort_order: categoryMap.size,
      is_active: true,
      item_count: 1
    });
  });

  return {
    categories: Array.from(categoryMap.values()).sort((a, b) => a.sort_order - b.sort_order),
    templates
  };
}

export async function getFallbackUnitCostData(): Promise<FallbackData> {
  if (!cachedFallback) {
    cachedFallback = await buildFallbackData();
  }
  return cachedFallback;
}
