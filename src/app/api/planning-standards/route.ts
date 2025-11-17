import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

const mapStandardRow = (row: any) => ({
  standard_id: Number(row.standard_id),
  standard_name: row.standard_name,
  default_planning_efficiency: row.default_planning_efficiency !== null ? Number(row.default_planning_efficiency) : null,
  default_street_row_pct: row.default_street_row_pct !== null ? Number(row.default_street_row_pct) : null,
  default_park_dedication_pct: row.default_park_dedication_pct !== null ? Number(row.default_park_dedication_pct) : null,
  is_active: Boolean(row.is_active),
  created_at: row.created_at,
  updated_at: row.updated_at
});

async function fetchStandardDirect() {
  const result = await sql`
    SELECT * FROM landscape.core_planning_standards
    WHERE is_active = true
    ORDER BY standard_id
    LIMIT 1
  `;
  const row = result[0];
  return row ? mapStandardRow(row) : null;
}

async function ensureStandardId(): Promise<number> {
  const active = await sql`
    SELECT standard_id
    FROM landscape.core_planning_standards
    WHERE is_active = true
    ORDER BY standard_id
    LIMIT 1
  `;
  const activeId = active[0]?.standard_id;
  if (activeId != null) {
    return Number(activeId);
  }

  try {
    const insertResult = await sql`
      INSERT INTO landscape.core_planning_standards (standard_name, default_planning_efficiency, is_active)
      VALUES ('Global Default', 0.75, true)
      RETURNING standard_id
    `;
    const newId = insertResult[0]?.standard_id;
    if (newId != null) {
      return Number(newId);
    }
  } catch (error: any) {
    if (error?.code !== '23505') {
      throw error;
    }
    // fall through to reuse existing record
  }

  const fallback = await sql`
    SELECT standard_id
    FROM landscape.core_planning_standards
    ORDER BY standard_id
    LIMIT 1
  `;
  const fallbackId = fallback[0]?.standard_id;
  if (fallbackId != null) {
    await sql`
      UPDATE landscape.core_planning_standards
      SET is_active = true
      WHERE standard_id = ${fallbackId}
    `;
    return Number(fallbackId);
  }

  throw new Error('NO_STANDARD');
}

export async function GET() {
  if (DJANGO_API_URL) {
    try {
      const response = await fetch(`${DJANGO_API_URL.replace(/\/$/, '')}/api/financial/planning-standards/`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        return NextResponse.json(await response.json());
      }

      const text = await response.text();
      console.error('Failed to fetch planning standards via Django:', response.status, text);
      if (response.status !== 404 && response.status !== 502) {
        return NextResponse.json(
          { error: 'Failed to fetch planning standards', details: text },
          { status: response.status }
        );
      }
    } catch (error) {
      console.warn('Django planning standards endpoint unavailable, using SQL fallback:', error);
    }
  }

  try {
    const standard = await fetchStandardDirect();
    return NextResponse.json({ standard });
  } catch (error) {
    console.error('Direct SQL error fetching planning standards:', error);
    return NextResponse.json(
      {
        error: 'Unexpected error fetching planning standards',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (DJANGO_API_URL) {
    try {
      const response = await fetch(`${DJANGO_API_URL.replace(/\/$/, '')}/api/financial/planning-standards/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const text = await response.text();
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = text;
      }

      if (response.ok) {
        return NextResponse.json(payload ?? {}, { status: response.status });
      }

      console.error('Failed to update planning standards via Django:', response.status, text);
      if (response.status !== 404 && response.status !== 502) {
        return NextResponse.json(
          { error: 'Failed to update planning standards', details: payload },
          { status: response.status }
        );
      }
    } catch (error) {
      console.warn('Django planning standards update unavailable, using SQL fallback:', error);
    }
  }

  const normalized: {
    default_planning_efficiency?: number | null
    default_street_row_pct?: number | null
    default_park_dedication_pct?: number | null
  } = {}

  const updates: string[] = [];
  const values: Array<number | null> = [];

  if ('default_planning_efficiency' in body) {
    const value = Number(body.default_planning_efficiency);
    if (!Number.isFinite(value) || value <= 0 || value > 1.5) {
      return NextResponse.json({ error: 'default_planning_efficiency must be between 0 and 1.5' }, { status: 400 });
    }
    normalized.default_planning_efficiency = value;
    values.push(value);
    updates.push(`default_planning_efficiency = $${values.length}`);
  }

  if ('default_street_row_pct' in body) {
    const value = body.default_street_row_pct === null || body.default_street_row_pct === undefined
      ? null
      : Number(body.default_street_row_pct);
    if (value !== null && !Number.isFinite(value)) {
      return NextResponse.json({ error: 'default_street_row_pct must be numeric' }, { status: 400 });
    }
    normalized.default_street_row_pct = value;
    values.push(value);
    updates.push(`default_street_row_pct = $${values.length}`);
  }

  if ('default_park_dedication_pct' in body) {
    const value = body.default_park_dedication_pct === null || body.default_park_dedication_pct === undefined
      ? null
      : Number(body.default_park_dedication_pct);
    if (value !== null && !Number.isFinite(value)) {
      return NextResponse.json({ error: 'default_park_dedication_pct must be numeric' }, { status: 400 });
    }
    normalized.default_park_dedication_pct = value;
    values.push(value);
    updates.push(`default_park_dedication_pct = $${values.length}`);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    let standardId: number;
    try {
      standardId = await ensureStandardId();
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_STANDARD') {
        const efficiency = normalized.default_planning_efficiency ?? 0.75;
        const street = normalized.default_street_row_pct ?? null;
        const park = normalized.default_park_dedication_pct ?? null;
        const created = await sql`
          INSERT INTO landscape.core_planning_standards (
            standard_name,
            default_planning_efficiency,
            default_street_row_pct,
            default_park_dedication_pct,
            is_active
          )
          VALUES ('Global Default', ${efficiency}, ${street}, ${park}, true)
          RETURNING *
        `;
        const row = created[0];
        if (!row) {
          return NextResponse.json({ error: 'Failed to create planning standard' }, { status: 500 });
        }
        return NextResponse.json({ standard: mapStandardRow(row) });
      }
      throw error;
    }

    values.push(standardId);
    const result = await sql.query(
      `
        UPDATE landscape.core_planning_standards
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE standard_id = $${values.length}
        RETURNING *;
      `,
      values
    );

    const row = result.rows?.[0];
    return NextResponse.json({
      standard: row ? mapStandardRow(row) : { standard_id: standardId }
    });
  } catch (error) {
    console.error('Direct SQL error updating planning standards:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error updating planning standards'
      },
      { status: 500 }
    );
  }
}
