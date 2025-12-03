import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  params: Promise<{
    projectId: string;
  }>;
};

type InflationSelection = {
  set_id: number;
  set_name: string;
  current_rate: number | null;
  is_global: boolean;
};

type SettingsRow = {
  project_id: number;
  cost_inflation_set_id: number | null;
  price_inflation_set_id: number | null;
};

async function buildResponse(projectId: number) {
  await ensureInflationColumns();
  const [settingsRow, availableSets] = await Promise.all([
    sql<SettingsRow[]>`
      SELECT project_id, cost_inflation_set_id, price_inflation_set_id
      FROM landscape.tbl_project_settings
      WHERE project_id = ${projectId}::bigint
      LIMIT 1
    `,
    fetchAvailableSets(),
  ]);

  const settings = settingsRow[0];
  const costId = settings?.cost_inflation_set_id !== undefined && settings?.cost_inflation_set_id !== null
    ? Number(settings.cost_inflation_set_id)
    : null;
  const priceId = settings?.price_inflation_set_id !== undefined && settings?.price_inflation_set_id !== null
    ? Number(settings.price_inflation_set_id)
    : null;

  const costSelection = availableSets.find((s) => s.set_id === costId) || null;
  const priceSelection = availableSets.find((s) => s.set_id === priceId) || null;

  return {
    cost_inflation: costSelection
      ? {
          set_id: costSelection.set_id,
          set_name: costSelection.set_name,
          current_rate: costSelection.current_rate,
        }
      : { set_id: null, set_name: null, current_rate: null },
    price_inflation: priceSelection
      ? {
          set_id: priceSelection.set_id,
          set_name: priceSelection.set_name,
          current_rate: priceSelection.current_rate,
        }
      : { set_id: null, set_name: null, current_rate: null },
    available_sets: availableSets,
  };
}

async function ensureInflationColumns() {
  // Defensive: add columns if migration hasn't been applied yet
  await sql`
    ALTER TABLE landscape.tbl_project_settings
      ADD COLUMN IF NOT EXISTS cost_inflation_set_id BIGINT NULL,
      ADD COLUMN IF NOT EXISTS price_inflation_set_id BIGINT NULL;
  `;
}

const parseRate = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(num) ? num : null;
};

async function fetchAvailableSets(): Promise<InflationSelection[]> {
  const rows = await sql<InflationSelection[]>`
    SELECT
      s.set_id,
      s.set_name,
      s.is_global,
      CASE
        WHEN COUNT(st.step_id) = 1 THEN MAX(st.rate)
        ELSE MAX(CASE WHEN st.step_number = 1 THEN st.rate END)
      END AS current_rate
    FROM landscape.core_fin_growth_rate_sets s
    LEFT JOIN landscape.core_fin_growth_rate_steps st ON st.set_id = s.set_id
    WHERE s.is_global = true
    GROUP BY s.set_id, s.set_name, s.is_global
    ORDER BY s.set_name ASC
  `;

  return rows.map((row) => ({
    ...row,
    current_rate: parseRate(row.current_rate),
  }));
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const id = Number(projectId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }

  try {
    const response = await buildResponse(id);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to load inflation settings', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load inflation settings', details: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { projectId } = await params;
  const id = Number(projectId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const costId = body?.cost_inflation_set_id ?? null;
    const priceId = body?.price_inflation_set_id ?? null;
    console.log('[inflation-settings] PUT payload', { projectId: id, costId, priceId });

    await ensureInflationColumns();

    const upsertResult = await sql<SettingsRow[]>`
      INSERT INTO landscape.tbl_project_settings (
        project_id,
        cost_inflation_set_id,
        price_inflation_set_id,
        created_at,
        updated_at
      ) VALUES (
        ${id},
        ${costId},
        ${priceId},
        NOW(),
        NOW()
      )
      ON CONFLICT (project_id)
      DO UPDATE SET
        cost_inflation_set_id = EXCLUDED.cost_inflation_set_id,
        price_inflation_set_id = EXCLUDED.price_inflation_set_id,
        updated_at = NOW()
    RETURNING project_id, cost_inflation_set_id, price_inflation_set_id;
    `;

    const appliedSettings: SettingsRow | undefined = upsertResult[0] ?? {
      project_id: id,
      cost_inflation_set_id: costId,
      price_inflation_set_id: priceId,
    };

    const costAppliedId = appliedSettings.cost_inflation_set_id !== null && appliedSettings.cost_inflation_set_id !== undefined
      ? Number(appliedSettings.cost_inflation_set_id)
      : null;
    const priceAppliedId = appliedSettings.price_inflation_set_id !== null && appliedSettings.price_inflation_set_id !== undefined
      ? Number(appliedSettings.price_inflation_set_id)
      : null;

    const availableSets = await fetchAvailableSets();
    const costSelection = availableSets.find((s) => s.set_id === costAppliedId) || null;
    const priceSelection = availableSets.find((s) => s.set_id === priceAppliedId) || null;

    const response = {
      cost_inflation: costSelection
        ? {
            set_id: costSelection.set_id,
            set_name: costSelection.set_name,
            current_rate: costSelection.current_rate,
          }
        : { set_id: null, set_name: null, current_rate: null },
      price_inflation: priceSelection
        ? {
            set_id: priceSelection.set_id,
            set_name: priceSelection.set_name,
            current_rate: priceSelection.current_rate,
          }
        : { set_id: null, set_name: null, current_rate: null },
      available_sets: availableSets,
    };

    console.log('[inflation-settings] PUT response preview', response.cost_inflation, response.price_inflation);
    return NextResponse.json({ success: true, ...response });
  } catch (error) {
    console.error('Failed to update inflation settings', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update inflation settings', details: message },
      { status: 500 }
    );
  }
}
