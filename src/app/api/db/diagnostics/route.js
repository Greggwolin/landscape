export const runtime = 'edge';

// Import from TypeScript file (Next.js handles the compilation):
import { sql } from '../../../../lib/db';

export async function GET() {
  try {
    const meta = await sql`
      SELECT current_database() AS current_database,
             current_user      AS current_user,
             current_setting('server_version') AS server_version,
             current_setting('search_path')    AS search_path
    `;

    const tables = await sql`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'landscape'
      ORDER BY table_name
    `;

    let parcelCount = null;
    let parcelCountError = null;
    try {
      const r = await sql`SELECT COUNT(*)::text AS count FROM landscape.tbl_parcel`;
      parcelCount = Number(r?.[0]?.count ?? 0);
    } catch (e) {
      parcelCountError = e?.message || String(e);
    }

    return new Response(
      JSON.stringify({
        meta: meta?.[0] || null,
        landscapeTables: tables,
        parcelCount,
        parcelCountError,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || 'diagnostics failed' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
