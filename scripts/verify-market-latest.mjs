#!/usr/bin/env node

/**
 * Smoke-test script for the Market Engine core schema.
 *
 * - Ensures market tables exist
 * - Validates vw_market_latest uniqueness for CPI/HPI
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set; aborting.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('geo_xwalk', 'market_series', 'market_data', 'market_fetch_job', 'series_alias')
  `;

  if (tables.length < 5) {
    throw new Error('Required market tables missing. Run 20251008_01_market_core.sql first.');
  }

  const latestRows = await sql`
    SELECT series_code, geo_id, date
    FROM public.vw_market_latest
    WHERE series_code IN ('CPIAUCSL', 'FHFA_HPI_US_SA')
  `;

  const keySet = new Set(latestRows.map((row) => `${row.series_code}:${row.geo_id}`));
  if (keySet.size !== latestRows.length) {
    throw new Error('vw_market_latest contains duplicate series_code/geo_id rows.');
  }

  console.log('vw_market_latest uniqueness check passed for CPI and HPI');
}

main().catch((error) => {
  console.error('Market verification failed:', error);
  process.exit(1);
});
