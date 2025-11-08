import { NextResponse } from 'next/server';

import { getFullLeaseData, updateLease, deleteLease } from '@/lib/financial-engine/db';
import type { LeaseUpdate } from '@/types/financial-engine';
import { getLeaseData } from '../mock-data';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/lease/[id]
 * Retrieve full lease data including all related tables
 * Falls back to mock data if lease not found in database
 */
export const GET = async (_request: Request, context: Params) => {
  try {
    const leaseId = parseInt((await context.params).id, 10);

    if (isNaN(leaseId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid lease ID' },
        { status: 400 }
      );
    }

    // Try to get from database first
    let data = await getFullLeaseData(leaseId);

    // If not found in database, use mock data (for prototype)
    if (!data) {
      data = getLeaseData(params.id);
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Error fetching lease:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch lease data' },
      { status: 500 }
    );
  }
};

/**
 * PUT /api/lease/[id]
 * Update lease master record
 */
export const PUT = async (request: Request, context: Params) => {
  try {
    const leaseId = parseInt((await context.params).id, 10);

    if (isNaN(leaseId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid lease ID' },
        { status: 400 }
      );
    }

    const payload: LeaseUpdate = await request.json();

    const updated = await updateLease(leaseId, payload);

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error('Error updating lease:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update lease' },
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/lease/[id]
 * Delete a lease and all related records (cascading)
 */
export const DELETE = async (_request: Request, context: Params) => {
  try {
    const leaseId = parseInt((await context.params).id, 10);

    if (isNaN(leaseId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid lease ID' },
        { status: 400 }
      );
    }

    const deleted = await deleteLease(leaseId);

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, message: 'Lease deleted successfully' });
  } catch (error) {
    console.error('Error deleting lease:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete lease' },
      { status: 500 }
    );
  }
};
