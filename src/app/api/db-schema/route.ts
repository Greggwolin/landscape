// app/api/db-schema/route.ts
import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET(request: Request) {
  // Restrict schema introspection to development and admin environments
  if (process.env.NODE_ENV === 'production' && process.env.ADMIN_ACCESS !== 'true') {
    return NextResponse.json({ error: 'Schema introspection disabled in production' }, { status: 403 });
  }
  
  try {
    const { searchParams } = new URL(request.url)
    const schema = searchParams.get('schema') ?? 'landscape'

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${schema} AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const columns = await sql`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = ${schema}
      ORDER BY table_name, ordinal_position;
    `;

    const fks = await sql`
      SELECT 
        tc.table_name AS table_name,
        kcu.column_name AS column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = ${schema}
      ORDER BY tc.table_name, kcu.column_name;
    `;

    interface TableInfo {
      columns: { name: string; type: string; nullable: boolean; position: number }[];
      foreignKeys: { column: string; references: { table: string; column: string } }[];
    }

    interface Column {
      table_name: string;
      column_name: string;
      data_type: string;
      udt_name?: string;
      is_nullable: string;
      ordinal_position: number;
    }

    interface ForeignKey {
      table_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }

    const byTable: Record<string, TableInfo> = Object.fromEntries(
      (tables as unknown as { table_name: string }[]).map((t) => [t.table_name, { columns: [], foreignKeys: [] }])
    );

    for (const c of columns as Column[]) {
      if (!byTable[c.table_name]) byTable[c.table_name] = { columns: [], foreignKeys: [] };
      // Expand user-defined enum types to include the udt_name
      const typeOut = c.data_type === 'USER-DEFINED' && c.udt_name ? c.udt_name : c.data_type
      byTable[c.table_name].columns.push({
        name: c.column_name,
        type: typeOut,
        nullable: c.is_nullable === 'YES',
        position: c.ordinal_position,
      });
    }

    for (const fk of fks as ForeignKey[]) {
      if (!byTable[fk.table_name]) byTable[fk.table_name] = { columns: [], foreignKeys: [] };
      byTable[fk.table_name].foreignKeys.push({
        column: fk.column_name,
        references: {
          table: fk.foreign_table_name,
          column: fk.foreign_column_name,
        },
      });
    }

    return NextResponse.json({ schema, tables: byTable });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Schema introspection error:', error);
    return NextResponse.json({ error: 'Failed to introspect DB schema', details: message }, { status: 500 });
  }
}
