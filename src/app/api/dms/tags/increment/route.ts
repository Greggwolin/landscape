/**
 * POST /api/dms/tags/increment
 * Track tag usage endpoint
 * Body: {tag_name, project_id, workspace_id}
 * Uses: landscape.increment_tag_usage() function
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';

const IncrementTagSchema = z.object({
  tag_name: z.string().min(1).max(100),
  project_id: z.number().int().positive().optional(),
  workspace_id: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const { tag_name, project_id, workspace_id } = IncrementTagSchema.parse(body);

    // Validate that at least one ID is provided
    if (!project_id && !workspace_id) {
      return NextResponse.json(
        { error: 'Either project_id or workspace_id is required' },
        { status: 400 }
      );
    }

    // Call the database function to increment tag usage
    await sql`
      SELECT landscape.increment_tag_usage(
        ${tag_name},
        ${project_id || null},
        ${workspace_id || null}
      )
    `;

    return NextResponse.json({
      success: true,
      message: `Tag usage incremented for: ${tag_name}`
    });
  } catch (error) {
    console.error('Tag increment error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to increment tag usage',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
