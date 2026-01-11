# Documentation Update Workflow

**Last Updated:** 2025-10-22

## Quick Start

To update all documentation after making changes to the app:

```
/update-docs
```

Or simply say: **"update documentation"**

This will automatically:
- ✅ Scan for recent changes
- ✅ Update status documents
- ✅ Update documentation center page
- ✅ Create completion docs for new features
- ✅ Commit and push all changes to git

---

## What Gets Updated

### 1. Core Status Documents

**Main Status File:**
- `/docs/00_overview/IMPLEMENTATION_STATUS.md`
- Master document tracking all implementation progress

**Feature Completion Documents:**
- Located in `/docs/02-features/financial-engine/`
- Created when major features/migrations complete
- Example: `FINANCE_STRUCTURE_MIGRATION_004_COMPLETE.md`

**Feature-Specific Status:**
- `/docs/00_overview/IMPLEMENTATION_STATUS.md`
- `/docs/02-features/dms/DMS-Implementation-Status.md`
- Domain-specific progress tracking

### 2. Backend Documentation

**Main Backend Guide:**
- `/backend/README.md` - Setup and installation

**App-Specific READMEs:**
- `/backend/apps/financial/README.md` - Financial APIs
- `/backend/apps/containers/README.md` - Container APIs
- `/backend/apps/calculations/README.md` - Calculation APIs

**User Guides:**
- `/backend/TESTING_GUIDE.md` - How to test APIs
- `/backend/ADMIN_ACCESS.md` - Django admin access

### 3. Documentation Center

**File:** `/src/app/documentation/page.tsx`

This is the central hub where all documentation is indexed. Updates include:
- Adding new tiles for completed features
- Updating `lastModified` dates
- Refreshing descriptions
- Verifying all file paths work

---

## Documentation Structure

```
docs/
├── 00-getting-started/          # Setup guides
├── 02-features/                 # Feature documentation
│   ├── financial-engine/
│   ├── dms/
│   └── land-use/
├── 05-database/                 # Database schemas
├── 08-migration-history/        # Past migrations
├── 00_overview/status/    # Current status (KEY!)
│   ├── IMPLEMENTATION_STATUS.md          # Master status
│   ├── FINANCE_STRUCTURE_MIGRATION_004_COMPLETE.md
│   └── [OTHER_FEATURE]_COMPLETE.md
├── 14-specifications/           # Specs and designs
└── DJANGO_BACKEND_IMPLEMENTATION.md

backend/
├── README.md                    # Backend setup
├── TESTING_GUIDE.md            # API testing guide
├── ADMIN_ACCESS.md             # Admin panel access
└── apps/
    ├── financial/README.md     # Financial API docs
    ├── containers/README.md    # Container API docs
    └── calculations/README.md  # Calculation API docs

src/app/documentation/
└── page.tsx                     # Documentation Center UI
```

---

## When to Update Documentation

### Automatically Update When:
1. ✅ Completing a major feature
2. ✅ Finishing a database migration
3. ✅ Adding new API endpoints
4. ✅ Deploying to production
5. ✅ Changing system architecture
6. ✅ At end of coding session with significant changes

### What Triggers Updates:
- New models/endpoints in Django backend
- Completion of implementation phases
- New testing guides or workflows
- Changes to setup/installation procedures
- New features in React frontend
- Database schema changes

---

## Documentation Templates

### Feature Completion Template

```markdown
# [Feature Name] - Complete

**Date:** YYYY-MM-DD
**Status:** Complete / Phase X Complete

## Overview

Brief description of what was implemented.

## What Was Built

### Backend
- List of models created
- API endpoints added
- Database changes

### Frontend
- Components created
- Pages added
- UI features

### Integration
- How frontend connects to backend
- API calls made
- Data flow

## Files Changed

**Backend:**
- `/backend/apps/[app]/models.py`
- `/backend/apps/[app]/views.py`
- etc.

**Frontend:**
- `/src/app/[feature]/page.tsx`
- etc.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/... | ... |
| POST   | /api/... | ... |

## Testing

- [ ] Unit tests written
- [ ] Integration tests passed
- [ ] Manual testing completed
- [ ] API testing guide created

## Documentation Updated

- [ ] README files updated
- [ ] API documentation added
- [ ] Testing guide created
- [ ] Documentation center tile added

## Known Issues

List any known limitations or issues.

## Next Steps

What's coming next for this feature.
```

### Status Update Template

When updating `IMPLEMENTATION_STATUS.md`, follow this pattern:

```markdown
# Implementation Status

**Last Updated:** YYYY-MM-DD

## Recent Updates

### [Date] - [Feature Name]
- Completed [X]
- Updated [Y]
- Added [Z]

## Overall Progress

- Phase 1: ✅ Complete
- Phase 2: 🚧 In Progress (75%)
- Phase 3: 📋 Planned

## Current Focus

What's actively being worked on.

## Completed This Week

- [Feature 1]
- [Feature 2]
```

---

## Documentation Center Tiles

### Tile Structure

Each documentation item in the center has:

```typescript
{
  title: 'Feature Name',
  path: '/docs/path/to/file.md',
  category: 'Status' | 'Architecture' | 'Migration' | 'Component' | 'Technical' | 'AI',
  description: 'Brief 1-2 sentence description',
  icon: <IconComponent />,
  lastModified: 'YYYY-MM-DD'
}
```

### Category Guidelines

- **Status**: Progress tracking, completion reports, current state
- **Architecture**: System design, database schemas, structure docs
- **Migration**: Database migrations, code consolidations, refactors
- **Component**: UI components, feature implementations, user guides
- **Technical**: API docs, setup guides, installation, technical specs
- **AI**: AI/ML features, document processing, intelligent systems

### Icon Selection

- `FileText` - General documentation, status reports
- `Book` - Guides, manuals, comprehensive docs
- `Code` - Technical implementation, API docs
- `Database` - Database schemas, data structures
- `Map` - Planning, navigation, visualization
- `DollarSign` - Financial features, calculations, budget

---

## Git Workflow

### Standard Commit Flow

```bash
# 1. Review changes
git status
git diff docs/
git diff backend/
git diff src/app/documentation/

# 2. Stage documentation only
git add docs/
git add backend/*.md
git add backend/apps/**/README.md
git add src/app/documentation/page.tsx

# 3. Commit with descriptive message
git commit -m "docs: update documentation center and status pages

- Add [feature] completion documentation
- Update IMPLEMENTATION_STATUS.md
- Add new tiles for [features]
- Update lastModified dates
- Refresh [specific docs]

🤖 Generated with Claude Code
"

# 4. Push to current branch
git push origin $(git branch --show-current)
```

### Commit Message Format

**Pattern:** `docs: [summary]`

**Details section should include:**
- Specific files updated
- New documentation added
- Features documented
- Dates refreshed

**Always end with:** `🤖 Generated with Claude Code`

---

## Best Practices

### ✅ DO

1. **Update dates** - Always use current date (YYYY-MM-DD format)
2. **Verify paths** - Ensure all file paths in documentation center exist
3. **Write descriptions** - Make them helpful and accurate
4. **Be specific** - Mention exact features/endpoints added
5. **Create completion docs** - For major features and migrations
6. **Review before commit** - Check git diff before committing
7. **Push immediately** - Don't leave uncommitted documentation

### ❌ DON'T

1. **Don't leave stale dates** - Update lastModified when content changes
2. **Don't use relative dates** - "yesterday" becomes wrong quickly
3. **Don't skip verification** - Broken links are frustrating
4. **Don't commit code with docs** - Keep documentation commits separate
5. **Don't forget descriptions** - Every tile needs a good description
6. **Don't push without review** - Always check what's changing

---

## Troubleshooting

### "Documentation not showing up"
- Check file path is correct (absolute from project root)
- Verify file exists at specified location
- Ensure category is valid
- Check lastModified date format (YYYY-MM-DD)

### "Dates are wrong"
- Use `date +%Y-%m-%d` to get current date
- Update lastModified to match file modification date
- Use `stat -f "%Sm" -t "%Y-%m-%d" filepath` to check actual file date

### "Links not working"
- Paths should start with `/docs/`, `/backend/`, or `/services/`
- Use forward slashes, not backslashes
- Double-check spelling and capitalization
- Run verification script to check all paths

### "Git push fails"
- Check you're on correct branch
- Pull latest changes first: `git pull origin [branch]`
- Resolve any merge conflicts
- Verify permissions in `.claude/settings.local.json`

---

## Quick Reference Commands

```bash
# Find recent documentation changes
find docs backend -name "*.md" -mtime -7

# Check file modification date
stat -f "%Sm" -t "%Y-%m-%d" [filepath]

# Get current date
date +%Y-%m-%d

# Verify documentation paths
ls -la docs/00_overview/status/

# See what changed in git
git status
git diff docs/

# Current git branch
git branch --show-current

# Recent commits
git log --oneline -10
```

---

## Examples

### Example 1: After Completing Finance Structure Migration

**User:** "update documentation"

**Claude actions:**
1. Creates `/docs/00_overview/status/FINANCE_STRUCTURE_MIGRATION_004_COMPLETE.md`
2. Updates `/docs/00_overview/IMPLEMENTATION_STATUS.md`
3. Adds tile to documentation center:
   ```typescript
   {
     title: 'Finance Structure Migration Complete',
     path: '/docs/00_overview/status/FINANCE_STRUCTURE_MIGRATION_004_COMPLETE.md',
     category: 'Status',
     description: 'Finance Structure system migration to Django backend - Complete with auto-allocations, cost-to-complete, sale settlements, and participation tracking',
     icon: <DollarSign className="w-5 h-5" />,
     lastModified: '2025-10-22'
   }
   ```
4. Updates backend README files
5. Commits and pushes changes

### Example 2: After Adding New API Endpoints

**User:** "update documentation"

**Claude actions:**
1. Updates `/backend/apps/financial/README.md` with new endpoints
2. Updates `/backend/TESTING_GUIDE.md` with testing examples
3. Updates main status document
4. Refreshes dates in documentation center
5. Commits and pushes changes

---

## Maintenance

This workflow document should be updated when:
- Documentation structure changes
- New documentation categories added
- Git workflow changes
- New templates created
- Process improvements identified

**Last reviewed:** 2025-10-22
**Next review:** As needed when process changes
