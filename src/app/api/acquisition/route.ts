// app/api/acquisition/route.ts
import { NextResponse } from 'next/server';

// Deprecated: use /api/projects/[projectId]/acquisition/ledger instead
export async function GET() {
  return NextResponse.json(
    {
      error: 'Deprecated endpoint. Use /api/projects/[projectId]/acquisition/ledger for project-scoped acquisition events.',
    },
    { status: 410 }
  );
}
