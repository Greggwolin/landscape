#!/bin/bash
# CoreUI Compliance Auditor — Landscape Platform
# Scans for styling violations: hardcoded hex, forbidden Tailwind, MUI imports, inline styles
# Output: JSON to stdout

set -euo pipefail

REPO_ROOT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
SRC="$REPO_ROOT/src"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Counters
mui_count=0
hex_css_count=0
forbidden_tw_count=0
inline_style_count=0
dark_variant_count=0

mui_files=""
hex_files=""
forbidden_files=""
inline_files=""
dark_files=""

# --- MUI Imports ---
while IFS= read -r line; do
  file=$(echo "$line" | cut -d: -f1 | sed "s|$REPO_ROOT/||")
  mui_count=$((mui_count + 1))
  mui_files="$mui_files\"$file\","
done < <(grep -rn "@mui/" "$SRC" --include="*.tsx" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=_archive 2>/dev/null || true)

# --- Hardcoded hex in CSS files ---
while IFS= read -r line; do
  file=$(echo "$line" | cut -d: -f1 | sed "s|$REPO_ROOT/||")
  hex_css_count=$((hex_css_count + 1))
done < <(grep -rn '#[0-9a-fA-F]\{3,8\}' "$SRC/styles" "$SRC/components" \
  --include="*.css" --include="*.scss" \
  --exclude-dir=node_modules \
  | grep -v "tokens\.css" | grep -v "coreui-theme\.css" 2>/dev/null || true)

# --- Forbidden Tailwind patterns ---
while IFS= read -r line; do
  forbidden_tw_count=$((forbidden_tw_count + 1))
done < <(grep -rn 'bg-slate-\|bg-gray-\|bg-zinc-\|text-slate-\|text-gray-' "$SRC" \
  --include="*.tsx" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=_archive 2>/dev/null || true)

# --- dark: Tailwind variants ---
while IFS= read -r line; do
  dark_variant_count=$((dark_variant_count + 1))
done < <(grep -rn 'dark:' "$SRC" \
  --include="*.tsx" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=_archive \
  | grep -v "data-coreui-theme" | grep -v "//.*dark:" | grep -v "\.dark-theme" 2>/dev/null || true)

# --- Inline style={{}} ---
while IFS= read -r line; do
  inline_style_count=$((inline_style_count + 1))
done < <(grep -rn 'style={{' "$SRC" \
  --include="*.tsx" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=_archive 2>/dev/null || true)

# --- Calculate totals ---
total=$((mui_count + hex_css_count + forbidden_tw_count + dark_variant_count + inline_style_count))

# --- Determine status ---
if [ "$mui_count" -gt 0 ] || [ "$forbidden_tw_count" -gt 0 ]; then
  status="FAIL"
elif [ "$total" -gt 100 ]; then
  status="WARN"
else
  status="PASS"
fi

# --- Output JSON ---
cat <<EOF
{
  "agent": "coreui-compliance-auditor",
  "timestamp": "$TIMESTAMP",
  "status": "$status",
  "total_violations": $total,
  "breakdown": {
    "mui_imports": $mui_count,
    "hardcoded_hex_css": $hex_css_count,
    "forbidden_tailwind": $forbidden_tw_count,
    "dark_variants": $dark_variant_count,
    "inline_styles": $inline_style_count
  }
}
EOF
