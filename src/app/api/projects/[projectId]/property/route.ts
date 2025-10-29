import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/projects/[projectId]/property
 * Resolve the primary CRE property associated with the given project.
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = Number(params.projectId);

    if (!Number.isInteger(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const properties = await sql<Array<{
      cre_property_id: number;
      property_name: string | null;
      property_type: string | null;
    }>>`
      SELECT
        cre_property_id,
        property_name,
        property_type
      FROM landscape.tbl_cre_property
      WHERE project_id = ${projectId}
      ORDER BY cre_property_id ASC
    `;

    if (properties.length === 0) {
      return NextResponse.json(
        { error: 'No property linked to this project', project_id: projectId },
        { status: 404 }
      );
    }

    const primaryProperty = properties[0];

    return NextResponse.json({
      project_id: projectId,
      property_id: primaryProperty.cre_property_id,
      property_name: primaryProperty.property_name,
      property_type: primaryProperty.property_type,
      property_ids: properties.map((row) => ({
        property_id: row.cre_property_id,
        property_name: row.property_name,
        property_type: row.property_type,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch property for project:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch property ID',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
