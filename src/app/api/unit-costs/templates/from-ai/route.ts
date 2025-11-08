import { NextRequest, NextResponse } from 'next/server';
import { insertTemplateDirect } from '../helpers';
import { sql } from '@/lib/db';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (DJANGO_API_URL) {
    try {
      const response = await fetch(
        `${DJANGO_API_URL.replace(/\/$/, '')}/api/financial/unit-costs/templates/from-ai/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const text = await response.text();
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = text;
      }

      if (response.ok) {
        return NextResponse.json(payload ?? {}, { status: response.status });
      }

      console.error('Failed to accept AI template via Django:', response.status, text);
      if (response.status !== 404 && response.status !== 502) {
        return NextResponse.json(
          { error: 'Failed to accept AI template suggestion', details: payload },
          { status: response.status }
        );
      }
    } catch (error) {
      console.warn('Django AI template endpoint unavailable, using SQL fallback:', error);
    }
  }

  try {
    const suggestionId = (body as any)?.suggestion_id ?? (body as any)?.suggestionId ?? null;
    const payload = { ...body, created_from_ai: true } as Record<string, unknown>;
    const created = await insertTemplateDirect(payload);

    if (suggestionId) {
      try {
        await sql.query(
          `
            UPDATE landscape.tbl_benchmark_ai_suggestions
            SET status = 'accepted', reviewed_at = NOW(), created_benchmark_id = $2
            WHERE suggestion_id = $1
          `,
          [suggestionId, created.template_id]
        );
      } catch (error) {
        console.warn('Failed to update AI suggestion status:', error);
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Direct SQL error accepting AI template suggestion:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error accepting AI suggestion'
      },
      { status: 500 }
    );
  }
}
