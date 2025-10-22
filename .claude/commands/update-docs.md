# Update Documentation Command

**Trigger:** When the user says "update documentation" or types `/update-docs`

**Purpose:** Comprehensively update all documentation files, status pages, and the documentation center to reflect recent changes, then commit and push to git.

---

## WORKFLOW STEPS

### Step 1: Scan for Recent Changes (Last 7 Days)

Run these commands to identify what's changed:

```bash
# Find recently modified markdown files
find /Users/5150east/landscape/docs -name "*.md" -type f -mtime -7

# Find recently modified backend files
find /Users/5150east/landscape/backend -name "*.md" -type f -mtime -7

# Check git status for uncommitted changes
git status

# Check recent commits
git log --oneline --since="7 days ago"
```

Analyze the output to identify:
- New features implemented
- Migrations completed
- Status changes
- New API endpoints
- Configuration changes

### Step 2: Update Core Status Documents

Update these key files with current information:

#### A. Main Implementation Status
**File:** `/docs/11-implementation-status/IMPLEMENTATION_STATUS.md`

Actions:
- Update date at top of document
- Add new completed items to relevant sections
- Update progress percentages
- Add new "What's New" section if major features completed
- Mark completed items with ✅
- Update "Next Steps" section

#### B. Create Feature Completion Documents
If major features were completed in last 7 days, create completion documents:

**Template:** `/docs/11-implementation-status/[FEATURE_NAME]_COMPLETE.md`

Include:
- Completion date
- Feature overview
- What was implemented
- Files changed
- API endpoints added
- Testing completed
- Next steps

#### C. Update Financial Engine Status (if relevant)
**File:** `/docs/02-features/financial-engine/IMPLEMENTATION_STATUS.md`

Update if financial calculations or Python engine changes were made.

#### D. Update Backend READMEs (if relevant)
Check and update:
- `/backend/README.md` - Main backend guide
- `/backend/apps/financial/README.md` - Financial API docs
- `/backend/apps/containers/README.md` - Container API docs
- `/backend/apps/calculations/README.md` - Calculations API docs

Add new endpoints, update examples, refresh dates.

### Step 3: Update Documentation Center Page

**File:** `/src/app/documentation/page.tsx`

Actions:
1. **Add New Tiles** for recently completed features:
   - Use appropriate category: Status, Architecture, Migration, Component, Technical, AI
   - Add descriptive title
   - Include accurate path to document
   - Write clear 1-2 sentence description
   - Use correct icon (FileText, Book, Code, Database, Map, DollarSign)
   - Set lastModified to TODAY'S DATE

2. **Update Existing Tile Dates:**
   - Find tiles with modified documents
   - Update lastModified dates to reflect actual file modification times
   - Update descriptions if functionality changed

3. **Verify All Paths:**
   ```bash
   # Example verification
   ls -la /Users/5150east/landscape/docs/11-implementation-status/FINANCE_STRUCTURE_MIGRATION_004_COMPLETE.md
   ```

4. **Update Descriptions:**
   - Ensure descriptions accurately reflect current state
   - Mention completion status (e.g., "Phase 1 complete", "Migration 004 complete")
   - Highlight key features or improvements

### Step 4: Create Migration/Feature Documentation (If Applicable)

If a significant migration or feature was completed, create detailed documentation:

**Location:** `/docs/11-implementation-status/` or appropriate category folder

**Contents:**
- Date and status
- Overview of what changed
- Architecture changes
- Files affected
- Database changes (if any)
- API changes (if any)
- Testing completed
- Deployment notes
- Known issues
- Next steps

### Step 5: Verify Documentation Links

Run verification checks:

```bash
# Verify key documentation files exist
for path in \
  "/Users/5150east/landscape/docs/11-implementation-status/IMPLEMENTATION_STATUS.md" \
  "/Users/5150east/landscape/docs/DJANGO_BACKEND_IMPLEMENTATION.md" \
  "/Users/5150east/landscape/backend/TESTING_GUIDE.md" \
  "/Users/5150east/landscape/backend/README.md"; do
  if [ -f "$path" ]; then
    echo "✓ EXISTS: $path"
  else
    echo "✗ MISSING: $path"
  fi
done
```

### Step 6: Git Workflow - Review Changes

Before committing, review what's changed:

```bash
# See which files changed
git status

# Review documentation changes
git diff docs/
git diff backend/
git diff src/app/documentation/

# Check for any unintended changes
git diff
```

### Step 7: Git Workflow - Stage Documentation

Stage all documentation changes:

```bash
# Stage specific documentation files
git add docs/
git add backend/*.md
git add backend/apps/**/README.md
git add src/app/documentation/page.tsx

# Verify staging
git status
```

### Step 8: Git Workflow - Commit

Create a descriptive commit message:

```bash
git commit -m "docs: update documentation center and status pages

- Add [NEW_FEATURE] completion documentation
- Update IMPLEMENTATION_STATUS.md with recent progress
- Add new tiles to documentation center for [FEATURES]
- Update lastModified dates on documentation page
- Update [BACKEND_APP] README with new endpoints
- Refresh dates to $(date +%Y-%m-%d)

🤖 Generated with Claude Code
"
```

**Commit Message Guidelines:**
- Start with "docs:" prefix
- Summarize main changes in first line
- Use bullet points for details
- Mention specific features/files updated
- Include emoji at end: 🤖

### Step 9: Git Workflow - Push

Push changes to current branch:

```bash
# Push to current branch
git push origin $(git branch --show-current)
```

### Step 10: Summary Report

Provide a summary to the user:

**Report should include:**
1. ✅ Files updated (with paths)
2. ✅ New documentation tiles added
3. ✅ Dates updated
4. ✅ Git commit created
5. ✅ Changes pushed to remote
6. 📊 Summary statistics (X files updated, Y new docs created)

---

## IMPORTANT NOTES

### Current Date Reference
- Today's date: Check with `date +%Y-%m-%d`
- Always use YYYY-MM-DD format
- Update all lastModified fields to current date for changed files

### Key Files to Monitor
1. `/docs/11-implementation-status/IMPLEMENTATION_STATUS.md` - Master status
2. `/src/app/documentation/page.tsx` - Documentation center
3. `/backend/README.md` - Backend main guide
4. Feature-specific READMEs in backend/apps/

### Documentation Center Categories
- **Status**: Implementation progress, completion reports
- **Architecture**: System design, schemas, structure
- **Migration**: Database/code migrations, consolidations
- **Component**: UI components, feature implementations
- **Technical**: APIs, setup guides, technical docs
- **AI**: AI/ML features, processing systems

### Git Best Practices
- Review changes before committing
- Write descriptive commit messages
- Only commit documentation files (don't accidentally commit code changes)
- Always push after committing
- Check git status before and after

---

## VERIFICATION CHECKLIST

Before completing, verify:

- [ ] All new features have documentation
- [ ] All dates are current (today's date)
- [ ] All file paths in documentation center exist
- [ ] Descriptions are accurate and helpful
- [ ] READMEs are updated with new endpoints/features
- [ ] Git commit message is descriptive
- [ ] Changes pushed to remote successfully
- [ ] No merge conflicts
- [ ] User receives summary of what was updated

---

## EXAMPLE EXECUTION

**User says:** "update documentation"

**Claude should:**
1. Scan for changes in last 7 days
2. Find: Finance Structure migration completed yesterday
3. Create `/docs/11-implementation-status/FINANCE_STRUCTURE_MIGRATION_004_COMPLETE.md`
4. Update `/docs/11-implementation-status/IMPLEMENTATION_STATUS.md`
5. Add new tile to `/src/app/documentation/page.tsx`:
   - Title: "Finance Structure Migration Complete"
   - Path: correct file path
   - Description: summary of migration
   - Date: today's date (2025-10-22)
6. Update dates on related tiles
7. Stage changes: `git add docs/ backend/ src/app/documentation/`
8. Commit with message: "docs: add Finance Structure migration documentation"
9. Push to current branch
10. Report to user what was updated

---

## END OF COMMAND

This slash command should be comprehensive but adaptable. Use judgment to determine which steps are needed based on what actually changed.
