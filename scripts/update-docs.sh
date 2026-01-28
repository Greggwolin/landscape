#!/bin/bash
# =============================================================================
# Update Documentation Script
# =============================================================================
#
# This script automates documentation updates for the Landscape project.
# It can be run by any AI assistant or manually.
#
# Usage: ./scripts/update-docs.sh [options]
#
# Options:
#   --scan-only    Only scan for changes, don't prompt for updates
#   --help         Show this help message
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get today's date
TODAY=$(date +%Y-%m-%d)
TODAY_DISPLAY=$(date +"%B %d, %Y")

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Landscape Documentation Update Script              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Date: ${TODAY_DISPLAY}${NC}"
echo ""

# =============================================================================
# Step 1: Check for session notes
# =============================================================================
echo -e "${GREEN}━━━ Step 1: Checking Session Notes ━━━${NC}"

SESSION_NOTE=$(ls docs/09_session_notes/${TODAY}-*.md 2>/dev/null | head -1 || echo "")

if [ -n "$SESSION_NOTE" ]; then
    echo -e "✅ Found session note for today: ${SESSION_NOTE}"
else
    echo -e "⚠️  No session note found for today (${TODAY})"
    echo -e "   Expected pattern: docs/09_session_notes/${TODAY}-*.md"
fi
echo ""

# =============================================================================
# Step 2: Recent Git Activity
# =============================================================================
echo -e "${GREEN}━━━ Step 2: Recent Git Activity (Last 7 Days) ━━━${NC}"

echo -e "\n${YELLOW}Recent Commits:${NC}"
git log --oneline --since="7 days ago" | head -15 || echo "No recent commits"

echo -e "\n${YELLOW}Current Branch:${NC}"
git branch --show-current

echo -e "\n${YELLOW}Uncommitted Changes:${NC}"
git status --short | head -20 || echo "Working tree clean"
echo ""

# =============================================================================
# Step 3: Recently Modified Documentation
# =============================================================================
echo -e "${GREEN}━━━ Step 3: Recently Modified Documentation ━━━${NC}"

echo -e "\n${YELLOW}Modified in last 7 days:${NC}"
find docs -name "*.md" -type f -mtime -7 2>/dev/null | head -20 || echo "None found"

echo -e "\n${YELLOW}Backend READMEs modified:${NC}"
find backend -name "*.md" -type f -mtime -7 2>/dev/null | head -10 || echo "None found"
echo ""

# =============================================================================
# Step 4: Key Files Status
# =============================================================================
echo -e "${GREEN}━━━ Step 4: Key Documentation Files ━━━${NC}"

KEY_FILES=(
    "docs/00_overview/IMPLEMENTATION_STATUS.md"
    "docs/00_overview/status/IMPLEMENTATION_STATUS_25-12-21.md"
    "src/app/documentation/page.tsx"
    "backend/README.md"
    "CLAUDE.md"
)

for file in "${KEY_FILES[@]}"; do
    if [ -f "$file" ]; then
        MOD_DATE=$(stat -f "%Sm" -t "%Y-%m-%d" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d' ' -f1)
        echo -e "✅ ${file} (modified: ${MOD_DATE})"
    else
        echo -e "❌ ${file} (NOT FOUND)"
    fi
done
echo ""

# =============================================================================
# Step 5: Session Notes Index
# =============================================================================
echo -e "${GREEN}━━━ Step 5: Recent Session Notes ━━━${NC}"

echo -e "\n${YELLOW}Last 10 session notes:${NC}"
ls -t docs/09_session_notes/*.md 2>/dev/null | head -10 | while read file; do
    basename "$file"
done
echo ""

# =============================================================================
# Step 6: Documentation Center Tiles Count
# =============================================================================
echo -e "${GREEN}━━━ Step 6: Documentation Center Stats ━━━${NC}"

if [ -f "src/app/documentation/page.tsx" ]; then
    TILE_COUNT=$(grep -c "lastModified:" src/app/documentation/page.tsx 2>/dev/null || echo "0")
    echo -e "📊 Documentation tiles: ${TILE_COUNT}"

    # Find most recent tile date
    LATEST_TILE=$(grep "lastModified:" src/app/documentation/page.tsx | sed "s/.*'\([^']*\)'.*/\1/" | sort -r | head -1)
    echo -e "📅 Most recent tile date: ${LATEST_TILE}"
fi
echo ""

# =============================================================================
# Summary
# =============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        Summary                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "To update documentation, you should:"
echo -e "  1. Create/update session note: docs/09_session_notes/${TODAY}-[topic].md"
echo -e "  2. Update IMPLEMENTATION_STATUS.md with latest changes"
echo -e "  3. Add new tile to src/app/documentation/page.tsx"
echo -e "  4. Stage and commit: git add docs/ src/app/documentation/"
echo -e "  5. Push to remote: git push origin \$(git branch --show-current)"
echo ""
echo -e "${GREEN}Script completed successfully!${NC}"
