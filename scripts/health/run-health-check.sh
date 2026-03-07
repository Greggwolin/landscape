#!/bin/bash
# Landscape Platform Health Check — Orchestrator
# Runs all health agents and produces a consolidated JSON report
# Usage: ./run-health-check.sh [all|quick|db]
#   all   = all 6 agents (default)
#   quick = coreui + django routes + claudemd (no DB needed)
#   db    = extraction queue + dead tools + allowed updates (DB required)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MODE="${1:-all}"
REPORT_DIR="$REPO_ROOT/docs/UX/health-reports"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
REPORT_FILE="$REPORT_DIR/health-$TIMESTAMP.json"

mkdir -p "$REPORT_DIR"

results=()

run_agent() {
  local name="$1"
  local cmd="$2"
  echo "  Running $name..." >&2
  local output
  output=$(eval "$cmd" 2>/dev/null) || output="{\"agent\":\"$name\",\"status\":\"ERROR\",\"message\":\"Script failed\"}"
  results+=("$output")
}

echo "🏥 Landscape Health Check — $MODE mode" >&2
echo "   Repo: $REPO_ROOT" >&2
echo "" >&2

# Quick agents (no DB)
if [ "$MODE" = "all" ] || [ "$MODE" = "quick" ]; then
  run_agent "coreui-compliance" "bash $SCRIPT_DIR/coreui-audit.sh $REPO_ROOT"
  run_agent "django-route-enforcer" "bash $SCRIPT_DIR/django-route-enforcer.sh $REPO_ROOT"
  run_agent "claudemd-sync" "bash $SCRIPT_DIR/claudemd-sync.sh $REPO_ROOT"
fi

# DB agents
if [ "$MODE" = "all" ] || [ "$MODE" = "db" ]; then
  run_agent "extraction-queue" "bash $SCRIPT_DIR/extraction-queue.sh $REPO_ROOT"
  run_agent "dead-tools" "python3 $SCRIPT_DIR/dead-tools.py $REPO_ROOT"
  run_agent "allowed-updates" "python3 $SCRIPT_DIR/allowed-updates-audit.py $REPO_ROOT"
fi

# Assemble report
echo "{" > "$REPORT_FILE"
echo "  \"report\": \"Landscape Platform Health Check\"," >> "$REPORT_FILE"
echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$REPORT_FILE"
echo "  \"mode\": \"$MODE\"," >> "$REPORT_FILE"
echo "  \"branch\": \"$(cd $REPO_ROOT && git branch --show-current 2>/dev/null || echo 'unknown')\"," >> "$REPORT_FILE"
echo "  \"results\": [" >> "$REPORT_FILE"

first=true
for r in "${results[@]}"; do
  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> "$REPORT_FILE"
  fi
  echo "    $r" >> "$REPORT_FILE"
done

echo "" >> "$REPORT_FILE"
echo "  ]" >> "$REPORT_FILE"
echo "}" >> "$REPORT_FILE"

# Print summary to stderr
echo "" >&2
echo "📋 Results:" >&2
for r in "${results[@]}"; do
  agent=$(echo "$r" | python3 -c "import sys,json; print(json.load(sys.stdin).get('agent','?'))" 2>/dev/null || echo "?")
  status=$(echo "$r" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','?'))" 2>/dev/null || echo "?")
  case "$status" in
    PASS) icon="✅" ;;
    WARN) icon="⚠️" ;;
    FAIL) icon="❌" ;;
    *)    icon="❓" ;;
  esac
  echo "   $icon $agent: $status" >&2
done

echo "" >&2
echo "📄 Full report: $REPORT_FILE" >&2

# Output the report path for callers
echo "$REPORT_FILE"
