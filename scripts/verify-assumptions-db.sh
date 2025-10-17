#!/bin/bash

# ============================================================================
# Verify Multifamily Assumptions Database Setup
# ============================================================================

echo "========================================"
echo "Verifying Assumptions Database Tables"
echo "========================================"
echo ""

# Database connection string
DB_HOST="ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech"
DB_USER="neondb_owner"
DB_NAME="land_v2"

# Check if PGPASSWORD is set
if [ -z "$PGPASSWORD" ]; then
    export PGPASSWORD="npg_bps3EShU9WFM"
fi

# Function to run SQL and display results
run_query() {
    local query="$1"
    local description="$2"

    echo "📋 $description"
    /opt/homebrew/bin/psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "$query"
    echo ""
}

# 1. Check all assumption tables exist
echo "1️⃣ Checking assumption tables..."
run_query "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'landscape'
AND (
    table_name LIKE '%property_acquisition%'
    OR table_name LIKE '%revenue%'
    OR table_name LIKE '%vacancy%'
    OR table_name LIKE '%capex%'
    OR table_name LIKE '%equity_structure%'
    OR table_name LIKE '%waterfall%'
)
ORDER BY table_name;
" "Assumption Tables"

# 2. Check Project 11 data
echo "2️⃣ Checking Project 11 assumption data..."
run_query "
SELECT
    'Acquisition' as table_name,
    COUNT(*) as record_count,
    purchase_price,
    acquisition_date,
    hold_period_years,
    exit_cap_rate
FROM landscape.tbl_property_acquisition
WHERE project_id = 11
GROUP BY purchase_price, acquisition_date, hold_period_years, exit_cap_rate;
" "Project 11 - Acquisition Data"

run_query "
SELECT
    'Revenue Rent' as table_name,
    COUNT(*) as record_count,
    current_rent_psf,
    occupancy_pct,
    market_rent_psf
FROM landscape.tbl_revenue_rent
WHERE project_id = 11
GROUP BY current_rent_psf, occupancy_pct, market_rent_psf;
" "Project 11 - Revenue Rent Data"

run_query "
SELECT
    'Other Income' as table_name,
    COUNT(*) as record_count,
    other_income_per_unit_monthly,
    parking_spaces
FROM landscape.tbl_revenue_other
WHERE project_id = 11
GROUP BY other_income_per_unit_monthly, parking_spaces;
" "Project 11 - Other Income Data"

run_query "
SELECT
    'Equity Structure' as table_name,
    COUNT(*) as record_count,
    lp_ownership_pct,
    gp_ownership_pct,
    preferred_return_pct
FROM landscape.tbl_equity_structure
WHERE project_id = 11
GROUP BY lp_ownership_pct, gp_ownership_pct, preferred_return_pct;
" "Project 11 - Equity Structure Data"

# 3. Check indexes
echo "3️⃣ Checking assumption table indexes..."
run_query "
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'landscape'
AND (
    indexname LIKE '%acquisition%'
    OR indexname LIKE '%revenue%'
    OR indexname LIKE '%vacancy%'
    OR indexname LIKE '%capex%'
    OR indexname LIKE '%equity%'
)
ORDER BY tablename, indexname;
" "Assumption Table Indexes"

echo "========================================"
echo "✅ Database verification complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Navigate to: http://localhost:3000/projects/11/assumptions"
echo "2. Test mode switching (Napkin → Mid → Pro)"
echo "3. Verify auto-save functionality"
echo "4. Check auto-calculations work"
echo ""
