import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// POST /api/glossary/zoning/migrate
// Creates land_v2 schema, enum, table, indexes, and triggers idempotently.
export async function POST() {
  if (process.env.NODE_ENV === 'production' && process.env.ADMIN_ACCESS !== 'true') {
    return NextResponse.json({ error: 'Migrations disabled in production' }, { status: 403 })
  }

  try {
    // Create schema
    await sql`CREATE SCHEMA IF NOT EXISTS land_v2`;

    // Create enum type if it doesn't exist in land_v2
    const enumExists = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'code_token_kind_t' AND n.nspname = 'land_v2'
      ) AS exists
    `

    if ((enumExists as unknown as { exists: boolean }[])[0]?.exists !== true) {
      await sql`CREATE TYPE land_v2.code_token_kind_t AS ENUM ('published','placeholder','numeric','mixed')`;
    }

    // Table creation
    await sql`
      CREATE TABLE IF NOT EXISTS land_v2.glossary_zoning (
        family_name TEXT,
        jurisdiction_city TEXT NOT NULL,
        jurisdiction_county TEXT,
        jurisdiction_state TEXT NOT NULL,
        jurisdiction_display TEXT NOT NULL,
        local_code_raw TEXT NOT NULL,
        local_code_canonical TEXT NOT NULL,
        code_token_kind land_v2.code_token_kind_t NOT NULL,
        code_token_confidence NUMERIC NOT NULL,
        mapped_use TEXT NOT NULL,
        allowance CHAR(1) NOT NULL CHECK (allowance IN ('P','C','X')),
        purpose_text TEXT NOT NULL,
        intent_text TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT glossary_zoning_pkey PRIMARY KEY (jurisdiction_display, local_code_raw)
      )
    `

    // Backfill columns for older installs where table exists without new fields
    await sql`ALTER TABLE land_v2.glossary_zoning ADD COLUMN IF NOT EXISTS code_token_kind land_v2.code_token_kind_t NOT NULL DEFAULT 'placeholder'`
    await sql`ALTER TABLE land_v2.glossary_zoning ADD COLUMN IF NOT EXISTS code_token_confidence NUMERIC NOT NULL DEFAULT 1`
    // Keep defaults to ensure future inserts without explicit values remain valid

    // Helpful indexes for filtering
    await sql`CREATE INDEX IF NOT EXISTS idx_glossary_zoning_city ON land_v2.glossary_zoning (jurisdiction_city)`
    await sql`CREATE INDEX IF NOT EXISTS idx_glossary_zoning_state ON land_v2.glossary_zoning (jurisdiction_state)`
    await sql`CREATE INDEX IF NOT EXISTS idx_glossary_zoning_family ON land_v2.glossary_zoning (family_name)`

    // Trigger function to maintain updated_at
    await sql`
      CREATE OR REPLACE FUNCTION land_v2.set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at := NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `

    // Attach trigger
    const trgExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_glossary_zoning_updated_at'
      ) AS exists
    `
    if ((trgExists as unknown as { exists: boolean }[])[0]?.exists !== true) {
      await sql`
        CREATE TRIGGER trg_glossary_zoning_updated_at
        BEFORE UPDATE ON land_v2.glossary_zoning
        FOR EACH ROW EXECUTE FUNCTION land_v2.set_updated_at()
      `
    }

    // Add CHECK constraints idempotently for mapped_use
    const hasLenChk = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE c.conname = 'glossary_zoning_mapped_use_len_chk' AND n.nspname = 'land_v2'
      ) AS exists
    `
    if ((hasLenChk as unknown as { exists: boolean }[])[0]?.exists !== true) {
      await sql`ALTER TABLE land_v2.glossary_zoning ADD CONSTRAINT glossary_zoning_mapped_use_len_chk CHECK (char_length(mapped_use) <= 8)`
    }

    const hasUpperChk = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE c.conname = 'glossary_zoning_mapped_use_upper_chk' AND n.nspname = 'land_v2'
      ) AS exists
    `
    if ((hasUpperChk as unknown as { exists: boolean }[])[0]?.exists !== true) {
      await sql`ALTER TABLE land_v2.glossary_zoning ADD CONSTRAINT glossary_zoning_mapped_use_upper_chk CHECK (mapped_use = UPPER(mapped_use))`
    }

    return NextResponse.json({ status: 'ok', message: 'land_v2.glossary_zoning ready' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed', details: message }, { status: 500 })
  }
}
