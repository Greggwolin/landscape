#!/bin/bash
# Django API Route Enforcer — Landscape Platform
# Flags new API routes added to Next.js instead of Django
# Output: JSON to stdout

set -euo pipefail

REPO_ROOT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Exempted Next.js API paths (legitimate)
EXEMPTIONS="src/app/api/auth/|src/app/api/webhooks/|src/app/api/revalidate/|src/app/api/uploadthing"

cd "$REPO_ROOT"

# Find new/modified files in src/app/api/ vs main
violations=0
violation_list=""

if git rev-parse --verify main &>/dev/null; then
  while IFS= read -r file; do
    if echo "$file" | grep -qE "$EXEMPTIONS"; then
      continue
    fi
    violations=$((violations + 1))
    violation_list="$violation_list\"$file\","
  done < <(git diff main --name-only --diff-filter=A -- "src/app/api/" 2>/dev/null || true)
fi

# Also count total Next.js API routes for context
total_nextjs=$(find src/app/api -name "route.ts" -o -name "route.js" 2>/dev/null | wc -l | tr -d ' ')
total_django=$(find backend/apps -name "views.py" 2>/dev/null | wc -l | tr -d ' ')

if [ "$violations" -gt 0 ]; then
  status="FAIL"
else
  status="PASS"
fi

# Clean trailing comma
violation_list="${violation_list%,}"

cat <<EOF
{
  "agent": "django-api-route-enforcer",
  "timestamp": "$TIMESTAMP",
  "status": "$status",
  "new_nextjs_violations": $violations,
  "violation_files": [${violation_list}],
  "context": {
    "total_nextjs_routes": $total_nextjs,
    "total_django_viewsets": $total_django
  }
}
EOF
