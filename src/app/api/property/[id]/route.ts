import { NextResponse } from 'next/server';
import { getPropertyData } from '../mock-data';

/**
 * GET /api/property/[id]
 * Retrieve property data
 * Currently uses mock data for prototype
 */
export const GET = async (_request: Request, { params }: { params: { id: string } }) => {
  try {
    const propertyId = params.id;

    if (!propertyId) {
      return NextResponse.json(
        { ok: false, error: 'Invalid property ID' },
        { status: 400 }
      );
    }

    // For now, return mock data
    const data = getPropertyData(propertyId);

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch property data' },
      { status: 500 }
    );
  }
};

/**
 * PUT /api/property/[id]
 * Update property data
 */
export const PUT = async (request: Request, { params }: { params: { id: string } }) => {
  try {
    const propertyId = params.id;

    if (!propertyId) {
      return NextResponse.json(
        { ok: false, error: 'Invalid property ID' },
        { status: 400 }
      );
    }

    const payload = await request.json();

    // For now, just return success
    // In production, this would update the database
    return NextResponse.json({ ok: true, data: payload });
  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update property' },
      { status: 500 }
    );
  }
};
