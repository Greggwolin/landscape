import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const whereClause = query
      ? sql`WHERE title ILIKE ${'%' + query + '%'} OR description ILIKE ${'%' + query + '%'}`
      : sql``;

    const results = await sql`
      SELECT
        id,
        document_key,
        title,
        subtitle,
        edition,
        publisher,
        source_id,
        publication_year,
        page_count,
        knowledge_domain,
        property_types,
        description,
        metadata,
        ingestion_status,
        chunk_count,
        file_path,
        file_hash,
        file_size_bytes,
        created_at,
        updated_at
      FROM landscape.tbl_platform_knowledge
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const countResult = await sql<{ count: number }[]>`
      SELECT COUNT(*) as count
      FROM landscape.tbl_platform_knowledge
      ${whereClause}
    `;

    return NextResponse.json({
      success: true,
      results,
      totalHits: countResult[0]?.count ?? 0,
      pagination: {
        limit,
        offset,
        count: results.length,
        totalHits: countResult[0]?.count ?? 0
      }
    });
  } catch (error) {
    console.error('Platform knowledge fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch platform knowledge' },
      { status: 500 }
    );
  }
}
