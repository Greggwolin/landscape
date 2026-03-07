#!/bin/bash
# Extraction Queue Monitor — Landscape Platform
# Checks for stuck/failed extractions via Neon DB
# Output: JSON to stdout

set -euo pipefail

REPO_ROOT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Load DB URL from .env.local
if [ -f "$REPO_ROOT/.env.local" ]; then
  DB_URL=$(grep "^DATABASE_URL=" "$REPO_ROOT/.env.local" | cut -d= -f2- | tr -d '"' | tr -d "'")
fi
DB_URL="${DB_URL:-${NEON_DATABASE_URL:-}}"

if [ -z "$DB_URL" ]; then
  echo '{"agent":"extraction-queue-monitor","status":"ERROR","message":"No DATABASE_URL found"}'
  exit 0
fi

# Check if the staging table exists
table_exists=$(psql "$DB_URL" -t -A -c "
  SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = 'landscape' AND table_name = 'tbl_document_extraction'
" 2>/dev/null || echo "0")

if [ "$table_exists" = "0" ]; then
  echo '{"agent":"extraction-queue-monitor","status":"SKIP","message":"Extraction table not found"}'
  exit 0
fi

# Pending count
pending=$(psql "$DB_URL" -t -A -c "
  SELECT COUNT(*) FROM landscape.tbl_document_extraction WHERE status = 'pending'
" 2>/dev/null || echo "0")

# Stuck (pending > 2 hours)
stuck=$(psql "$DB_URL" -t -A -c "
  SELECT COUNT(*) FROM landscape.tbl_document_extraction 
  WHERE status = 'pending' AND created_at < NOW() - INTERVAL '2 hours'
" 2>/dev/null || echo "0")

# Failed in last 24h
failed=$(psql "$DB_URL" -t -A -c "
  SELECT COUNT(*) FROM landscape.tbl_document_extraction 
  WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours'
" 2>/dev/null || echo "0")

# Determine status
pending=${pending:-0}
stuck=${stuck:-0}
failed=${failed:-0}

if [ "$stuck" -gt 5 ] || [ "$pending" -gt 15 ]; then
  status="FAIL"
elif [ "$stuck" -gt 0 ] || [ "$pending" -gt 5 ] || [ "$failed" -gt 3 ]; then
  status="WARN"
else
  status="PASS"
fi

cat <<EOF
{
  "agent": "extraction-queue-monitor",
  "timestamp": "$TIMESTAMP",
  "status": "$status",
  "pending": $pending,
  "stuck_over_2h": $stuck,
  "failed_24h": $failed
}
EOF
