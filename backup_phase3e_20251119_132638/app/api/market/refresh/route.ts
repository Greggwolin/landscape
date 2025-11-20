import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RefreshBody {
  project_id?: number;
  bundle?: string;
  start?: string;
  end?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RefreshBody;
    const { project_id, bundle, start, end } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const params = {
      project_id,
      bundle: bundle ?? 'macro_v1',
      start,
      end,
      requested_at: new Date().toISOString(),
    };

    const rows = await sql<{
      job_id: number;
      status: string;
    }>`
      INSERT INTO public.market_fetch_job (status, params)
      VALUES ('queued', ${JSON.stringify(params)}::jsonb)
      RETURNING job_id, status
    `;

    return NextResponse.json({
      job_id: rows[0].job_id,
      status: rows[0].status,
    });
  } catch (error) {
    console.error('market/refresh POST error', error);
    return NextResponse.json(
      { error: 'Failed to queue market refresh' },
      { status: 500 },
    );
  }
}
