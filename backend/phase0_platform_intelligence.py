#!/usr/bin/env python
"""
Phase 0 Discovery: Platform Intelligence Data Sources
Find where comparable sales, rent comps, and extracted market data live
"""

import os
import sys
import django

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def run_query(title, sql):
    """Execute query and print results"""
    print(f"\n{'=' * 80}")
    print(f"{title}")
    print('=' * 80)
    
    with connection.cursor() as cursor:
        cursor.execute(sql)
        if cursor.description:
            headers = [desc[0] for desc in cursor.description]
            print(" | ".join(headers))
            print("-" * 80)
            
            rows = cursor.fetchall()
            if rows:
                for row in rows:
                    print(" | ".join(str(val)[:50] if val is not None else 'NULL' for val in row))
                print(f"\nTotal rows: {len(rows)}")
            else:
                print("(No rows returned)")

# Find all tables related to comps, market data, rent, sales
run_query(
    "All Tables with 'comp', 'market', 'rent', 'sale' in name",
    """
    SELECT table_name, 
           (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'landscape' AND table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'landscape' 
      AND (table_name LIKE '%comp%' 
           OR table_name LIKE '%market%' 
           OR table_name LIKE '%rent%'
           OR table_name LIKE '%sale%')
    ORDER BY table_name
    """
)

# Find extraction-related tables
run_query(
    "Extraction/DMS Tables",
    """
    SELECT table_name,
           (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'landscape' AND table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'landscape' 
      AND (table_name LIKE '%extract%' 
           OR table_name LIKE '%dms%'
           OR table_name LIKE '%document%')
    ORDER BY table_name
    """
)

# Find valuation-related tables
run_query(
    "Valuation/Appraisal Tables",
    """
    SELECT table_name,
           (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'landscape' AND table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'landscape' 
      AND (table_name LIKE '%valuation%' 
           OR table_name LIKE '%appraisal%'
           OR table_name LIKE '%income%')
    ORDER BY table_name
    """
)

# Check for any table with "comparable" in column names
run_query(
    "Tables with 'comparable' columns",
    """
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'landscape'
      AND column_name LIKE '%comp%'
    ORDER BY table_name
    """
)

print("\n" + "=" * 80)
print("Phase 0: Platform Intelligence Discovery Complete")
print("=" * 80)
