#!/usr/bin/env tsx

/**
 * Seed unit cost templates from the Benchmark_UnitCost_Seed.xlsx workbook.
 *
 * Usage:
 *   npx tsx scripts/seed_unit_cost_templates_benchmark_excel.ts
 *
 * Requirements:
 *   - DATABASE_URL configured in environment or .env.local
 *   - Unit cost categories for the referenced category names already exist
 */

import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import * as xlsx from 'xlsx';

type TemplateRecord = {
  categoryName: string;
  itemName: string;
  normalizedUom: string;
  quantity: number | null;
  typicalMidValue: number | null;
  source: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const projectRoot = resolve(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env.local') });

const DEFAULT_LOCATION = 'Maricopa, AZ';
const DEFAULT_SOURCE = 'Copper Nail Development';
const DEFAULT_AS_OF_DATE = '2024-10-01';
const DEFAULT_PROJECT_TYPE = 'LAND';

const WORKBOOK_PATH = join(projectRoot, 'uploads', 'Benchmark_UnitCost_Seed.xlsx');

const CATEGORY_ALIAS: Record<string, string> = {
  Grading: 'Grading / Site Prep',
  'General Contractor': 'Contractor',
  Category: ''
};

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  throw new Error('DATABASE_URL is not set. Define it in the environment or .env.local.');
}

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
  if (raw === null || raw === undefined) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';

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
      return '';
    default:
      return sanitized;
  }
}

async function loadWorkbook(): Promise<TemplateRecord[]> {
  try {
    await readFile(WORKBOOK_PATH);
  } catch (error) {
    throw new Error(
      `Benchmark workbook not found at ${WORKBOOK_PATH}. Place Benchmark_UnitCost_Seed.xlsx in /uploads.`
    );
  }

  const workbook = xlsx.readFile(WORKBOOK_PATH);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Benchmark workbook has no sheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Unable to read sheet "${sheetName}" from Benchmark workbook.`);
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true }) as unknown[][];
  const records: TemplateRecord[] = [];

  // Skip first 2 rows: row 0 is empty, row 1 is headers
  // Current Excel structure: Category, Item, Quantity, UOM, Price, Source
  for (const row of rows.slice(2)) {
    if (!row || row.length < 2) continue;
    const [categoryNameRaw, itemNameRaw, quantityRaw, uomRaw, valueRaw, sourceRaw] = row;
    const originalCategory = typeof categoryNameRaw === 'string' ? categoryNameRaw.trim() : '';
    const mappedCategory = CATEGORY_ALIAS[originalCategory] ?? originalCategory;
    const categoryName = mappedCategory.trim();
    const itemName = typeof itemNameRaw === 'string' ? itemNameRaw.trim() : '';

    // Skip rows with missing critical data (category or item name)
    if (!categoryName || !itemName) continue;

    const typicalMidValue = cleanNumber(valueRaw);
    const normalizedUom = normalizeUom(uomRaw);
    let quantity = cleanNumber(quantityRaw);

    // Use Source column if available, otherwise fall back to default
    const source = sourceRaw && typeof sourceRaw === 'string' && sourceRaw.trim()
      ? sourceRaw.trim()
      : DEFAULT_SOURCE;

    if (quantity === 0) {
      quantity = null;
    }

    records.push({
      categoryName,
      itemName,
      normalizedUom: normalizedUom || 'EA',
      quantity,
      typicalMidValue,
      source
    });
  }

  return records;
}

async function fetchCategoryMap(
  sql: ReturnType<typeof neon>,
  categoryNames: string[]
): Promise<Map<string, number>> {
  if (categoryNames.length === 0) return new Map();

  const rows: Array<{ category_id: number; category_name: string }> = await sql`
    SELECT category_id, category_name
    FROM landscape.core_unit_cost_category
    WHERE cost_scope = 'development'
      AND category_name = ANY(${categoryNames})
  `;

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.category_name, Number(row.category_id));
  }
  return map;
}

async function seedTemplates() {
  const records = await loadWorkbook();
  if (records.length === 0) {
    console.warn('⚠️  Benchmark workbook contained no eligible rows.');
    return;
  }

  const databaseUrl = loadDatabaseUrl();
  const sql = neon(databaseUrl);

  const categoryNames = Array.from(new Set(records.map((record) => record.categoryName)));
  const categoryMap = await fetchCategoryMap(sql, categoryNames);

  const missing = categoryNames.filter((name) => !categoryMap.has(name));
  if (missing.length > 0) {
    console.error(
      `❌ Missing categories in core_unit_cost_category: ${missing.join(', ')}. Seed or create them before running this script.`
    );
    process.exit(1);
  }

  let inserted = 0;
  let updated = 0;

  for (const record of records) {
    const categoryId = categoryMap.get(record.categoryName);
    if (!categoryId) continue;

    const upsertResult: Array<{ inserted: boolean }> = await sql`
      INSERT INTO landscape.core_unit_cost_template (
        category_id,
        item_name,
        default_uom_code,
        quantity,
        typical_mid_value,
        market_geography,
        source,
        as_of_date,
        project_type_code,
        usage_count,
        created_from_project_id,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        ${categoryId},
        ${record.itemName},
        ${record.normalizedUom},
        ${record.quantity},
        ${record.typicalMidValue},
        ${DEFAULT_LOCATION},
        ${record.source},
        ${DEFAULT_AS_OF_DATE},
        ${DEFAULT_PROJECT_TYPE},
        0,
        NULL,
        TRUE,
        NOW(),
        NOW()
      )
      ON CONFLICT (category_id, item_name, default_uom_code, project_type_code, market_geography)
      DO UPDATE SET
        typical_mid_value = EXCLUDED.typical_mid_value,
        quantity = EXCLUDED.quantity,
        default_uom_code = EXCLUDED.default_uom_code,
        source = EXCLUDED.source,
        as_of_date = EXCLUDED.as_of_date,
        usage_count = EXCLUDED.usage_count,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted;
    `;

    const [{ inserted: wasInserted } = { inserted: false }] = upsertResult;
    if (wasInserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  console.log(
    `✅ Benchmark unit cost templates processed: ${inserted} inserted, ${updated} updated (total ${records.length}).`
  );
}

seedTemplates().catch((error) => {
  console.error('❌ Failed to seed benchmark unit cost templates:', error);
  process.exit(1);
});
