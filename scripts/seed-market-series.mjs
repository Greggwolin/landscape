#!/usr/bin/env node

/**
 * Seed the market_series catalog from seed/market_series_v1.csv
 * and populate template alias rows for external providers.
 */

import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set. Set it in the environment or .env.local before running this script.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

/**
 * Minimal CSV parser that respects quoted fields.
 */
function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values = splitCsvLine(line);
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] !== undefined ? values[idx] : '';
    });
    records.push(record);
  }

  return records;
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
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);

  return values.map((value) => value.replace(/\\"/g, '"').trim());
}

const ALIAS_TEMPLATES = {
  FHFA_HPI_US_SA: [{ provider: 'FHFA', provider_series_code: 'HPI_US_SA' }],
  FHFA_HPI_US_NSA: [{ provider: 'FHFA', provider_series_code: 'HPI_US_NSA' }],
  FHFA_HPI_STATE_SA: [{ provider: 'FHFA', provider_series_code: 'HPI_STATE_{STATE_FIPS}_SA' }],
  FHFA_HPI_STATE_NSA: [{ provider: 'FHFA', provider_series_code: 'HPI_STATE_{STATE_FIPS}_NSA' }],
  FHFA_HPI_MSA_SA: [{ provider: 'FHFA', provider_series_code: 'HPI_MSA_{CBSA}_SA' }],
  FHFA_HPI_MSA_NSA: [{ provider: 'FHFA', provider_series_code: 'HPI_MSA_{CBSA}_NSA' }],
  CES_STATE_TOTAL: [{ provider: 'FRED', provider_series_code: 'SMU{STATE_FIPS}00000000001' }],
  CES_SUPERSECTOR: [{ provider: 'FRED', provider_series_code: 'SMU{STATE_FIPS}{SUPERSECTOR}' }],
  LAUS_STATE_UNRATE: [{ provider: 'BLS', provider_series_code: 'LASST{STATE_FIPS}0000000003' }],
  LAUS_MSA_UNRATE: [{ provider: 'BLS', provider_series_code: 'LAUMT{STATE_FIPS}{AREA_CODE}0000000003' }],
  LAUS_PLACE_UNRATE: [{ provider: 'BLS', provider_series_code: 'LAUCN{STATE_FIPS}{PLACE_CODE}0000000003' }],
  LAUS_PLACE_EMPLOYED: [{ provider: 'BLS', provider_series_code: 'LAUCN{STATE_FIPS}{PLACE_CODE}0000000005' }],
  PERMIT_PLACE_TOTAL: [{ provider: 'CENSUS_BPS', provider_series_code: 'BP_{STATE_FIPS}_{PLACE_FIPS}_TOTAL' }],
  PERMIT_PLACE_1UNIT: [{ provider: 'CENSUS_BPS', provider_series_code: 'BP_{STATE_FIPS}_{PLACE_FIPS}_1U' }],
  PERMIT_PLACE_5PLUS: [{ provider: 'CENSUS_BPS', provider_series_code: 'BP_{STATE_FIPS}_{PLACE_FIPS}_5P' }]
};

async function seedSeries() {
  const csvPath = join(projectRoot, 'seed', 'market_series_v1.csv');
  const csvContent = readFileSync(csvPath, 'utf8');
  const records = parseCsv(csvContent);

  console.log(`Loaded ${records.length} series definitions from ${csvPath}`);

  for (const record of records) {
    const {
      series_code,
      series_name,
      category,
      subcategory,
      units,
      frequency,
      seasonal,
      source,
      coverage_level,
      notes
    } = record;

    if (!series_code || !series_name) {
      console.warn(`Skipping row with missing series_code or series_name:`, record);
      continue;
    }

    const seasonalValue = seasonal ? seasonal : null;
    const subcategoryValue = subcategory ? subcategory : null;
    const unitsValue = units ? units : null;
    const frequencyValue = frequency ? frequency : null;
    const notesValue = notes ? notes : null;

    const upsertResult = await sql`
      INSERT INTO public.market_series (
        series_code,
        series_name,
        category,
        subcategory,
        units,
        frequency,
        seasonal,
        source,
        coverage_level,
        notes
      )
      VALUES (
        ${series_code},
        ${series_name},
        ${category},
        ${subcategoryValue},
        ${unitsValue},
        ${frequencyValue},
        ${seasonalValue},
        ${source},
        ${coverage_level},
        ${notesValue}
      )
      ON CONFLICT (series_code, seasonal)
      DO UPDATE SET
        series_name = EXCLUDED.series_name,
        category = EXCLUDED.category,
        subcategory = EXCLUDED.subcategory,
        units = EXCLUDED.units,
        frequency = EXCLUDED.frequency,
        source = EXCLUDED.source,
        coverage_level = EXCLUDED.coverage_level,
        notes = EXCLUDED.notes,
        is_active = TRUE
      RETURNING series_id
    `;

    const { series_id } = upsertResult[0];
    console.log(`Upserted ${series_code} (id=${series_id})`);

    const aliases = ALIAS_TEMPLATES[series_code] ?? [];
    for (const alias of aliases) {
      await sql`
        INSERT INTO public.series_alias (series_id, provider, provider_series_code)
        VALUES (${series_id}, ${alias.provider}, ${alias.provider_series_code})
        ON CONFLICT (series_id, provider)
        DO UPDATE SET provider_series_code = EXCLUDED.provider_series_code
      `;
    }
  }

  console.log('market_series seeding complete.');
}

seedSeries().catch((error) => {
  console.error('❌ Failed to seed market_series catalog:', error);
  process.exit(1);
});
