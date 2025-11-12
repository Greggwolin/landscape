#!/bin/bash

# Knowledge Foundation Migration Runner
# Date: November 12, 2025
# Session: GR47

set -e  # Exit on error

echo "================================================"
echo "Knowledge Foundation Migration - Phase 1"
echo "================================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Usage:"
    echo "  export DATABASE_URL='postgresql://user:pass@host/db'"
    echo "  ./scripts/run-knowledge-migration.sh"
    exit 1
fi

echo "🔍 Checking database connection..."
if ! psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ ERROR: Cannot connect to database"
    echo "Please check your DATABASE_URL"
    exit 1
fi
echo "✅ Database connection successful"
echo ""

# Ask for confirmation
echo "This will create 6 new tables in the landscape schema:"
echo "  - knowledge_entities"
echo "  - knowledge_facts"
echo "  - knowledge_sessions"
echo "  - knowledge_interactions"
echo "  - knowledge_embeddings"
echo "  - knowledge_insights"
echo ""
read -p "Continue with migration? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
fi

echo ""
echo "🚀 Running migration..."
echo ""

# Run the migration
if psql "$DATABASE_URL" -f db/migrations/001_knowledge_foundation.up.sql; then
    echo ""
    echo "================================================"
    echo "✅ Migration completed successfully!"
    echo "================================================"
    echo ""

    # Verify tables were created
    echo "📊 Verifying tables..."
    psql "$DATABASE_URL" -c "
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'landscape'
          AND table_name LIKE 'knowledge_%'
        ORDER BY table_name;
    "

    echo ""
    echo "✅ All knowledge tables created successfully"
    echo ""
    echo "Next steps:"
    echo "  1. Test API endpoints: npm run dev"
    echo "  2. Start a session: POST /api/knowledge/sessions/start"
    echo "  3. Ingest documents: POST /api/knowledge/ingest"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo ""
    echo "To rollback, run:"
    echo "  psql \$DATABASE_URL -f db/migrations/001_knowledge_foundation.down.sql"
    exit 1
fi
