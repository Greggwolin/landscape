import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/projects/recent
 *
 * Returns the most recently accessed projects for the current user.
 * Used by ProjectContextBar dropdown to show recent projects.
 *
 * Query params:
 *   - limit: Number of projects to return (default: 5)
 *
 * Response:
 *   {
 *     projects: [
 *       {
 *         id: number,
 *         name: string,
 *         project_type_code: string,
 *         last_accessed: string (ISO date)
 *       }
 *     ]
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    // TODO: Get actual user ID from auth context
    const userId = '1';

    // For Phase 1, we'll use the existing /api/projects endpoint
    // which already returns all projects for the user
    const baseUrl = request.nextUrl.origin;
    const projectsResponse = await fetch(`${baseUrl}/api/projects`, {
      headers: request.headers,
    });

    if (!projectsResponse.ok) {
      throw new Error('Failed to fetch projects');
    }

    const data = await projectsResponse.json();
    const allProjects = data.projects || [];

    // Sort by last accessed date (if available) or creation date
    // For now, just return the first N projects
    // TODO: Add last_accessed tracking to database
    const recentProjects = allProjects.slice(0, limit).map((project: any) => ({
      id: project.project_id,
      name: project.project_name,
      project_type_code: project.project_type_code,
      last_accessed: project.updated_at || project.created_at || new Date().toISOString(),
    }));

    return NextResponse.json({ projects: recentProjects });
  } catch (error) {
    console.error('Error fetching recent projects:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch recent projects',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
