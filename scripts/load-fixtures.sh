#!/bin/bash
# Fixture Loader Script
# Version: v1.1 (2025-10-13)
#
# Loads test data fixtures for Peoria Lakes + Carney Power Center
# Usage: ./scripts/load-fixtures.sh [branch_name]

set -e

BRANCH_NAME=${1:-main}
FIXTURES_FILE="./tests/fixtures/seed-test-data.sql"

echo "🔄 Loading test fixtures on branch: $BRANCH_NAME"

# Get connection string
if [ "$BRANCH_NAME" = "main" ]; then
  # Production/main - use environment variable
  if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set for main branch"
    exit 1
  fi
  CONNECTION_STRING=$DATABASE_URL
else
  # Preview branch
  if [ -z "$NEON_PROJECT_ID" ]; then
    echo "❌ Error: NEON_PROJECT_ID not set"
    exit 1
  fi

  CONNECTION_STRING=$(neonctl connection-string \
    --project-id "$NEON_PROJECT_ID" \
    --branch "$BRANCH_NAME" \
    --role landscape_app \
    --database land_v2)
fi

# Check if fixtures file exists
if [ ! -f "$FIXTURES_FILE" ]; then
  echo "❌ Error: Fixtures file not found: $FIXTURES_FILE"
  exit 1
fi

echo "📝 Loading fixtures from: $FIXTURES_FILE"

# Run fixtures
if psql "$CONNECTION_STRING" -f "$FIXTURES_FILE"; then
  echo ""
  echo "✅ Fixtures loaded successfully!"
  echo ""

  # Show summary
  echo "📊 Fixture Summary:"
  psql "$CONNECTION_STRING" -c "
    SELECT
      project_id,
      project_name,
      project_type,
      (SELECT COUNT(*) FROM landscape.tbl_budget_items WHERE project_id=p.project_id) AS budget_items,
      (SELECT COUNT(*) FROM landscape.tbl_rent_roll WHERE project_id=p.project_id) AS leases,
      (SELECT COUNT(*) FROM landscape.tbl_absorption_schedule WHERE project_id=p.project_id) AS absorption
    FROM landscape.tbl_project p
    WHERE project_id IN (7, 8)
    ORDER BY project_id;
  "
else
  echo ""
  echo "❌ Error loading fixtures"
  exit 1
fi

echo ""
echo "🎯 Next steps:"
echo "1. Run timeline calculation: POST /api/projects/7/timeline/calculate"
echo "2. Run lease revenue calc: POST /api/projects/7/calculate-lease-revenue"
echo "3. Run lease revenue calc: POST /api/projects/8/calculate-lease-revenue"
echo "4. Run smoke tests: ./tests/fixtures/smoke-test-fixtures.sql"
