#!/usr/bin/env python3
"""
Clean up Chadron Avenue units to match OM specifications.

Target: 113 units (108 residential + 5 commercial)
Current: 129 units

Per OM Unit Mix:
- 1BR/1BA: 24 units @ 682 SF
- 2BR/2BA: 52 units @ 957 SF
- 3BR/2BA: 32 units @ 1,230 SF
- Commercial: 5 units (existing)

Strategy:
1. Keep proper unit type distribution
2. Remove duplicate/test units
3. Ensure unit numbers are sequential and valid
"""

import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection


def get_current_units():
    """Get current unit distribution."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT unit_id, unit_number, unit_type, square_feet
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = 17
            ORDER BY unit_type, unit_number
        """)

        units = []
        for row in cursor.fetchall():
            units.append({
                'unit_id': row[0],
                'unit_number': row[1],
                'unit_type': row[2],
                'square_feet': row[3]
            })

        return units


def cleanup_units(dry_run=True):
    """Clean up units to match OM specifications."""

    # Target counts per OM
    target_counts = {
        '1BR/1BA': 24,
        '2BR/2BA': 52,
        '3BR/2BA': 32,
        'Commercial': 5,  # Will combine Commercial + Office into Commercial
        'Office': 0  # Remove office units (will be converted to Commercial)
    }

    # Standard SF per unit type (per OM)
    standard_sf = {
        '1BR/1BA': 682,
        '2BR/2BA': 957,
        '3BR/2BA': 1230,
        'Commercial': 1101  # Using existing commercial unit SF
    }

    current_units = get_current_units()

    # Group by unit type
    units_by_type = {}
    for unit in current_units:
        unit_type = unit['unit_type']
        if unit_type not in units_by_type:
            units_by_type[unit_type] = []
        units_by_type[unit_type].append(unit)

    print("\n=== Current Unit Distribution ===")
    total_current = 0
    for unit_type in sorted(units_by_type.keys()):
        count = len(units_by_type[unit_type])
        total_current += count
        print(f"{unit_type}: {count} units")
    print(f"TOTAL: {total_current} units\n")

    print("=== Target Distribution (per OM) ===")
    total_target = 0
    for unit_type, count in sorted(target_counts.items()):
        if count > 0:
            total_target += count
            print(f"{unit_type}: {count} units")
    print(f"TOTAL: {total_target} units\n")

    # Determine which units to keep and which to delete
    units_to_delete = []

    for unit_type, units in units_by_type.items():
        target = target_counts.get(unit_type, 0)
        current = len(units)

        if current > target:
            # Keep the first N units, delete the rest
            to_delete = units[target:]
            units_to_delete.extend(to_delete)

            print(f"\n{unit_type}: Removing {len(to_delete)} units (keeping {target} out of {current})")
            for unit in to_delete:
                print(f"  - Unit {unit['unit_number']} (ID: {unit['unit_id']})")

    # Check if we need to add commercial units
    current_commercial = len(units_by_type.get('Commercial', [])) + len(units_by_type.get('Office', []))
    commercial_to_add = max(0, target_counts['Commercial'] - 1)  # Keep existing Commercial unit, add more if needed

    print(f"\n=== Commercial Units ===")
    print(f"Current commercial units: {current_commercial}")
    print(f"Target commercial units: {target_counts['Commercial']}")
    print(f"Commercial units to add: {commercial_to_add}")

    print(f"\n=== Summary ===")
    print(f"Total units to delete: {len(units_to_delete)}")
    print(f"Commercial units to add: {commercial_to_add}")
    print(f"Final unit count: {total_current - len(units_to_delete) + commercial_to_add} (target: {total_target})")

    if not dry_run:
        print("\n=== Executing Deletions ===")
        with connection.cursor() as cursor:
            for unit in units_to_delete:
                # Delete associated leases first
                cursor.execute("""
                    DELETE FROM landscape.tbl_multifamily_lease
                    WHERE unit_id = %s
                """, [unit['unit_id']])

                # Delete the unit
                cursor.execute("""
                    DELETE FROM landscape.tbl_multifamily_unit
                    WHERE unit_id = %s
                """, [unit['unit_id']])

                print(f"  ✓ Deleted unit {unit['unit_number']} (ID: {unit['unit_id']})")

        # Add commercial units if needed (use fresh cursor)
        if commercial_to_add > 0:
            print(f"\n=== Adding Commercial Units ===")
            with connection.cursor() as cursor:
                for i in range(commercial_to_add):
                    unit_number = f"10{i+2}"  # 102, 103, 104, 105 (since 100 and 101 exist)
                    cursor.execute("""
                        INSERT INTO landscape.tbl_multifamily_unit
                        (project_id, unit_number, unit_type, square_feet, market_rent)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING unit_id
                    """, [17, unit_number, 'Commercial', standard_sf['Commercial'], 0])

                    unit_id = cursor.fetchone()[0]
                    print(f"  ✓ Created commercial unit {unit_number} (ID: {unit_id})")

        print(f"\n✅ Cleanup complete! Deleted {len(units_to_delete)} units, added {commercial_to_add} commercial units.")
    else:
        print("\n⚠️  DRY RUN - No changes made. Run with --execute to apply changes.")


if __name__ == '__main__':
    dry_run = '--execute' not in sys.argv
    cleanup_units(dry_run=dry_run)
