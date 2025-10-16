import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('family_id');

    let types;
    if (familyId) {
      // Filter by family
      types = await sql`
        SELECT
          type_id as value,
          family_id,
          code,
          name as label,
          active,
          notes
        FROM landscape.lu_type
        WHERE family_id = ${familyId} AND active = true
        ORDER BY ord
      `;
    } else {
      // Return all types
      types = await sql`
        SELECT
          type_id as value,
          family_id,
          code,
          name as label,
          active,
          notes
        FROM landscape.lu_type
        WHERE active = true
        ORDER BY ord
      `;
    }

    return Response.json(types);
  } catch (error) {
    console.error('Error fetching land use types:', error);
    return Response.json({ error: 'Failed to fetch types' }, { status: 500 });
  }
}
