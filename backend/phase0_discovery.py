#!/usr/bin/env python
"""
Phase 0 Discovery for Market Intelligence Agent
Read-only queries to understand database structure and available data
"""

import os
import sys
import django

# Setup Django
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
            # Print column headers
            headers = [desc[0] for desc in cursor.description]
            print(" | ".join(headers))
            print("-" * 80)
            
            # Print rows
            rows = cursor.fetchall()
            if rows:
                for row in rows:
                    print(" | ".join(str(val) if val is not None else 'NULL' for val in row))
                print(f"\nTotal rows: {len(rows)}")
            else:
                print("(No rows returned)")
        else:
            print("(Query executed successfully, no results)")

# Query 1: Available market metrics
run_query(
    "Query 1: Available Market Metrics",
    """
    SELECT DISTINCT metric_type, source, geography_type 
    FROM landscape.market_activity 
    ORDER BY metric_type
    """
)

# Query 2: Data volume and recency
run_query(
    "Query 2: Data Volume and Recency",
    """
    SELECT COUNT(*) as total_rows, 
           MIN(period_end_date) as earliest_date, 
           MAX(period_end_date) as latest_date 
    FROM landscape.market_activity
    """
)

# Query 3: Project table structure
run_query(
    "Query 3: Project Table Structure",
    """
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'landscape' AND table_name = 'tbl_project' 
    ORDER BY ordinal_position
    """
)

# Query 4: Project assumption table structure
run_query(
    "Query 4: Project Assumption Table Structure",
    """
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'landscape' AND table_name = 'tbl_project_assumption' 
    ORDER BY ordinal_position
    """
)

# Query 5: Market assumptions table structure
run_query(
    "Query 5: Market Assumptions Table Structure",
    """
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'landscape' AND table_name = 'market_assumptions' 
    ORDER BY ordinal_position
    """
)

# Query 6: Active project types (using 'is_active' field)
run_query(
    "Query 6: Active Project Types",
    """
    SELECT project_type, COUNT(*) as count
    FROM landscape.tbl_project 
    WHERE is_active = true
    GROUP BY project_type
    ORDER BY count DESC
    """
)

# Query 7: Check if agent tables exist
run_query(
    "Query 7: Agent Tables Existence",
    """
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'landscape' 
      AND table_name IN ('agent_insight', 'agent_run_log')
    """
)

# Additional discovery: Check for MSA/geography fields in projects
run_query(
    "Query 8: Sample Projects with Geography Info",
    """
    SELECT project_id, project_name, project_type, is_active, city, state, market, msa_id, 
           cap_rate_current, cap_rate_proforma, current_noi, proforma_noi
    FROM landscape.tbl_project 
    WHERE is_active = true
    LIMIT 10
    """
)

# Check what assumption fields exist
run_query(
    "Query 9: Sample Project Assumptions",
    """
    SELECT *
    FROM landscape.tbl_project_assumption
    LIMIT 5
    """
)

print("\n" + "=" * 80)
print("Phase 0 Discovery Complete")
print("=" * 80)
