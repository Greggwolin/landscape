// API endpoint to populate all missing subtypes for all families
import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function POST() {
  try {
    console.log('Populating all missing subtypes...');

    // All subtypes for all families based on the existing hardcoded defaults
    const allSubtypes = [
      // Residential types (family_id: 1)
      { family_id: 1, code: 'SFD', name: 'Single Family Detached', ord: 1 },
      { family_id: 1, code: 'SFA', name: 'Single Family Attached', ord: 2 },
      { family_id: 1, code: 'TH', name: 'Townhomes', ord: 3 },
      { family_id: 1, code: 'CONDO', name: 'Condominiums', ord: 4 },
      { family_id: 1, code: 'APT', name: 'Apartments', ord: 5 },
      { family_id: 1, code: 'MF', name: 'Multi-Family', ord: 6 },

      // Commercial types (family_id: 2)
      { family_id: 2, code: 'RETAIL', name: 'Retail', ord: 1 },
      { family_id: 2, code: 'RET', name: 'Retail', ord: 2 },
      { family_id: 2, code: 'OFFICE', name: 'Office', ord: 3 },
      { family_id: 2, code: 'HOTEL', name: 'Hotel', ord: 4 },

      // Industrial types (family_id: 3) - already exist, but include for completeness
      { family_id: 3, code: 'MFG', name: 'Manufacturing', ord: 1 },
      { family_id: 3, code: 'WHS', name: 'Warehouse', ord: 2 },
      { family_id: 3, code: 'DC', name: 'Distribution Center', ord: 3 },
      { family_id: 3, code: 'INDL', name: 'Industrial', ord: 4 },
      { family_id: 3, code: 'PROC', name: 'Processing', ord: 5 },
      { family_id: 3, code: 'FLEX', name: 'Flex Space', ord: 6 },

      // Common Areas types (family_id: 4)
      { family_id: 4, code: 'COMMON', name: 'Common Areas', ord: 1 },
      { family_id: 4, code: 'AMENITY', name: 'Amenity Areas', ord: 2 },
      { family_id: 4, code: 'CLUBHOUSE', name: 'Clubhouse', ord: 3 },

      // Public types (family_id: 5)
      { family_id: 5, code: 'PUBLIC', name: 'Public', ord: 1 },
      { family_id: 5, code: 'GOV', name: 'Government', ord: 2 },
      { family_id: 5, code: 'SCHOOL', name: 'School', ord: 3 },

      // Other types (family_id: 6)
      { family_id: 6, code: 'OTHER', name: 'Other', ord: 1 },
      { family_id: 6, code: 'MISC', name: 'Miscellaneous', ord: 2 },

      // Institutional types (family_id: 8)
      { family_id: 8, code: 'INST', name: 'Institutional', ord: 1 },
      { family_id: 8, code: 'HOSPITAL', name: 'Hospital', ord: 2 },
      { family_id: 8, code: 'CHURCH', name: 'Church', ord: 3 },

      // Mixed Use types (family_id: 9)
      { family_id: 9, code: 'MU', name: 'Mixed Use', ord: 1 },
      { family_id: 9, code: 'MU-LOW', name: 'Mixed Use Low Intensity', ord: 2 },
      { family_id: 9, code: 'MU-HIGH', name: 'Mixed Use High Intensity', ord: 3 },

      // Open Space types (family_id: 10)
      { family_id: 10, code: 'PARK', name: 'Parks', ord: 1 },
      { family_id: 10, code: 'OS', name: 'Open Space', ord: 2 },
      { family_id: 10, code: 'TRAIL', name: 'Trails', ord: 3 },
      { family_id: 10, code: 'GREEN', name: 'Green Space', ord: 4 }
    ];

    console.log(`Attempting to add ${allSubtypes.length} subtypes...`);

    // Check existing subtypes to avoid duplicates
    const existingSubtypes = await sql`
      SELECT family_id, code FROM landscape.lu_subtype
    `;

    const existingKeys = existingSubtypes.map(row => `${row.family_id}-${row.code}`);
    console.log('Existing subtypes:', existingKeys);

    let addedCount = 0;
    let skippedCount = 0;

    // Insert new subtypes (skip if already exists)
    for (const subtype of allSubtypes) {
      const key = `${subtype.family_id}-${subtype.code}`;

      if (!existingKeys.includes(key)) {
        await sql`
          INSERT INTO landscape.lu_subtype (
            family_id,
            code,
            name,
            ord,
            active
          ) VALUES (
            ${subtype.family_id},
            ${subtype.code},
            ${subtype.name},
            ${subtype.ord},
            true
          )
        `;
        console.log(`Added: ${subtype.code} - ${subtype.name} (family ${subtype.family_id})`);
        addedCount++;
      } else {
        console.log(`Skipped existing: ${subtype.code} (family ${subtype.family_id})`);
        skippedCount++;
      }
    }

    // Verify the final state
    const finalSubtypes = await sql`
      SELECT
        s.subtype_id,
        s.family_id,
        s.code,
        s.name,
        s.ord,
        s.active,
        f.name as family_name
      FROM landscape.lu_subtype s
      LEFT JOIN landscape.lu_family f ON f.family_id = s.family_id
      ORDER BY s.family_id, s.ord, s.subtype_id
    `;

    // Group by family for better organization
    const subtypesByFamily = finalSubtypes.reduce((acc, subtype) => {
      const familyId = subtype.family_id;
      if (!acc[familyId]) {
        acc[familyId] = {
          family_name: subtype.family_name,
          subtypes: []
        };
      }
      acc[familyId].subtypes.push(subtype);
      return acc;
    }, {} as Record<number, any>);

    return NextResponse.json({
      success: true,
      message: `Subtypes populated successfully. Added: ${addedCount}, Skipped: ${skippedCount}`,
      total_subtypes: finalSubtypes.length,
      subtypes_by_family: subtypesByFamily
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error populating subtypes:', error);
    return NextResponse.json({
      error: 'Failed to populate subtypes',
      details: message
    }, { status: 500 });
  }
}