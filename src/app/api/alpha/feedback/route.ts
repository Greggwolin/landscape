import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = {
      page_context: body.page_context,
      project_id: body.project_id,
      feedback: body.feedback,
      submitted_at: body.submitted_at || new Date().toISOString(),
    };

    const response = await fetch(`${DJANGO_API_URL}/api/alpha/feedback/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Backend feedback request failed');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting alpha feedback:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
