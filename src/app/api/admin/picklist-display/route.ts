import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type DisplayConfigRow = {
  config_id: number;
  list_code: string;
  context: string;
  display_format: string;
  created_at: string;
  updated_at: string;
};

/**
 * GET /api/admin/picklist-display?list_code=property_type
 * Fetch display configs for a picklist
 */
export async function GET(request: NextRequest) {
  try {
    const listCode = request.nextUrl.searchParams.get('list_code');

    if (!listCode) {
      // Return all configs grouped by list_code
      const rows = await sql<DisplayConfigRow[]>`
        SELECT *
        FROM landscape.lu_picklist_display_config
        ORDER BY list_code, context;
      `;

      // Group by list_code
      const grouped: Record<string, Record<string, string>> = {};
      for (const row of rows) {
        if (!grouped[row.list_code]) {
          grouped[row.list_code] = {};
        }
        grouped[row.list_code][row.context] = row.display_format;
      }

      return NextResponse.json({ configs: grouped });
    }

    // Return configs for specific list_code
    const rows = await sql<DisplayConfigRow[]>`
      SELECT *
      FROM landscape.lu_picklist_display_config
      WHERE list_code = ${listCode}
      ORDER BY context;
    `;

    const configs: Record<string, string> = {};
    for (const row of rows) {
      configs[row.context] = row.display_format;
    }

    return NextResponse.json({ list_code: listCode, configs });
  } catch (err) {
    console.error('picklist-display GET error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Failed to load display configs', details: message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/picklist-display
 * Update display format for a context
 * Body: { list_code, context, display_format }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { list_code, context, display_format } = body;

    if (!list_code || !context || !display_format) {
      return NextResponse.json(
        { error: 'list_code, context, and display_format are required' },
        { status: 400 }
      );
    }

    // Validate display_format
    const validFormats = ['code', 'name', 'code_name', 'name_code'];
    if (!validFormats.includes(display_format)) {
      return NextResponse.json(
        { error: `Invalid display_format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate context
    const validContexts = ['dropdown', 'grid', 'report', 'export'];
    if (!validContexts.includes(context)) {
      return NextResponse.json(
        { error: `Invalid context. Must be one of: ${validContexts.join(', ')}` },
        { status: 400 }
      );
    }

    // Upsert the config
    const result = await sql`
      INSERT INTO landscape.lu_picklist_display_config (list_code, context, display_format)
      VALUES (${list_code}, ${context}, ${display_format})
      ON CONFLICT (list_code, context)
      DO UPDATE SET
        display_format = EXCLUDED.display_format,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    return NextResponse.json({ config: result[0] });
  } catch (err) {
    console.error('picklist-display PUT error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Failed to update display config', details: message },
      { status: 500 }
    );
  }
}
