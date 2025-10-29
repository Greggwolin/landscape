#!/bin/bash
# ============================================================================
# Chadron Clean Slate Import Runner
# ============================================================================

set -e

echo "============================================"
echo "Chadron Clean Slate Import"
echo "============================================"
echo ""

# Check for virtual environment
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run from backend directory."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check for required packages
python -c "import psycopg2" 2>/dev/null || {
    echo "Installing psycopg2..."
    pip install psycopg2-binary
}

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in environment"
    exit 1
fi

# Run the import script
echo "Starting import..."
echo ""
python scripts/import_chadron_clean_slate.py

echo ""
echo "============================================"
echo "Import process complete"
echo "============================================"
