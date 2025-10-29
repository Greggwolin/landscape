#!/usr/bin/env python3
"""
Convert extracted rent roll JSON to SQL INSERT statements for temp table
"""
import json
import sys

def json_to_sql(json_file):
    with open(json_file, 'r') as f:
        data = json.load(f)

    units = data.get('units', [])

    print("-- Create temp table")
    print("""
CREATE TEMP TABLE IF NOT EXISTS temp_chadron_rent_roll (
    unit_number VARCHAR(10),
    unit_type VARCHAR(50),
    sf INTEGER,
    current_monthly_rent DECIMAL(10,2),
    current_rent_psf DECIMAL(10,2),
    market_monthly_rent DECIMAL(10,2),
    market_rent_psf DECIMAL(10,2),
    status VARCHAR(20),
    is_section_8 BOOLEAN,
    notes TEXT
);
""")

    print("\n-- Insert data into temp table")
    for unit in units:
        unit_number = unit['unit_number']
        unit_type = unit['unit_type'].replace("'", "''")  # Escape single quotes
        sf = unit['sf']
        current_rent = unit['current_monthly_rent'] if unit['current_monthly_rent'] is not None else 'NULL'
        current_psf = unit['current_rent_psf'] if unit['current_rent_psf'] is not None else 'NULL'
        market_rent = unit['market_monthly_rent']
        market_psf = unit['market_rent_psf']
        status = unit['status']
        is_section_8 = 'TRUE' if unit['is_section_8'] else 'FALSE'
        notes = unit['notes'].replace("'", "''") if unit.get('notes') else ''

        if current_rent == 'NULL':
            current_rent_str = 'NULL'
        else:
            current_rent_str = str(current_rent)

        if current_psf == 'NULL':
            current_psf_str = 'NULL'
        else:
            current_psf_str = str(current_psf)

        print(f"INSERT INTO temp_chadron_rent_roll VALUES ('{unit_number}', '{unit_type}', {sf}, {current_rent_str}, {current_psf_str}, {market_rent}, {market_psf}, '{status}', {is_section_8}, '{notes}');")

    print(f"\n-- Total units inserted: {len(units)}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python json_to_sql_temp.py <json_file>")
        sys.exit(1)

    json_to_sql(sys.argv[1])
