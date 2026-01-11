# Complete Git Sync Prompt Template

## Quick Use

When you want to sync everything to git, copy and paste this prompt:

---

## THE PROMPT

```
sync all to GIT
```

When Claude Code receives this prompt, it should execute the comprehensive git sync workflow below.

---

## Complete Workflow Specification

### Phase 1: Pre-Sync Verification

**Check Current State:**
1. Run `git status` to see all changes
2. Run `git branch --show-current` to verify current branch
3. Show summary of:
   - Modified files count
   - New files count
   - Deleted files count
   - Current branch name

**Verify Sensitive Data Protection:**
1. Check that `.gitignore` is present and properly configured
2. Verify these are gitignored (DO NOT COMMIT):
   - `.env` files (except `.env.local.template`, `.env.local.example`, `services/financial_engine_py/.env.example`)
   - `/node_modules/`
   - `/.next/` and `/build/`
   - `/backend/venv/`
   - `/backend/uploads/`
   - `/backend/**/__pycache__/`
   - `*.sql` dumps
   - Large GIS files (`.shp`, `.dbf`, `.geojson`)
   - User data files in `/LocalFiles/`

3. Scan staged changes for potential secrets:
   - Database passwords
   - API keys
   - Connection strings with credentials
   - JWT secrets
   - OAuth tokens

**Review Changes:**
1. Show `git diff --stat` for overview
2. Identify major change categories:
   - New features
   - Bug fixes
   - Documentation updates
   - Migration files
   - Configuration changes
   - Refactoring

### Phase 2: Staging Strategy

**What to Stage (Comprehensive):**

**Source Code:**
- `/src/**/*` - All Next.js app code
- `/backend/**/*` - All Django backend code (excluding venv/, uploads/, __pycache__/)
- `/services/**/*` - All Python services (excluding .venv/, __pycache__/)
- `/public/**/*` - Static assets
- `/scripts/**/*` - All utility scripts

**Configuration:**
- Root configs: `package.json`, `tsconfig.json`, `next.config.mjs`, `.eslintrc.json`, `.prettierrc`
- Backend: `backend/requirements.txt`, `backend/pytest.ini`, `backend/config/**/*`
- Services: `services/*/pyproject.toml`, `services/*/poetry.lock`
- Git: `.gitignore`, `.gitattributes`
- CI/CD: `.github/workflows/**/*`
- Husky: `.husky/**/*`
- Environment templates: `.env.local.template`, `.env.local.example`, `services/financial_engine_py/.env.example`

**Database:**
- `/migrations/**/*.sql` - All migration files
- `/db/migrations/**/*` - Additional migrations
- `/scripts/run-migrations.sh` - Migration runners
- `/scripts/setup-database-roles.sql` - Database setup
- `/scripts/setup-monitoring.sql` - Monitoring queries
- `/seed/**/*` - Seed data files (CSV, SQL if tracked)

**Documentation:**
- `/docs/**/*.md` - All documentation (100+ files)
- `/README.md` - Main readme
- `/backend/README.md` - Backend readme
- `/backend/ADMIN_ACCESS.md` - Admin docs
- All other README files throughout the project

**Infrastructure:**
- `.github/workflows/**/*` - All GitHub Actions
- Deployment scripts: `scripts/neon-branch-*.sh`, `scripts/rollback-production.sh`
- Docker files (if present): `Dockerfile`, `docker-compose.yml`

**Testing:**
- `/tests/**/*` - Test files
- `/backend/apps/*/tests*.py` - Django tests
- `jest.config.js`, `vitest.config.ts` - Test configs

**What NOT to Stage (Verify Gitignored):**
- ❌ `.env`, `.env.local`, `backend/.env`, `services/**/.env` (except templates)
- ❌ `/node_modules/`
- ❌ `/.next/`, `/build/`
- ❌ `/backend/venv/`, `/services/**/.venv/`
- ❌ `/backend/uploads/` - User uploaded files
- ❌ `**/__pycache__/`, `*.pyc`
- ❌ `*.sql` dump files
- ❌ Large GIS files (`.geojson`, `.shp`, `.dbf`)
- ❌ `/LocalFiles/` - Local development files
- ❌ `/.vscode/` - Editor settings
- ❌ `/docs/09_session_notes/ai-chats/*.png`, `/docs/09_session_notes/ai-chats/*.zip`

### Phase 3: Commit Message Generation

**Commit Message Format:**

```
<type>: <short summary> (<scope if applicable>)

<detailed description of changes>

Changes:
- <bullet point 1>
- <bullet point 2>
- <bullet point 3>

Database Changes:
- <migration files added/modified>
- <schema changes>

Documentation:
- <docs updated>

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Type Prefixes:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Adding tests
- `chore:` - Maintenance tasks
- `migration:` - Database migration
- `ci:` - CI/CD changes

**Scope Examples:**
- `(api)` - API changes
- `(ui)` - UI changes
- `(backend)` - Django backend
- `(financial-engine)` - Financial calculation engine
- `(market-ingest)` - Market data ingestion
- `(db)` - Database changes
- `(devops)` - DevOps/infrastructure

**Detailed Description Guidelines:**
1. Explain WHY the changes were made (not just what)
2. Reference any related issues/tickets
3. Note breaking changes if any
4. Include migration instructions if needed

### Phase 4: Commit Execution

**Standard Workflow:**

```bash
# Review status one more time
git status

# Stage all appropriate files
git add <files identified in Phase 2>

# Verify staged changes
git diff --staged --stat

# Create commit with generated message
git commit -m "$(cat <<'EOF'
<commit message from Phase 3>
EOF
)"

# Show commit summary
git log -1 --stat

# Push to current branch
git push origin <current-branch>
```

**Special Considerations:**

**If on `work` branch:**
- Push to `origin work`
- Note: This is a working branch, not production

**If on `main` branch:**
- Confirm this is intentional (production branch)
- Verify all tests pass before pushing
- Consider creating a backup first

**If untracked migrations exist:**
- Ensure migration files are named correctly: `<seq>_<description>.sql`
- Verify migrations are idempotent (can be run multiple times)
- Add migration tracking entry if needed

**If large documentation changes:**
- Verify all links are working
- Check for broken references
- Ensure code examples are accurate

### Phase 5: Post-Sync Actions

**Immediate Verification:**
1. Verify push succeeded: `git log origin/<branch> -1`
2. Check GitHub Actions if applicable (CI/CD pipeline)
3. Verify no secrets were committed (GitHub will flag this)

**Team Communication:**
If changes include:
- Database migrations → Team needs to run migrations on their branches
- New dependencies → Team needs to run `npm install` / `pip install -r requirements.txt`
- Environment variables → Team needs to update their `.env` files
- Breaking changes → Team needs migration guide
- New Python packages → Team needs to reinstall backend/services dependencies
- New system tools → Team needs to install (postgres, python, node, etc.)

**Critical: Dependency Synchronization for Other Machines**

When team members pull your changes, they need to synchronize MORE than just code. Include these instructions in your commit message or team notification:

**1. Node.js Dependencies (if package.json changed):**
```bash
# At project root
npm install
# or
pnpm install
```

**2. Python Backend Dependencies (if backend/requirements.txt changed):**
```bash
cd backend

# Activate virtual environment (create if doesn't exist)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install/update dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

**3. Python Services Dependencies (if services/*/pyproject.toml changed):**
```bash
# Financial Engine
cd services/financial_engine_py
poetry install
# or
python3 -m venv .venv
source .venv/bin/activate
pip install -e .

# Market Ingest Service
cd services/market_ingest_py
poetry install
# or
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

**4. Database Migrations (if migrations/*.sql added):**
```bash
# Set database URL
export DATABASE_URL="postgresql://..."

# Run migrations
./scripts/run-migrations.sh

# Or for geography seeds specifically:
./db/migrations/run_geo_seeds.sh
```

**5. Environment Variables (if .env.*.template changed):**
```bash
# Copy template and fill in values
cp .env.local.template .env.local
cp backend/.env.example backend/.env
cp services/financial_engine_py/.env.example services/financial_engine_py/.env

# Edit each .env file with actual values:
# - DATABASE_URL
# - API keys
# - Secret keys
```

**6. System Services (if new services required):**

Check if Django backend is running:
```bash
cd backend
source venv/bin/activate
python manage.py runserver 8000
```

Check if database is accessible:
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM landscape.tbl_project;"
```

**7. Rebuild Frontend (if major changes):**
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
# or
npm run dev
```

**Common Issues After Sync:**

❌ **"Module not found"** → Run `npm install` or `pip install -r requirements.txt`

❌ **"Connection refused" / API errors** → Django backend not running
```bash
cd backend
source venv/bin/activate
python manage.py runserver 8000
```

❌ **"Table/column doesn't exist"** → Database migrations not run
```bash
./scripts/run-migrations.sh
```

❌ **"404 errors for geography lookups"** → Geography seed data missing
```bash
./db/migrations/run_geo_seeds.sh
```

❌ **"Import error" in Python** → Virtual environment not activated or dependencies not installed
```bash
source venv/bin/activate  # or source .venv/bin/activate
pip install -r requirements.txt
```

**Update Tracking:**
- Update `/docs/08-migration-history/` if database migrations added
- Update `/docs/00_overview/status/` if features completed
- Update session notes if significant work completed

### Phase 6: Verification Checklist

After sync, verify:

- [ ] Commit appears on GitHub
- [ ] No sensitive data visible in diff
- [ ] CI/CD pipeline triggered (if applicable)
- [ ] All changed files were intended to be committed
- [ ] Commit message is clear and descriptive
- [ ] Branch pushed to correct remote
- [ ] No gitignored files were accidentally committed
- [ ] Documentation reflects current code state

---

## Example Complete Prompt

For Claude Code to execute the entire workflow, you can use this enhanced prompt:

```
sync all to GIT

Please execute the complete git sync workflow:

1. Review all current changes (git status, git diff --stat)
2. Verify no sensitive data will be committed (check .env files are gitignored)
3. Stage all appropriate files (source code, configs, migrations, docs)
4. Generate a comprehensive commit message following our format
5. Show me the staged changes for review
6. Create the commit
7. Push to the current branch
8. Verify the push succeeded
9. Provide a summary of what was synced

Pay special attention to:
- Multiple services (Next.js, Django, Python engines) - include all
- All documentation in /docs/ directory
- Any new migration files in /migrations/ or /db/migrations/
- CI/CD workflows if modified
- Ensure NO .env files with secrets are committed (only templates)

If you find any issues or need clarification before committing, ask me first.
```

---

## Quick Reference: What Gets Synced

### ✅ Always Include

**Code:**
- `/src/` - Next.js frontend
- `/backend/` - Django backend (excluding venv, uploads, __pycache__)
- `/services/` - Python services (excluding .venv, __pycache__)
- `/scripts/` - All scripts
- `/public/` - Static assets

**Database:**
- `/migrations/` - SQL migrations
- `/db/migrations/` - Additional migrations
- Database setup/monitoring scripts

**Configuration:**
- `package.json`, `requirements.txt`, `pyproject.toml`
- TypeScript, ESLint, Prettier configs
- `.gitignore`, `.gitattributes`
- `.env.*.template` and `.env.*.example` files

**Documentation:**
- `/docs/` - All markdown files (100+)
- All README files
- API documentation
- DevOps guides

**CI/CD:**
- `.github/workflows/` - GitHub Actions
- `.husky/` - Git hooks
- Deployment scripts

### ❌ Never Include (Gitignored)

**Secrets:**
- `.env`, `.env.local`, `backend/.env`, `services/**/.env`
- Any files with passwords, API keys, tokens

**Dependencies:**
- `/node_modules/`
- `/backend/venv/`
- `/services/**/.venv/`

**Build Artifacts:**
- `/.next/`
- `/build/`
- `**/__pycache__/`
- `*.pyc`

**User Data:**
- `/backend/uploads/`
- `/LocalFiles/`

**Large Files:**
- `*.sql` dumps
- GIS files (`.geojson`, `.shp`, `.dbf`)
- `*.zip` archives in docs

**Editor Config:**
- `/.vscode/`

---

## Special Scenarios

### Scenario 1: New Migration Files

If new migrations were added:

```bash
# Ensure migrations are in the right place
ls -la migrations/*.sql
ls -la db/migrations/*.sql

# Verify migration naming convention
# Format: <sequence>_<description>.sql
# Example: 014_add_market_data_tables.sql

# Stage migration files
git add migrations/*.sql
git add db/migrations/*.sql

# Include in commit message
git commit -m "migration: add market data tables (014)

Added new migration 014_add_market_data_tables.sql

Database Changes:
- Creates market_data table
- Creates market_series table
- Adds indexes for performance

Migration Instructions:
- Run: ./scripts/run-migrations.sh
- Updates: landscape._migrations table
..."
```

### Scenario 2: Documentation-Only Changes

If only docs changed:

```bash
# Stage all doc changes
git add docs/**/*.md
git add README.md
git add backend/README.md

# Simpler commit message
git commit -m "docs: update developer onboarding guide

Updated:
- docs/00-getting-started/DEVELOPER_GUIDE.md
- Added database setup instructions
- Fixed broken links to API docs
..."
```

### Scenario 3: Multi-Service Update

If changes span multiple services:

```bash
# Stage all service changes
git add src/
git add backend/
git add services/financial_engine_py/
git add services/market_ingest_py/

# Detailed commit message
git commit -m "feat: integrate market data with financial projections

Implemented market data integration across the stack.

Changes:
- Frontend: Added market data dashboard (src/app/market/)
- Backend: Added market data API endpoints (backend/apps/market/)
- Financial Engine: Integrated market assumptions (services/financial_engine_py/)
- Market Ingest: Added new data sources (services/market_ingest_py/)

Database Changes:
- No migrations (uses existing market_data table)

Documentation:
- Updated API reference docs
- Added market integration guide
..."
```

### Scenario 4: Emergency Hotfix

For urgent production fixes:

```bash
# Quick status check
git status

# Stage only the fix
git add src/app/api/projects/route.ts

# Urgent commit message
git commit -m "fix: prevent null reference error in projects API (HOTFIX)

Fixed critical bug causing 500 errors when project has no location data.

Changes:
- Added null check in projects API route
- Returns empty string instead of null

Fixes: Production incident #2024-10-29-001
Tested: Verified with curl and Postman
..."

# Push immediately
git push origin main
```

---

## Environment Setup Reference

**Files synced (Templates):**
- `.env.local.template` - GitHub Codespaces config
- `.env.local.example` - Local development config
- `services/financial_engine_py/.env.example` - Python engine config

**Files NOT synced (Gitignored - Set up manually):**
- `.env` - Root environment
- `.env.local` - Local overrides
- `backend/.env` - Django config
- `services/financial_engine_py/.env` - Python engine secrets
- `services/market_ingest_py/.env` - Market ingest secrets

**Required Environment Variables:**

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:***@ep-***.aws.neon.tech/land_v2?sslmode=require

# Next.js
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8000

# Django (backend/.env)
DJANGO_SECRET_KEY=***
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Financial Engine (services/financial_engine_py/.env)
DATABASE_URL=postgresql://...
DISCOUNT_RATE_DEFAULT=0.08
IRR_FLOOR=0.06

# Market Ingest (services/market_ingest_py/.env)
DATABASE_URL=postgresql://...
FRED_API_KEY=***
CENSUS_API_KEY=***
BLS_API_KEY=***
```

---

## Rollback Procedures

If something goes wrong after push:

### Soft Rollback (Revert Last Commit)

```bash
# Undo last commit but keep changes
git reset HEAD~1

# Review what was uncommitted
git status

# Make corrections
# ... fix issues ...

# Re-commit correctly
git add <files>
git commit -m "..."
git push origin <branch>
```

### Hard Rollback (Undo and Discard)

```bash
# WARNING: This discards all changes from last commit
git reset --hard HEAD~1

# Force push to remote (dangerous!)
git push --force origin <branch>
```

### Revert (Safe for Shared Branches)

```bash
# Creates new commit that undoes previous commit
git revert HEAD

# Push the revert commit
git push origin <branch>
```

---

## Troubleshooting

### "Changes not staged for commit"

This is normal - review with `git status`, then stage with `git add <file>`

### "Large files detected"

Git will reject large files (>100MB). Solutions:
- Ensure file is gitignored
- Use Git LFS for large assets (if needed)
- Store large files externally (S3, etc.)

### "Secrets detected"

GitHub will flag commits with secrets. If this happens:
1. DO NOT push
2. Remove the sensitive data
3. Update .gitignore to prevent future commits
4. Recommit without secrets

### "Merge conflicts"

If remote has changes:
```bash
# Pull latest changes
git pull origin <branch>

# Resolve conflicts
# ... edit conflicting files ...

# Stage resolved files
git add <conflicted-files>

# Complete merge
git commit

# Push
git push origin <branch>
```

---

## CI/CD Integration

When you push to GitHub, these workflows automatically trigger:

### Preview Workflow (`main`, PRs)
1. Create Neon database branch
2. Run migrations on branch
3. Run tests (Jest, Pytest)
4. Deploy to Vercel preview
5. Run API integration tests
6. Comment PR with preview URL

### Production Workflow (`main` branch)
1. Run full test suite
2. Create database snapshot (backup)
3. Run migrations on production database
4. Build production bundle
5. Deploy to Vercel production
6. Run health checks
7. Auto-rollback on failure

### Cleanup Workflow (PR close)
- Delete ephemeral Neon branch
- Clean up Vercel preview

**Required GitHub Secrets:**
- `NEON_PROJECT_ID`
- `NEON_API_KEY`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `DATABASE_URL`

---

## Related Documentation

- [DevOps Guide](./DEVOPS_GUIDE.md) - Complete CI/CD pipeline documentation
- [Developer Guide](../00-getting-started/DEVELOPER_GUIDE.md) - Development setup
- [Database Schema](../05-database/DATABASE_SCHEMA.md) - Database structure
- [Migration History](../08-migration-history/) - All database migrations
- [Git Workflow](./GIT_WORKFLOW.md) - Branching strategy (if exists)

---

## Version History

- **2025-10-29**: Initial version - Comprehensive git sync prompt template
- Updated by: Claude Code Agent
- Purpose: Enable complete, safe, automated git sync operations

---

## Notes

- This prompt template ensures consistency across all git sync operations
- Prevents accidental commit of secrets or sensitive data
- Maintains documentation in sync with code
- Supports multi-service architecture
- Compatible with existing CI/CD pipeline
- Safe for production use when following checklist

**When in doubt:** Ask before committing! It's better to verify than to push sensitive data.
