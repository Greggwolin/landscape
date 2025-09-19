import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST() {
  // Environment guard - prevent seeding in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seed endpoints disabled in production' }, { status: 403 });
  }

  try {
    console.log('Starting land use system initialization...');

    // Create tables one by one
    console.log('Creating lu_family table...');
    await sql`
      CREATE TABLE IF NOT EXISTS landscape.lu_family (
          family_id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          ord INTEGER DEFAULT 0,
          active BOOLEAN DEFAULT TRUE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('Creating lu_subtype table...');
    await sql`
      CREATE TABLE IF NOT EXISTS landscape.lu_subtype (
          subtype_id SERIAL PRIMARY KEY,
          family_id INTEGER REFERENCES landscape.lu_family(family_id) ON DELETE CASCADE,
          code VARCHAR(20) NOT NULL,
          name VARCHAR(100) NOT NULL,
          ord INTEGER DEFAULT 0,
          active BOOLEAN DEFAULT TRUE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(family_id, code)
      )
    `;

    // Handle existing tbl_landuse table
    console.log('Updating tbl_landuse table...');
    try {
      await sql`ALTER TABLE landscape.tbl_landuse ADD COLUMN IF NOT EXISTS subtype_id INTEGER`;
      await sql`ALTER TABLE landscape.tbl_landuse ADD COLUMN IF NOT EXISTS name VARCHAR(100)`;  
      await sql`ALTER TABLE landscape.tbl_landuse ADD COLUMN IF NOT EXISTS description TEXT`;
      await sql`ALTER TABLE landscape.tbl_landuse ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE`;
      await sql`ALTER TABLE landscape.tbl_landuse ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
      await sql`ALTER TABLE landscape.tbl_landuse ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
    } catch (error) {
      console.log('tbl_landuse columns may already exist');
    }

    await sql`
      CREATE TABLE IF NOT EXISTS landscape.tbl_landuse (
          landuse_id SERIAL PRIMARY KEY,
          subtype_id INTEGER REFERENCES landscape.lu_subtype(subtype_id) ON DELETE SET NULL,
          landuse_code VARCHAR(20) NOT NULL UNIQUE,
          landuse_type VARCHAR(50),
          name VARCHAR(100),
          description TEXT,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('Creating programming and zoning tables...');
    await sql`
      CREATE TABLE IF NOT EXISTS landscape.tbl_landuse_program (
          landuse_code VARCHAR(20) PRIMARY KEY REFERENCES landscape.tbl_landuse(landuse_code) ON DELETE CASCADE,
          rsf_to_gfa_eff DECIMAL(5,4),
          employee_density DECIMAL(8,2),
          floor_plate_efficiency DECIMAL(5,4),
          clear_height_ft DECIMAL(6,2),
          loading_dock_ratio DECIMAL(8,4),
          truck_court_depth_ft DECIMAL(6,2),
          trailer_parking_ratio DECIMAL(8,4),
          dwelling_units_per_acre DECIMAL(8,2),
          average_unit_size_sf INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS landscape.tbl_zoning_control (
          landuse_code VARCHAR(20) PRIMARY KEY REFERENCES landscape.tbl_landuse(landuse_code) ON DELETE CASCADE,
          site_coverage_pct DECIMAL(5,2),
          site_far DECIMAL(6,3),
          max_stories INTEGER,
          max_height_ft DECIMAL(6,2),
          parking_ratio_per1000sf DECIMAL(8,3),
          parking_stall_sf DECIMAL(6,2),
          site_common_area_pct DECIMAL(5,2),
          setback_front_ft DECIMAL(6,2),
          setback_side_ft DECIMAL(6,2),
          setback_rear_ft DECIMAL(6,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes
    console.log('Creating indexes...');
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_lu_subtype_family ON landscape.lu_subtype(family_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_tbl_landuse_subtype ON landscape.tbl_landuse(subtype_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_tbl_landuse_code ON landscape.tbl_landuse(landuse_code)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_lu_family_active ON landscape.lu_family(active)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_lu_subtype_active ON landscape.lu_subtype(active)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_tbl_landuse_active ON landscape.tbl_landuse(active)`;
    } catch (error) {
      console.log('Some indexes may already exist');
    }

    console.log('Inserting seed data...');
    
    // Insert families - check if they exist first
    const existingFamilies = await sql`SELECT name FROM landscape.lu_family`;
    const existingFamilyNames = existingFamilies.map(f => f.name);
    
    const familiesToAdd = [
      { name: 'Residential', ord: 1, notes: 'All residential development types' },
      { name: 'Commercial', ord: 2, notes: 'Office, retail, and service commercial uses' },
      { name: 'Industrial', ord: 3, notes: 'Manufacturing, warehouse, and distribution uses' }
    ];

    for (const family of familiesToAdd) {
      if (!existingFamilyNames.includes(family.name)) {
        try {
          await sql`INSERT INTO landscape.lu_family (name, ord, active, notes) VALUES (${family.name}, ${family.ord}, TRUE, ${family.notes})`;
          console.log(`Added family: ${family.name}`);
        } catch (error) {
          try {
            await sql`INSERT INTO landscape.lu_family (name) VALUES (${family.name})`;
            console.log(`Added family (minimal): ${family.name}`);
          } catch (err) {
            console.log(`Family ${family.name} may already exist`);
          }
        }
      }
    }

    // Get family IDs
    const families = await sql`SELECT family_id, name FROM landscape.lu_family`;
    const resFamily = families.find(f => f.name === 'Residential');
    const comFamily = families.find(f => f.name === 'Commercial');
    const indFamily = families.find(f => f.name === 'Industrial');

    console.log('Found families:', { 
      residential: resFamily?.family_id, 
      commercial: comFamily?.family_id, 
      industrial: indFamily?.family_id 
    });

    // Insert a few basic land use types directly (skip subtypes for now)
    const basicLandUses = [
      { code: 'SFD', name: 'Single Family Detached', type: 'Single Family' },
      { code: 'MF', name: 'Multi-Family', type: 'Multi-Family' },
      { code: 'OFF', name: 'Office', type: 'Office' },
      { code: 'RET', name: 'Retail', type: 'Retail' }
    ];

    for (const landuse of basicLandUses) {
      try {
        // Check if it exists
        const existing = await sql`SELECT landuse_code FROM landscape.tbl_landuse WHERE landuse_code = ${landuse.code}`;
        if (existing.length === 0) {
          await sql`INSERT INTO landscape.tbl_landuse (landuse_code, landuse_type, name, active) VALUES (${landuse.code}, ${landuse.type}, ${landuse.name}, TRUE)`;
          console.log(`Added land use: ${landuse.code}`);

          // Add basic programming data
          if (landuse.code === 'SFD') {
            await sql`INSERT INTO landscape.tbl_landuse_program (landuse_code, dwelling_units_per_acre, average_unit_size_sf) VALUES (${landuse.code}, 4.5, 2500)`;
            await sql`INSERT INTO landscape.tbl_zoning_control (landuse_code, site_coverage_pct, site_far, max_stories) VALUES (${landuse.code}, 40.0, 0.6, 3)`;
          } else if (landuse.code === 'MF') {
            await sql`INSERT INTO landscape.tbl_landuse_program (landuse_code, dwelling_units_per_acre, average_unit_size_sf) VALUES (${landuse.code}, 35.0, 1100)`;
            await sql`INSERT INTO landscape.tbl_zoning_control (landuse_code, site_coverage_pct, site_far, max_stories) VALUES (${landuse.code}, 70.0, 2.0, 6)`;
          } else if (landuse.code === 'OFF') {
            await sql`INSERT INTO landscape.tbl_landuse_program (landuse_code, employee_density, floor_plate_efficiency) VALUES (${landuse.code}, 250.0, 0.82)`;
            await sql`INSERT INTO landscape.tbl_zoning_control (landuse_code, site_coverage_pct, site_far, max_stories) VALUES (${landuse.code}, 60.0, 3.0, 12)`;
          } else if (landuse.code === 'RET') {
            await sql`INSERT INTO landscape.tbl_landuse_program (landuse_code, employee_density, floor_plate_efficiency) VALUES (${landuse.code}, 400.0, 0.85)`;
            await sql`INSERT INTO landscape.tbl_zoning_control (landuse_code, site_coverage_pct, site_far, max_stories) VALUES (${landuse.code}, 70.0, 1.5, 4)`;
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.log(`Error adding ${landuse.code}:`, msg);
      }
    }

    console.log('Land use system initialization complete!');

    return NextResponse.json({ 
      message: 'Land use management system seeded successfully',
      families: families.length,
      landuses: basicLandUses.length,
      status: 'success'
    });
    
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error seeding land use data:', error);
    return NextResponse.json(
      { error: 'Failed to seed land use data', details: msg },
      { status: 500 }
    );
  }
}
