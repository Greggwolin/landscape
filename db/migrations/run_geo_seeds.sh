#!/bin/bash
# run_geo_seeds.sh
# Populates the geo_xwalk table with seed data for Arizona and California

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Geography Seed Data Migration"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    echo ""
    echo "Please set it to your PostgreSQL connection string:"
    echo "  export DATABASE_URL='postgresql://user:pass@host/database'"
    echo ""
    echo "For Neon database:"
    echo "  export DATABASE_URL='postgresql://neondb_owner:npg_XXX@ep-XXX.us-west-2.aws.neon.tech/neondb?sslmode=require'"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${YELLOW}Database:${NC} $DATABASE_URL"
echo ""

# Check current state
echo "Checking current geo_xwalk state..."
CURRENT_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM public.geo_xwalk;" 2>/dev/null || echo "0")
CURRENT_COUNT=$(echo $CURRENT_COUNT | xargs)  # Trim whitespace

if [ "$CURRENT_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}Found ${CURRENT_COUNT} existing records in geo_xwalk${NC}"
    echo ""

    # Show breakdown
    echo "Current breakdown:"
    psql "$DATABASE_URL" -c "
        SELECT geo_level, COUNT(*) as count
        FROM public.geo_xwalk
        GROUP BY geo_level
        ORDER BY CASE geo_level
            WHEN 'US' THEN 1
            WHEN 'STATE' THEN 2
            WHEN 'MSA' THEN 3
            WHEN 'COUNTY' THEN 4
            WHEN 'CITY' THEN 5
            ELSE 6
        END;
    "
    echo ""
else
    echo -e "${GREEN}geo_xwalk table is empty. Will populate with seed data.${NC}"
    echo ""
fi

# Run Arizona seed
echo "=========================================="
echo "Running Arizona seed data..."
echo "=========================================="
psql "$DATABASE_URL" -f "$SCRIPT_DIR/20251008_02_geo_seed.sql"
echo -e "${GREEN}✓ Arizona data loaded${NC}"
echo ""

# Run California seed
echo "=========================================="
echo "Running California seed data..."
echo "=========================================="
psql "$DATABASE_URL" -f "$SCRIPT_DIR/20251029_01_california_geo_seed.sql"
echo -e "${GREEN}✓ California data loaded${NC}"
echo ""

# Show final state
echo "=========================================="
echo "Final State"
echo "=========================================="
NEW_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM public.geo_xwalk;")
NEW_COUNT=$(echo $NEW_COUNT | xargs)

echo -e "${GREEN}Total records: ${NEW_COUNT}${NC}"
echo ""

echo "Breakdown by geography level:"
psql "$DATABASE_URL" -c "
    SELECT geo_level, COUNT(*) as count
    FROM public.geo_xwalk
    GROUP BY geo_level
    ORDER BY CASE geo_level
        WHEN 'US' THEN 1
        WHEN 'STATE' THEN 2
        WHEN 'MSA' THEN 3
        WHEN 'COUNTY' THEN 4
        WHEN 'CITY' THEN 5
        ELSE 6
    END;
"
echo ""

# Verify key cities
echo "Verifying key cities..."
psql "$DATABASE_URL" -c "
    SELECT usps_city, usps_state, geo_id, geo_name
    FROM public.geo_xwalk
    WHERE geo_level = 'CITY'
      AND usps_state IN ('AZ', 'CA')
    ORDER BY usps_state, usps_city;
"
echo ""

echo -e "${GREEN}=========================================="
echo "Migration Complete!"
echo "==========================================${NC}"
echo ""
echo "You can now use the Market Intelligence features for:"
echo "  • Arizona cities (Phoenix)"
echo "  • California cities (Hawthorne, Los Angeles, San Francisco, San Diego)"
echo ""
echo "To test the Hawthorne lookup:"
echo "  curl 'http://localhost:3000/api/market/geos?city=Hawthorne&state=CA'"
