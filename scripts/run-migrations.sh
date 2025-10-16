#!/bin/bash
# Migration Runner Script
# Version: v1.0 (2025-10-13)
#
# Runs all pending migrations on specified Neon branch
# Usage: ./scripts/run-migrations.sh [branch_name]

set -e

BRANCH_NAME=${1:-main}
MIGRATIONS_DIR="./migrations"

echo "🔄 Running migrations on branch: $BRANCH_NAME"

# Get connection string with migration role (has DDL privileges)
if [ "$BRANCH_NAME" = "main" ]; then
  # Production - use environment variable
  if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set for main branch"
    exit 1
  fi
  CONNECTION_STRING=$DATABASE_URL
else
  # Preview branch
  CONNECTION_STRING=$(neonctl connection-string \
    --project-id "$NEON_PROJECT_ID" \
    --branch "$BRANCH_NAME" \
    --role landscape_migrate \
    --database land_v2)
fi

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ Error: Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

# Create migrations tracking table if it doesn't exist
echo "📝 Ensuring migrations tracking table exists..."
psql "$CONNECTION_STRING" <<EOF
CREATE SCHEMA IF NOT EXISTS landscape;

CREATE TABLE IF NOT EXISTS landscape._migrations (
  migration_id SERIAL PRIMARY KEY,
  migration_file VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  checksum VARCHAR(64)
);
EOF

# Get list of applied migrations
APPLIED_MIGRATIONS=$(psql "$CONNECTION_STRING" -t -c "SELECT migration_file FROM landscape._migrations ORDER BY migration_id")

# Run each migration file
MIGRATION_COUNT=0
for MIGRATION_FILE in "$MIGRATIONS_DIR"/*.sql; do
  if [ ! -f "$MIGRATION_FILE" ]; then
    continue
  fi

  FILENAME=$(basename "$MIGRATION_FILE")

  # Check if already applied
  if echo "$APPLIED_MIGRATIONS" | grep -q "$FILENAME"; then
    echo "⏭️  Skipping $FILENAME (already applied)"
    continue
  fi

  echo "▶️  Applying $FILENAME..."

  # Calculate checksum
  CHECKSUM=$(sha256sum "$MIGRATION_FILE" | cut -d' ' -f1)

  # Run migration
  if psql "$CONNECTION_STRING" -f "$MIGRATION_FILE"; then
    # Record migration
    psql "$CONNECTION_STRING" <<EOF
INSERT INTO landscape._migrations (migration_file, checksum)
VALUES ('$FILENAME', '$CHECKSUM');
EOF
    echo "✅ $FILENAME applied successfully"
    MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
  else
    echo "❌ Error applying $FILENAME"
    exit 1
  fi
done

if [ $MIGRATION_COUNT -eq 0 ]; then
  echo "ℹ️  No new migrations to apply"
else
  echo ""
  echo "✅ Applied $MIGRATION_COUNT migration(s) successfully!"
fi

# Show current migration status
echo ""
echo "📊 Migration Status:"
psql "$CONNECTION_STRING" -c "SELECT migration_file, applied_at FROM landscape._migrations ORDER BY migration_id DESC LIMIT 5"
