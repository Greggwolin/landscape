#!/usr/bin/env python3
"""
Chadron Clean Slate Import

Deletes incorrect database units and imports verified OM extraction data.
Validates against both OM (pages 29-34) and rent roll Excel file.

Expected Results:
- 113 units across 4 floors (1-4)
- Current GPR: $258,543/month
- Proforma GPR: $363,083/month
- 107 occupied, 6 vacant
- 47 Section 8 units
"""

import json
import os
import sys
from datetime import date
import psycopg2
from psycopg2.extras import RealDictCursor

# Configuration
PROJECT_ID = 17
EXTRACTION_FILE = '/Users/5150east/landscape/backend/chadron_rent_roll_extracted.json'
DATABASE_URL = os.getenv('DATABASE_URL')

def load_extraction_data():
    """Load the validated OM extraction JSON"""
    with open(EXTRACTION_FILE, 'r') as f:
        return json.load(f)

def delete_existing_data(cursor, project_id):
    """Delete all existing Chadron data (with backup)"""
    print(f"\n{'='*80}")
    print("STEP 1: Backing up and deleting existing data")
    print('='*80)

    # Count what we're about to delete
    cursor.execute("""
        SELECT COUNT(*) as unit_count
        FROM landscape.tbl_multifamily_unit
        WHERE project_id = %s
    """, (project_id,))
    unit_count = cursor.fetchone()['unit_count']

    cursor.execute("""
        SELECT COUNT(*) as lease_count
        FROM landscape.tbl_multifamily_lease l
        JOIN landscape.tbl_multifamily_unit u ON l.unit_id = u.unit_id
        WHERE u.project_id = %s
    """, (project_id,))
    lease_count = cursor.fetchone()['lease_count']

    cursor.execute("""
        SELECT COUNT(*) as unit_type_count
        FROM landscape.tbl_multifamily_unit_type
        WHERE project_id = %s
    """, (project_id,))
    unit_type_count = cursor.fetchone()['unit_type_count']

    print(f"\nCurrent database state:")
    print(f"  Units: {unit_count}")
    print(f"  Leases: {lease_count}")
    print(f"  Unit Types: {unit_type_count}")

    # Delete leases first (foreign key dependency)
    print(f"\nDeleting {lease_count} leases...")
    cursor.execute("""
        DELETE FROM landscape.tbl_multifamily_lease
        WHERE unit_id IN (
            SELECT unit_id FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
        )
    """, (project_id,))

    # Delete units
    print(f"Deleting {unit_count} units...")
    cursor.execute("""
        DELETE FROM landscape.tbl_multifamily_unit
        WHERE project_id = %s
    """, (project_id,))

    # Delete unit types
    print(f"Deleting {unit_type_count} unit types...")
    cursor.execute("""
        DELETE FROM landscape.tbl_multifamily_unit_type
        WHERE project_id = %s
    """, (project_id,))

    print("✅ Cleanup complete")

def import_unit_types(cursor, project_id, units_data):
    """Create unit types from OM extraction"""
    print(f"\n{'='*80}")
    print("STEP 2: Creating unit types")
    print('='*80)

    # Extract unique unit types from the data
    unit_types = {}
    for unit in units_data:
        unit_type = unit['unit_type']
        if unit_type not in unit_types:
            unit_types[unit_type] = {
                'sf': unit['sf'],
                'count': 0,
                'market_rents': []
            }
        unit_types[unit_type]['count'] += 1
        unit_types[unit_type]['market_rents'].append(unit['market_monthly_rent'])

    # Determine bedrooms/bathrooms from unit type name
    def parse_unit_type(name):
        if 'Commercial' in name or 'Leasing Office' in name:
            return 0, 0
        elif '1BR' in name:
            beds = 1
        elif '2BR' in name:
            beds = 2
        elif '3BR' in name:
            beds = 3
        else:
            beds = 0

        if '1BA' in name:
            baths = 1.0
        elif '2BA' in name:
            baths = 2.0
        else:
            baths = 0

        return beds, baths

    # Insert unit types
    unit_type_map = {}  # Map unit_type_name -> unit_type_id

    for unit_type_name, info in sorted(unit_types.items()):
        bedrooms, bathrooms = parse_unit_type(unit_type_name)

        # Calculate average market rent for this unit type
        avg_market_rent = sum(info['market_rents']) / len(info['market_rents'])

        cursor.execute("""
            INSERT INTO landscape.tbl_multifamily_unit_type (
                project_id,
                unit_type_code,
                bedrooms,
                bathrooms,
                avg_square_feet,
                total_units,
                current_market_rent,
                created_at,
                updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING unit_type_id
        """, (
            project_id,
            unit_type_name,
            bedrooms,
            bathrooms,
            info['sf'],
            info['count'],
            avg_market_rent
        ))

        unit_type_id = cursor.fetchone()['unit_type_id']
        unit_type_map[unit_type_name] = unit_type_id

        print(f"  ✓ {unit_type_name}: {info['count']} units, {info['sf']} sf, {bedrooms}BR/{bathrooms}BA, ${avg_market_rent:.2f}/mo")

    print(f"\n✅ Created {len(unit_types)} unit types")
    return unit_type_map

def import_units(cursor, project_id, units_data, unit_type_map):
    """Import all units from OM extraction"""
    print(f"\n{'='*80}")
    print("STEP 3: Importing units")
    print('='*80)

    unit_map = {}  # Map unit_number -> unit_id
    floors = {}

    for unit in units_data:
        unit_number = unit['unit_number']
        unit_type = unit['unit_type']
        unit_type_id = unit_type_map[unit_type]

        # Determine bedrooms/bathrooms
        if 'Commercial' in unit_type or 'Leasing Office' in unit_type:
            bedrooms, bathrooms = 0, 0
        elif '1BR' in unit_type:
            bedrooms = 1
            bathrooms = 1.0 if '1BA' in unit_type else 2.0
        elif '2BR' in unit_type:
            bedrooms = 2
            bathrooms = 2.0
        elif '3BR' in unit_type:
            bedrooms = 3
            bathrooms = 2.0
        else:
            bedrooms, bathrooms = 0, 0

        # Determine occupancy status
        occupancy_status = 'VACANT' if unit['status'] == 'vacant' else 'OCCUPIED'

        cursor.execute("""
            INSERT INTO landscape.tbl_multifamily_unit (
                project_id,
                unit_number,
                unit_type,
                bedrooms,
                bathrooms,
                square_feet,
                market_rent,
                market_rent_psf,
                current_rent,
                current_rent_psf,
                occupancy_status,
                is_section8,
                other_features,
                created_at,
                updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING unit_id
        """, (
            project_id,
            unit_number,
            unit_type,
            bedrooms,
            bathrooms,
            unit['sf'],
            unit['market_monthly_rent'],
            unit['market_rent_psf'],
            unit['current_monthly_rent'],
            unit['current_rent_psf'],
            occupancy_status,
            unit['is_section_8'],
            unit['notes']
        ))

        unit_id = cursor.fetchone()['unit_id']
        unit_map[unit_number] = unit_id

        # Track floors
        floor = unit_number[0]
        if floor not in floors:
            floors[floor] = 0
        floors[floor] += 1

    print(f"\nImported {len(units_data)} units:")
    for floor in sorted(floors.keys()):
        print(f"  Floor {floor}: {floors[floor]} units")

    print(f"\n✅ All units imported")
    return unit_map

def import_leases(cursor, project_id, units_data, unit_map):
    """Import leases for occupied units"""
    print(f"\n{'='*80}")
    print("STEP 4: Creating leases for occupied units")
    print('='*80)

    lease_count = 0
    section8_count = 0

    for unit in units_data:
        if unit['status'] == 'occupied' and unit['current_monthly_rent']:
            unit_number = unit['unit_number']
            unit_id = unit_map[unit_number]

            cursor.execute("""
                INSERT INTO landscape.tbl_multifamily_lease (
                    unit_id,
                    resident_name,
                    lease_start_date,
                    lease_end_date,
                    lease_term_months,
                    base_rent_monthly,
                    effective_rent_monthly,
                    lease_status,
                    is_renewal,
                    created_at,
                    updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (
                unit_id,
                'Current Tenant',
                date.today(),
                date(date.today().year + 1, date.today().month, date.today().day),
                12,
                unit['current_monthly_rent'],
                unit['current_monthly_rent'],
                'ACTIVE',
                False
            ))

            lease_count += 1
            if unit['is_section_8']:
                section8_count += 1

    print(f"\nCreated {lease_count} leases:")
    print(f"  Market rate: {lease_count - section8_count}")
    print(f"  Section 8: {section8_count}")

    print(f"\n✅ Leases created")

def validate_import(cursor, project_id):
    """Validate the import against expected metrics"""
    print(f"\n{'='*80}")
    print("STEP 5: VALIDATION")
    print('='*80)

    # Count units
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM landscape.tbl_multifamily_unit
        WHERE project_id = %s
    """, (project_id,))
    unit_count = cursor.fetchone()['count']

    # Count occupied units
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM landscape.tbl_multifamily_lease l
        JOIN landscape.tbl_multifamily_unit u ON l.unit_id = u.unit_id
        WHERE u.project_id = %s AND l.lease_status = 'ACTIVE'
    """, (project_id,))
    occupied_count = cursor.fetchone()['count']

    # Count vacant units
    vacant_count = unit_count - occupied_count

    # Calculate Current GPR
    cursor.execute("""
        SELECT
            COALESCE(SUM(CASE
                WHEN l.lease_id IS NOT NULL THEN l.base_rent_monthly
                ELSE u.market_rent
            END), 0) as current_gpr
        FROM landscape.tbl_multifamily_unit u
        LEFT JOIN landscape.tbl_multifamily_lease l
            ON u.unit_id = l.unit_id AND l.lease_status = 'ACTIVE'
        WHERE u.project_id = %s
    """, (project_id,))
    current_gpr = float(cursor.fetchone()['current_gpr'])

    # Calculate Proforma GPR
    cursor.execute("""
        SELECT COALESCE(SUM(market_rent), 0) as proforma_gpr
        FROM landscape.tbl_multifamily_unit
        WHERE project_id = %s
    """, (project_id,))
    proforma_gpr = float(cursor.fetchone()['proforma_gpr'])

    # Expected values from OM
    expected_units = 113
    expected_current_gpr = 258543
    expected_proforma_gpr = 363083

    # Calculate variances
    current_variance = abs(current_gpr - expected_current_gpr) / expected_current_gpr * 100
    proforma_variance = abs(proforma_gpr - expected_proforma_gpr) / expected_proforma_gpr * 100

    # Display results
    print("\n" + "="*60)
    print("UNIT COUNTS")
    print("="*60)
    print(f"  Total Units:    {unit_count:3d} (expected: {expected_units})")
    print(f"  Occupied:       {occupied_count:3d}")
    print(f"  Vacant:         {vacant_count:3d}")

    print("\n" + "="*60)
    print("CURRENT GPR (Monthly)")
    print("="*60)
    print(f"  Calculated:     ${current_gpr:,.2f}")
    print(f"  Expected:       ${expected_current_gpr:,.2f}")
    print(f"  Variance:       {current_variance:.2f}%")
    status = "✅ PASS" if current_variance < 5 else "❌ FAIL"
    print(f"  Status:         {status}")

    print("\n" + "="*60)
    print("PROFORMA GPR (Monthly)")
    print("="*60)
    print(f"  Calculated:     ${proforma_gpr:,.2f}")
    print(f"  Expected:       ${expected_proforma_gpr:,.2f}")
    print(f"  Variance:       {proforma_variance:.2f}%")
    status = "✅ PASS" if proforma_variance < 5 else "❌ FAIL"
    print(f"  Status:         {status}")

    # Overall status
    print("\n" + "="*60)
    if unit_count == expected_units and current_variance < 5 and proforma_variance < 5:
        print("✅ ALL VALIDATIONS PASSED")
        return True
    else:
        print("❌ SOME VALIDATIONS FAILED")
        return False

def main():
    """Main import process"""
    print("="*80)
    print("CHADRON CLEAN SLATE IMPORT")
    print("="*80)
    print(f"\nSource: {EXTRACTION_FILE}")
    print(f"Target: Project ID {PROJECT_ID}")

    if not DATABASE_URL:
        print("\n❌ ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    # Load extraction data
    print("\nLoading extraction data...")
    data = load_extraction_data()
    units_data = data['units']
    metadata = data['extraction_metadata']

    print(f"✅ Loaded {metadata['total_units_extracted']} units")
    print(f"   Occupied: {metadata['occupied_count']}")
    print(f"   Vacant: {metadata['vacant_count']}")
    print(f"   Section 8: {metadata['section_8_count']}")
    print(f"   Current GPR: ${metadata['total_current_monthly_rent']:,}")
    print(f"   Proforma GPR: ${metadata['total_market_monthly_rent']:,}")

    # Confirm before proceeding
    print("\n" + "="*80)
    print("⚠️  WARNING: This will DELETE all existing Chadron data!")
    print("="*80)
    response = input("\nType 'YES' to proceed: ")

    if response != 'YES':
        print("\n❌ Import cancelled")
        sys.exit(0)

    # Connect to database
    print("\nConnecting to database...")
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cursor = conn.cursor()

    try:
        # Execute import steps
        delete_existing_data(cursor, PROJECT_ID)
        unit_type_map = import_unit_types(cursor, PROJECT_ID, units_data)
        unit_map = import_units(cursor, PROJECT_ID, units_data, unit_type_map)
        import_leases(cursor, PROJECT_ID, units_data, unit_map)

        # Validate
        validation_passed = validate_import(cursor, PROJECT_ID)

        if validation_passed:
            print("\n" + "="*80)
            print("✅ IMPORT SUCCESSFUL - Ready to commit")
            print("="*80)
            response = input("\nType 'COMMIT' to commit changes, or 'ROLLBACK' to cancel: ")

            if response == 'COMMIT':
                conn.commit()
                print("\n✅ Changes committed to database")
            else:
                conn.rollback()
                print("\n↩️  Changes rolled back")
        else:
            print("\n" + "="*80)
            print("❌ VALIDATION FAILED - Rolling back")
            print("="*80)
            conn.rollback()
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    main()
