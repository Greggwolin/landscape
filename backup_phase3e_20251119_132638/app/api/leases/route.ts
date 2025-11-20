import { NextResponse } from 'next/server';

import { createLease, getLeasesByProject } from '@/lib/financial-engine/db';
import type { LeaseCreate } from '@/types/financial-engine';

/**
 * GET /api/leases?project_id=1
 * Get all leases for a project
 */
export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get('project_id');

    if (!projectIdParam) {
      return NextResponse.json(
        { ok: false, error: 'project_id parameter is required' },
        { status: 400 }
      );
    }

    const projectId = parseInt(projectIdParam, 10);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid project_id' },
        { status: 400 }
      );
    }

    const leases = await getLeasesByProject(projectId);

    return NextResponse.json({ ok: true, data: leases });
  } catch (error) {
    console.error('Error fetching leases:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch leases' },
      { status: 500 }
    );
  }
};

/**
 * POST /api/leases
 * Create a new lease
 */
export const POST = async (request: Request) => {
  try {
    const payload: LeaseCreate = await request.json();

    // Validate required fields
    if (!payload.project_id) {
      return NextResponse.json(
        { ok: false, error: 'project_id is required' },
        { status: 400 }
      );
    }

    if (!payload.tenant_name) {
      return NextResponse.json(
        { ok: false, error: 'tenant_name is required' },
        { status: 400 }
      );
    }

    if (!payload.lease_commencement_date) {
      return NextResponse.json(
        { ok: false, error: 'lease_commencement_date is required' },
        { status: 400 }
      );
    }

    if (!payload.lease_expiration_date) {
      return NextResponse.json(
        { ok: false, error: 'lease_expiration_date is required' },
        { status: 400 }
      );
    }

    if (!payload.lease_term_months) {
      return NextResponse.json(
        { ok: false, error: 'lease_term_months is required' },
        { status: 400 }
      );
    }

    if (!payload.leased_sf) {
      return NextResponse.json(
        { ok: false, error: 'leased_sf is required' },
        { status: 400 }
      );
    }

    const lease = await createLease(payload);

    return NextResponse.json({ ok: true, data: lease }, { status: 201 });
  } catch (error) {
    console.error('Error creating lease:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create lease' },
      { status: 500 }
    );
  }
};
