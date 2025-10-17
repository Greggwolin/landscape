import { NextResponse } from 'next/server';
import { updatePropertySection } from '../../mock-data';

/**
 * PUT /api/property/[id]/[section]
 * Update a specific section of property data
 */
export const PUT = async (
  request: Request,
  { params }: { params: { id: string; section: string } }
) => {
  try {
    const { id: propertyId, section } = params;

    if (!propertyId || !section) {
      return NextResponse.json(
        { ok: false, error: 'Invalid property ID or section' },
        { status: 400 }
      );
    }

    const payload = await request.json();

    // Update mock data
    updatePropertySection(section as any, payload);

    return NextResponse.json({ ok: true, data: payload });
  } catch (error) {
    console.error('Error updating property section:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update property section' },
      { status: 500 }
    );
  }
};
