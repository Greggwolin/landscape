import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const families = await sql`
      SELECT
        family_id as value,
        code,
        name as label,
        active,
        notes
      FROM landscape.lu_family
      WHERE active = true
      ORDER BY code
    `;

    return Response.json(families);
  } catch (error) {
    console.error('Error fetching land use families:', error);
    return Response.json({ error: 'Failed to fetch families' }, { status: 500 });
  }
}
