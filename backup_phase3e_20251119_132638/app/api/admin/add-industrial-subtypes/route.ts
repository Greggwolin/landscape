// API endpoint to add Industrial subtypes to the database
import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function POST() {
  try {
    // Industrial subtypes to add
    const industrialSubtypes = [
      { code: 'MFG', name: 'Manufacturing' },
      { code: 'WHS', name: 'Warehouse' },
      { code: 'DC', name: 'Distribution Center' },
      { code: 'INDL', name: 'Industrial' },
      { code: 'PROC', name: 'Processing' },
      { code: 'FLEX', name: 'Flex Space' }
    ];

    console.log('Adding Industrial subtypes to lu_subtype table...');

    // Check if Industrial family exists (family_id = 3)
    const familyCheck = await sql`
      SELECT family_id FROM landscape.lu_family
      WHERE family_id = 3 AND name = 'Industrial'
    `;

    if (familyCheck.length === 0) {
      throw new Error('Industrial family (family_id = 3) not found');
    }

    // Check existing subtypes to avoid duplicates
    const existingSubtypes = await sql`
      SELECT code FROM landscape.lu_subtype
      WHERE family_id = 3
    `;

    const existingCodes = existingSubtypes.map(row => row.code);
    console.log('Existing Industrial subtypes:', existingCodes);

    // Insert new subtypes (skip if already exists)
    for (const subtype of industrialSubtypes) {
      if (!existingCodes.includes(subtype.code)) {
        await sql`
          INSERT INTO landscape.lu_subtype (
            family_id,
            code,
            name,
            active
          ) VALUES (
            3,
            ${subtype.code},
            ${subtype.name},
            true
          )
        `;
        console.log(`Added Industrial subtype: ${subtype.code} - ${subtype.name}`);
      } else {
        console.log(`Skipped existing subtype: ${subtype.code}`);
      }
    }

    // Verify the additions
    const addedSubtypes = await sql`
      SELECT subtype_id, code, name, active
      FROM landscape.lu_subtype
      WHERE family_id = 3
      ORDER BY subtype_id
    `;

    return NextResponse.json({
      success: true,
      message: 'Industrial subtypes added successfully',
      subtypes: addedSubtypes
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error adding Industrial subtypes:', error);
    return NextResponse.json({
      error: 'Failed to add Industrial subtypes',
      details: message
    }, { status: 500 });
  }
}