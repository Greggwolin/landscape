#!/bin/bash
# CLAUDE.md Sync Checker — Landscape Platform
# Detects files modified more recently than CLAUDE.md
# Output: JSON to stdout

set -euo pipefail

REPO_ROOT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CLAUDE_MD="$REPO_ROOT/CLAUDE.md"

if [ ! -f "$CLAUDE_MD" ]; then
  echo '{"agent":"claudemd-sync-checker","status":"ERROR","message":"CLAUDE.md not found"}'
  exit 0
fi

# Get CLAUDE.md modification time (epoch seconds)
claude_mtime=$(stat -f %m "$CLAUDE_MD" 2>/dev/null || stat -c %Y "$CLAUDE_MD" 2>/dev/null)

stale_count=0
stale_files=""

# Tracked file patterns (critical architecture files)
PATTERNS=(
  "backend/apps/*/migrations/*.py"
  "backend/apps/landscaper/tools/*.py"
  "backend/apps/*/views.py"
  "backend/apps/*/urls.py"
  "backend/apps/containers/*.py"
)

for pattern in "${PATTERNS[@]}"; do
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    file_mtime=$(stat -f %m "$file" 2>/dev/null || stat -c %Y "$file" 2>/dev/null)
    if [ "$file_mtime" -gt "$claude_mtime" ]; then
      rel_path=$(echo "$file" | sed "s|$REPO_ROOT/||")
      hours_ahead=$(( (file_mtime - claude_mtime) / 3600 ))
      stale_count=$((stale_count + 1))
      stale_files="$stale_files{\"file\":\"$rel_path\",\"hours_newer\":$hours_ahead},"
    fi
  done < <(find "$REPO_ROOT" -path "$REPO_ROOT/$pattern" -type f 2>/dev/null || true)
done

# Clean trailing comma
stale_files="${stale_files%,}"

if [ "$stale_count" -gt 5 ]; then
  status="FAIL"
elif [ "$stale_count" -gt 0 ]; then
  status="WARN"
else
  status="PASS"
fi

cat <<EOF
{
  "agent": "claudemd-sync-checker",
  "timestamp": "$TIMESTAMP",
  "status": "$status",
  "stale_file_count": $stale_count,
  "stale_files": [${stale_files}]
}
EOF
