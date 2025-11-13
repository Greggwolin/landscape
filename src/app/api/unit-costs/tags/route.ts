import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

// GET - Fetch all tags
export async function GET(request: NextRequest) {
  if (!DJANGO_API_URL) {
    console.warn('Django API not configured, returning empty tags array');
    return NextResponse.json({ tags: [] });
  }

  try {
    const url = `${DJANGO_API_URL.replace(/\/$/, '')}/api/unit-costs/tags/`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.warn('Failed to fetch tags from Django:', response.status, response.statusText);
      // Return empty array instead of error to allow UI to load
      return NextResponse.json({ tags: [] });
    }

    const data = await response.json();
    // Ensure we always return tags array
    if (Array.isArray(data)) {
      return NextResponse.json({ tags: data });
    } else if (data.tags && Array.isArray(data.tags)) {
      return NextResponse.json({ tags: data.tags });
    } else {
      return NextResponse.json({ tags: [] });
    }
  } catch (error) {
    console.error('Error fetching tags:', error);
    // Return empty array instead of error to allow UI to load
    return NextResponse.json({ tags: [] });
  }
}

// POST - Create new tag
export async function POST(request: NextRequest) {
  if (!DJANGO_API_URL) {
    return NextResponse.json(
      { error: 'Django API not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const url = `${DJANGO_API_URL.replace(/\/$/, '')}/api/unit-costs/tags/`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create tag' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
