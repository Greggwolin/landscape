#!/usr/bin/env tsx

/**
 * Seed the Red Valley Ranch unit cost templates into the global library.
 *
 * Usage:
 *   npm run seed:unitcosts:redvalley
 *
 * Requirements:
 *   - DATABASE_URL must be set (e.g., via .env.local)
 *   - Migration 014 must be applied
 */

import { readFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

type RawRecord = Record<string, string>;

interface UnitCostRecord {
  categoryName: string;
  itemName: string;
  defaultUom: string;
  quantity: number | null;
  typicalMidValue: number | null;
  marketGeography: string;
  source: string;
  asOfDate: string;
  projectTypeCode: string;
  usageCount: number;
  createdFromProjectId: number | null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env.local') });

const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set. Configure it in the environment or .env.local.');
  process.exit(1);
}

const sql = neon(databaseUrl);

function parseCsv(content: string): RawRecord[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = splitCsvLine(lines[0]);
  const records: RawRecord[] = [];

  for (let idx = 1; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (!line.trim()) continue;
    const values = splitCsvLine(line);
    const record: RawRecord = {};
    headers.forEach((header, headerIdx) => {
      record[header] = values[headerIdx] ?? '';
    });
    records.push(record);
  }

  return records;
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i - 1] !== '\\') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current.trim());

  return values.map((value) => value.replace(/\\"/g, '"'));
}

function normalizeUom(value: string): string {
  const normalized = value.trim();
  if (!normalized) return normalized;

  const upper = normalized.toUpperCase().replace(/\./g, '');
  switch (upper) {
    case 'DAY':
    case 'DAYS':
      return 'DAY';
    case 'WK':
    case 'WEEK':
      return 'WK';
    case 'MONTH':
    case 'MO':
      return 'MO';
    case 'YEAR':
    case 'YR':
      return 'YR';
    case 'PCT':
    case 'PERCENT':
    case '%':
      return '%';
    default:
      return upper;
  }
}

function parseNumeric(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function hydrateRecord(raw: RawRecord): UnitCostRecord {
  return {
    categoryName: raw.category_name?.trim() ?? '',
    itemName: raw.item_name?.trim() ?? '',
    defaultUom: normalizeUom(raw.default_uom ?? ''),
    quantity: parseNumeric(raw.quantity ?? ''),
    typicalMidValue: parseNumeric(raw.typical_mid ?? ''),
    marketGeography: 'Maricopa, AZ',
    source: 'Copper Nail Development',
    asOfDate: '2024-10-01',
    projectTypeCode: (raw.project_type_code ?? '').trim().toUpperCase() || 'LAND',
    usageCount: 0,
    createdFromProjectId: parseInteger(raw.created_from_project_id ?? '')
  };
}

async function loadCsvRecords(): Promise<UnitCostRecord[]> {
  const csvPath = join(projectRoot, 'data', 'red_valley_unit_costs.csv');
  const csvContent = await readFile(csvPath, 'utf8');
  const parsed = parseCsv(csvContent);

  const hydrated = parsed
    .map(hydrateRecord)
    .filter((record) => record.categoryName && record.itemName && record.defaultUom);

  if (hydrated.length === 0) {
    console.warn('⚠️  No valid records found in red_valley_unit_costs.csv');
  }

  return hydrated;
}

async function fetchCategoryMap(categoryNames: string[]): Promise<Map<string, number>> {
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

async function seedTemplates(): Promise<void> {
  const records = await loadCsvRecords();
  if (records.length === 0) return;

  const categoryNames = Array.from(new Set(records.map((record) => record.categoryName)));
  const categoryMap = await fetchCategoryMap(categoryNames);

  const missingCategories = categoryNames.filter((name) => !categoryMap.has(name));
  if (missingCategories.length > 0) {
    console.error(
      `❌ Missing categories in core_unit_cost_category: ${missingCategories.join(', ')}. Run migration 014 first.`
    );
    process.exit(1);
  }

  let inserted = 0;
  let updated = 0;

  for (const record of records) {
    const categoryId = categoryMap.get(record.categoryName);
    if (!categoryId) continue;

    const upsertResult: Array<{ template_id: number; inserted: boolean }> = await sql`
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
        created_from_project_id
      )
      VALUES (
        ${categoryId},
        ${record.itemName},
        ${record.defaultUom},
        ${record.quantity},
        ${record.typicalMidValue},
        ${record.marketGeography},
        ${record.source},
        ${record.asOfDate},
        ${record.projectTypeCode},
        ${record.usageCount},
        ${record.createdFromProjectId}
      )
      ON CONFLICT (category_id, item_name, default_uom_code, project_type_code, market_geography)
      DO UPDATE SET
        typical_mid_value = EXCLUDED.typical_mid_value,
        quantity = EXCLUDED.quantity,
        default_uom_code = EXCLUDED.default_uom_code,
        source = EXCLUDED.source,
        as_of_date = EXCLUDED.as_of_date,
        usage_count = EXCLUDED.usage_count,
        created_from_project_id = EXCLUDED.created_from_project_id,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING template_id, (xmax = 0) AS inserted
    `;

    const { inserted: wasInserted } = upsertResult[0] ?? { inserted: false };
    if (wasInserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  console.log(
    `✅ Red Valley unit cost templates processed: ${inserted} inserted, ${updated} updated (total ${records.length}).`
  );
}

seedTemplates()
  .catch((error) => {
    console.error('❌ Failed to seed Red Valley unit cost templates:', error);
    process.exit(1);
  })
  .finally(() => {
    // neon serverless does not expose an explicit close; allow process to exit naturally.
  });
