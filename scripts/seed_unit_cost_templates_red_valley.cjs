#!/usr/bin/env node

/**
 * Seed the Red Valley Ranch unit cost templates into the global library using
 * the Neon database specified in .env.local (DATABASE_URL).
 *
 * Usage:
 *   node scripts/seed_unit_cost_templates_red_valley.cjs
 */

const { readFile } = require('fs/promises');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env.local') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set. Update .env.local before seeding.');
  process.exit(1);
}

function splitCsvLine(line) {
  const values = [];
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

function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = splitCsvLine(lines[0]);
  const records = [];

  for (let idx = 1; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (!line.trim()) continue;
    const values = splitCsvLine(line);
    const record = {};
    headers.forEach((header, headerIdx) => {
      record[header] = values[headerIdx] ?? '';
    });
    records.push(record);
  }

  return records;
}

function normalizeUom(value) {
  const normalized = (value ?? '').trim();
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

function parseNumeric(value) {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value) {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function hydrateRecord(raw) {
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

async function loadCsvRecords() {
  const csvPath = path.join(projectRoot, 'data', 'red_valley_unit_costs.csv');
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

async function seedTemplates() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const records = await loadCsvRecords();
    if (records.length === 0) {
      console.log('⚠️  Nothing to seed.');
      return;
    }

    const categoryNames = Array.from(new Set(records.map((record) => record.categoryName)));

    const categoryResult = await client.query(
      `
        SELECT category_id, category_name
        FROM landscape.core_unit_cost_category
        WHERE cost_scope = 'development'
          AND category_name = ANY($1)
      `,
      [categoryNames]
    );

    const categoryMap = new Map();
    for (const row of categoryResult.rows) {
      categoryMap.set(row.category_name, Number(row.category_id));
    }

    const missingCategories = categoryNames.filter((name) => !categoryMap.has(name));
    if (missingCategories.length > 0) {
      console.error(
        `❌ Missing categories in core_unit_cost_category: ${missingCategories.join(', ')}.`
      );
      process.exit(1);
    }

    const insertText = `
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
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11
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
      RETURNING (xmax = 0) AS inserted
    `;

    let inserted = 0;
    let updated = 0;

    for (const record of records) {
      const categoryId = categoryMap.get(record.categoryName);
      if (!categoryId) continue;

      const values = [
        categoryId,
        record.itemName,
        record.defaultUom,
        record.quantity,
        record.typicalMidValue,
        record.marketGeography,
        record.source,
        record.asOfDate,
        record.projectTypeCode,
        record.usageCount,
        record.createdFromProjectId
      ];

      const { rows } = await client.query(insertText, values);
      const wasInserted = rows[0]?.inserted ?? false;
      if (wasInserted) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    console.log(
      `✅ Red Valley unit cost templates processed: ${inserted} inserted, ${updated} updated (total ${records.length}).`
    );
  } finally {
    await client.end();
  }
}

seedTemplates().catch((error) => {
  console.error('❌ Failed to seed Red Valley unit cost templates:', error);
  process.exit(1);
});
