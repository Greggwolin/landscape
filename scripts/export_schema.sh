#!/bin/bash
# Rich Schema Export - run from project root
#
# Exports comprehensive schema metadata from Neon PostgreSQL to docs/schema/
# Output: landscape_rich_schema_YYYY-MM-DD.json
#
# Usage:
#   ./scripts/export_schema.sh
#   ./scripts/export_schema.sh --verbose
#
set -e

# Navigate to project root (parent of scripts directory)
cd "$(dirname "$0")/.." || exit 1

echo "================================================"
echo "  Landscape Rich Schema Export"
echo "================================================"
echo ""

# Activate virtual environment if it exists
if [ -d "backend/venv" ]; then
    source backend/venv/bin/activate
fi

# Change to backend directory and run command
cd backend || exit 1

# Pass through any command line arguments
python manage.py export_rich_schema "$@"

echo ""
echo "================================================"
echo "  Output Files"
echo "================================================"
ls -la ../docs/schema/*.json 2>/dev/null || echo "No JSON files found"
