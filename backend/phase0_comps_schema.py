#!/usr/bin/env python
"""
Phase 0: Examine Comparable Data Schema and Sample Data
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
                    print(" | ".join(str(val)[:60] if val is not None else 'NULL' for val in row))
                print(f"\nTotal rows: {len(rows)}")
            else:
                print("(No rows returned)")

# 1. Sales Comparables - check what's actually in there
run_query(
    "Sales Comparables: Row count and key fields",
    """
    SELECT COUNT(*) as total_comps,
           COUNT(DISTINCT property_type) as property_types,
           COUNT(DISTINCT city) as cities,
           MIN(sale_date) as earliest_sale,
           MAX(sale_date) as latest_sale
    FROM landscape.tbl_sales_comparables
    """
)

# 2. Sample sales comp data
run_query(
    "Sample Sales Comps (first 5)",
    """
    SELECT comp_id, property_name, property_type, city, state, 
           sale_date, sale_price, price_per_unit, cap_rate, units
    FROM landscape.tbl_sales_comparables
    ORDER BY sale_date DESC
    LIMIT 5
    """
)

# 3. Rental Comparables
run_query(
    "Rental Comparables: Row count and structure",
    """
    SELECT COUNT(*) as total_rent_comps,
           COUNT(DISTINCT city) as cities,
           COUNT(DISTINCT property_name) as unique_properties
    FROM landscape.tbl_rental_comparable
    """
)

# 4. Sample rent comps
run_query(
    "Sample Rent Comps (first 5)",
    """
    SELECT id, property_name, city, state, units, 
           avg_rent, occupancy_rate, year_built
    FROM landscape.tbl_rental_comparable
    ORDER BY id DESC
    LIMIT 5
    """
)

# 5. Cap Rate Comps
run_query(
    "Cap Rate Comps: Structure",
    """
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'landscape' AND table_name = 'tbl_cap_rate_comps'
    ORDER BY ordinal_position
    """
)

run_query(
    "Cap Rate Comps: Sample data",
    """
    SELECT *
    FROM landscape.tbl_cap_rate_comps
    LIMIT 5
    """
)

# 6. Market Rate Analysis
run_query(
    "Market Rate Analysis: Row count",
    """
    SELECT COUNT(*) as total_analyses,
           COUNT(DISTINCT project_id) as projects_analyzed
    FROM landscape.tbl_market_rate_analysis
    """
)

# 7. Competitive Projects
run_query(
    "Competitive Projects: Count and sample",
    """
    SELECT COUNT(*) as total_competitive_projects
    FROM landscape.market_competitive_projects
    """
)

run_query(
    "Sample Competitive Projects",
    """
    SELECT id, project_name, city, state, units, year_built, 
           asking_rent_avg, occupancy_rate
    FROM landscape.market_competitive_projects
    LIMIT 5
    """
)

# 8. Document Extracted Facts
run_query(
    "Extracted Facts: Row count and types",
    """
    SELECT COUNT(*) as total_facts,
           COUNT(DISTINCT fact_type) as fact_types,
           COUNT(DISTINCT doc_id) as documents_with_facts
    FROM landscape.doc_extracted_facts
    """
)

run_query(
    "Sample Extracted Facts",
    """
    SELECT fact_type, fact_key, fact_value, doc_id
    FROM landscape.doc_extracted_facts
    LIMIT 10
    """
)

print("\n" + "=" * 80)
print("Platform Intelligence Schema Discovery Complete")
print("=" * 80)
