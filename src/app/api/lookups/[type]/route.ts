import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type LookupConfig = {
  picklistType: string;
  parentType?: string;
};

const TYPE_MAP: Record<string, LookupConfig> = {
  'phase-status': { picklistType: 'PHASE_STATUS' },
  'ownership-types': { picklistType: 'OWNERSHIP_TYPE' },
  'property-types': { picklistType: 'PROPERTY_TYPE' },
  'property-subtypes': { picklistType: 'PROPERTY_SUBTYPE', parentType: 'PROPERTY_TYPE' },
  'property-classes': { picklistType: 'PROPERTY_CLASS' },
  'lease-statuses': { picklistType: 'LEASE_STATUS' },
  'lease-types': { picklistType: 'LEASE_TYPE' },
  'inflation-types': { picklistType: 'INFLATION_TYPE' },
  'analysis-types': { picklistType: 'ANALYSIS_TYPE' }
};

export async function GET(request: NextRequest, { params }: { params: { type: string } }) {
  try {
    const slug = params.type;
    const config = TYPE_MAP[slug];
    if (!config) {
      return NextResponse.json({ error: 'Unsupported picklist type' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const parentCode = searchParams.get('parent');

    if (parentCode && !config.parentType) {
      return NextResponse.json({ error: 'Parent filter is not supported for this picklist' }, { status: 400 });
    }

    const rows = parentCode
      ? await sql`
        SELECT
          child.code AS value,
          child.name AS label,
          child.parent_id
        FROM landscape.tbl_system_picklist child
        INNER JOIN landscape.tbl_system_picklist parent
          ON child.parent_id = parent.picklist_id
        WHERE child.picklist_type = ${config.picklistType}
          AND parent.picklist_type = ${config.parentType}
          AND parent.code = ${parentCode.toUpperCase()}
          AND child.is_active = TRUE
        ORDER BY child.sort_order, child.name;
      `
      : await sql`
        SELECT
          code AS value,
          name AS label,
          parent_id
        FROM landscape.tbl_system_picklist
        WHERE picklist_type = ${config.picklistType}
          AND is_active = TRUE
        ORDER BY sort_order, name;
      `;

    return NextResponse.json({ options: rows });
  } catch (err) {
    console.error('lookups picklists GET error', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to load picklist options', details: message }, { status: 500 });
  }
}
