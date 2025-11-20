#!/bin/bash
# Phase 3E: Frontend Terminology Migration Script
# Systematically updates all frontend files from old to new terminology
# Safe to run multiple times (idempotent)

set -e  # Exit on error

echo "========================================="
echo "Phase 3E: Frontend Terminology Migration"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backup directory
BACKUP_DIR="./backup_phase3e_$(date +%Y%m%d_%H%M%S)"

# Directories to search
SEARCH_DIRS=(
  "src/components"
  "src/hooks"
  "src/app"
  "src/utils"
  "src/lib"
)

echo "Step 1: Creating backup..."
mkdir -p "$BACKUP_DIR"
for dir in "${SEARCH_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "  Backing up $dir..."
    cp -r "$dir" "$BACKUP_DIR/"
  fi
done
echo -e "${GREEN}✓ Backup created: $BACKUP_DIR${NC}"
echo ""

echo "Step 2: Finding files to update..."
FILES_TO_UPDATE=()
for dir in "${SEARCH_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    while IFS= read -r file; do
      FILES_TO_UPDATE+=("$file")
    done < <(find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null)
  fi
done
echo -e "${GREEN}✓ Found ${#FILES_TO_UPDATE[@]} files${NC}"
echo ""

echo "Step 3: Analyzing files for old terminology..."
FILES_NEEDING_UPDATE=()
for file in "${FILES_TO_UPDATE[@]}"; do
  if grep -q -E "(container_id|container_level|lifecycle_stage|LifecycleStage|ContainerLevel)" "$file" 2>/dev/null; then
    FILES_NEEDING_UPDATE+=("$file")
  fi
done
echo -e "${YELLOW}Found ${#FILES_NEEDING_UPDATE[@]} files needing updates${NC}"
for file in "${FILES_NEEDING_UPDATE[@]}"; do
  echo "  - $file"
done
echo ""

if [ ${#FILES_NEEDING_UPDATE[@]} -eq 0 ]; then
  echo -e "${GREEN}✓ No files need updating - all terminology already migrated!${NC}"
  exit 0
fi

read -p "Proceed with updating ${#FILES_NEEDING_UPDATE[@]} files? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted. Backup saved to: $BACKUP_DIR"
  exit 1
fi
echo ""

echo "Step 4: Executing replacements..."

# Replacement function
replace_in_file() {
  local file="$1"
  local old="$2"
  local new="$3"

  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/${old}/${new}/g" "$file"
  else
    # Linux
    sed -i "s/${old}/${new}/g" "$file"
  fi
}

UPDATED_COUNT=0

for file in "${FILES_NEEDING_UPDATE[@]}"; do
  echo "Processing: $file"

  CHANGES_MADE=false

  # Apply replacements (order matters!)
  if grep -q "container_id" "$file" 2>/dev/null; then
    replace_in_file "$file" "container_id" "division_id"
    echo "  ✓ Replaced: container_id → division_id"
    CHANGES_MADE=true
  fi

  if grep -q "containerId" "$file" 2>/dev/null; then
    replace_in_file "$file" "containerId" "divisionId"
    echo "  ✓ Replaced: containerId → divisionId"
    CHANGES_MADE=true
  fi

  if grep -q "container_level" "$file" 2>/dev/null; then
    replace_in_file "$file" "container_level" "tier"
    echo "  ✓ Replaced: container_level → tier"
    CHANGES_MADE=true
  fi

  if grep -q "containerLevel" "$file" 2>/dev/null; then
    replace_in_file "$file" "containerLevel" "tier"
    echo "  ✓ Replaced: containerLevel → tier"
    CHANGES_MADE=true
  fi

  if grep -q "lifecycle_stage" "$file" 2>/dev/null; then
    replace_in_file "$file" "lifecycle_stage" "activity"
    echo "  ✓ Replaced: lifecycle_stage → activity"
    CHANGES_MADE=true
  fi

  if grep -q "lifecycleStage" "$file" 2>/dev/null; then
    replace_in_file "$file" "lifecycleStage" "activity"
    echo "  ✓ Replaced: lifecycleStage → activity"
    CHANGES_MADE=true
  fi

  if grep -q "ContainerLevel" "$file" 2>/dev/null; then
    replace_in_file "$file" "ContainerLevel" "Tier"
    echo "  ✓ Replaced: ContainerLevel → Tier"
    CHANGES_MADE=true
  fi

  if grep -q "LifecycleStage" "$file" 2>/dev/null; then
    replace_in_file "$file" "LifecycleStage" "Activity"
    echo "  ✓ Replaced: LifecycleStage → Activity"
    CHANGES_MADE=true
  fi

  if [ "$CHANGES_MADE" = true ]; then
    UPDATED_COUNT=$((UPDATED_COUNT + 1))
    echo -e "${GREEN}  ✓ Updated${NC}"
  else
    echo -e "${YELLOW}  - Skipped (no changes needed)${NC}"
  fi
  echo ""
done

echo "========================================="
echo "Migration Summary"
echo "========================================="
echo "Files updated: $UPDATED_COUNT"
echo "Backup location: $BACKUP_DIR"
echo ""

echo "Step 5: Running validation..."
echo ""

# Type check
echo "Running TypeScript type check..."
if npm run type-check 2>&1 | tee /tmp/typecheck.log; then
  echo -e "${GREEN}✓ Type check passed${NC}"
else
  echo -e "${RED}✗ Type check failed - see output above${NC}"
  echo "Review errors and manually fix if needed"
  echo "Backup available at: $BACKUP_DIR"
  exit 1
fi
echo ""

# Check for any remaining old terminology (as warnings)
echo "Checking for remaining old terminology..."
REMAINING_ISSUES=0
for dir in "${SEARCH_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    if grep -r -n -E "(container_id|container_level|lifecycle_stage)" "$dir" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// " | head -5; then
      REMAINING_ISSUES=1
    fi
  fi
done

if [ $REMAINING_ISSUES -gt 0 ]; then
  echo -e "${YELLOW}⚠ Found some remaining instances of old terminology${NC}"
  echo "These may be in comments, strings, or intentional backward compatibility"
  echo "Review manually if needed"
else
  echo -e "${GREEN}✓ No remaining old terminology found${NC}"
fi
echo ""

echo "========================================="
echo "Phase 3E Migration Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff"
echo "2. Run 'npm run dev' and test the application"
echo "3. If issues found, restore from: $BACKUP_DIR"
echo "4. If successful, commit the changes"
echo ""
echo "To restore from backup:"
echo "  rm -rf src/"
echo "  cp -r $BACKUP_DIR/* ."
echo ""
