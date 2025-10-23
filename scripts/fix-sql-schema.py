#!/usr/bin/env python3
"""
Fix SQL file to match actual database schema
"""

import re

# Read the original backup file
with open('scripts/load_scottsdale_roster.sql.bak', 'r') as f:
    sql = f.read()

# Column name mappings based on actual schema
replacements = [
    # Tenant Improvement table
    (r'ti_allowance_psf', 'landlord_ti_psf'),
    (r'ti_allowance_total', 'landlord_ti_total'),

    # Remove landlord_contribution field (doesn't exist in schema)
    (r',\s*landlord_contribution\s*', ''),
    (r'landlord_contribution,\s*', ''),
    (r',\s*\d+', ''),  # Remove the third number value after landlord_ti_total

    # Leasing Commission table
    (r'commission_structure', 'commission_type'),
    (r'landlord_broker', 'listing_broker'),
    (r'landlord_rate_pct', 'listing_broker_split_pct'),

    # Work letter field
    (r'ti_work_letter', 'scope_description'),
]

# Apply replacements
for pattern, replacement in replacements:
    sql = re.sub(pattern, replacement, sql)

# Fix the specific problematic INSERT statements
# Fix TI inserts to remove extra value
sql = re.sub(
    r"INSERT INTO landscape\.tbl_cre_tenant_improvement \(\s*lease_id,\s*landlord_ti_psf,\s*landlord_ti_total\s*\)\s*VALUES\s*\(\(SELECT lease_id[^)]+\),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\);",
    r"INSERT INTO landscape.tbl_cre_tenant_improvement (lease_id, landlord_ti_psf, landlord_ti_total, work_letter_included) VALUES ((SELECT lease_id FROM landscape.tbl_cre_lease WHERE lease_number = 'LVSP-2020-001'), \1, \2, true);",
    sql
)

# Write fixed SQL
with open('scripts/load_scottsdale_roster.sql', 'w') as f:
    f.write(sql)

print("✅ Fixed SQL schema mapping")
print("   - ti_allowance_psf → landlord_ti_psf")
print("   - ti_allowance_total → landlord_ti_total")
print("   - commission_structure → commission_type")
print("   - landlord_broker → listing_broker")
print("   - landlord_rate_pct → listing_broker_split_pct")
print("   - Removed landlord_contribution column")
