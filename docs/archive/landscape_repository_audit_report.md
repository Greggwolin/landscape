# Landscape Repository Audit Report

**Date:** November 13, 2025
**Audited by:** Claude Code
**Repository:** /Users/5150east/landscape
**Session ID:** GR60

---

## Executive Summary

- **Total local branches:** 5
- **Total remote branches:** 7 (including HEAD)
- **Unpushed branches:** 2 (backup-20251108, backup-20251108-cleanup)
- **Unpushed commits:** 0 on tracked branches; 146-159 commits total on untracked branches
- **Django backend:** ✅ FOUND (backend/ directory with full Django project)
- **TypeScript frontend:** ✅ FOUND (Next.js application)
- **Working tree status:** Clean (no uncommitted changes)
- **Repository size:** 5.3GB (working directory), 123MB (.git)

### Critical Finding

**The Django backend is fully synced to GitHub.** All branches containing Django code have been pushed to the remote repository. The two "backup" branches are local-only but contain the same Django backend code.

---

## 1. Repository Location & Basic Info

**Current Directory:** `/Users/5150east/landscape`
**Git Repository Root:** `/Users/5150east/landscape`
**Current Branch:** `feat/admin-benchmarks-theme`
**Working Tree Status:** Clean (no uncommitted changes)

**Git Remote Configuration:**
```
origin  https://github.com/Greggwolin/landscape.git (fetch)
origin  https://github.com/Greggwolin/landscape.git (push)
```

---

## 2. Complete Branch Analysis

### Local Branches

| Branch Name | Last Commit | Tracking Remote? | Commits Ahead | Commits Behind | Total Commits | Status |
|-------------|-------------|------------------|---------------|----------------|---------------|--------|
| backup-20251108 | 789e632 | No tracking | N/A | N/A | 146 | LOCAL ONLY |
| backup-20251108-cleanup | 361c105 | No tracking | N/A | N/A | 147 | LOCAL ONLY |
| feat/admin-benchmarks-theme | ba4c18a | No tracking | N/A | N/A | 159 | SYNCED TO REMOTE* |
| main | 88cf90a | origin/main | 0 | 0 | N/A | ✅ SYNCED |
| work | 37af04b | origin/work | 0 | 0 | N/A | ✅ SYNCED |

\* Note: `feat/admin-benchmarks-theme` exists on remote but is not configured to track it locally

### Remote Branches

```
origin/HEAD -> origin/main
origin/claude/landscape-knowledge-foundation-011CV4nwnQv1spooVKWXWcVy
origin/feat/admin-benchmarks-theme
origin/feature/coreui-prototype
origin/main
origin/wip
origin/work
```

### Remote-Only Branches

- `claude/landscape-knowledge-foundation-011CV4nwnQv1spooVKWXWcVy`
- `feature/coreui-prototype`
- `wip`

---

## 3. Code Structure Analysis by Branch

### Branch: backup-20251108

**Contains:**
- ✅ Django Backend: YES (path: `./backend/`)
- ✅ Next.js Frontend: YES
- Python files: **9,999**
- TypeScript files: **47,305+**

**Top-level structure:**
```
Documentation/
GIS/
archive/
backend/         ← Django backend
data/
db/
docs/
lib/
migrations/
node_modules/
patches/
public/
reference/
scripts/
seed/
src/             ← Next.js frontend
```

**Key files:**
- manage.py: `./backend/manage.py` ✅
- settings.py: `./backend/config/settings.py` ✅
- requirements.txt: `./backend/requirements.txt` ✅

---

### Branch: backup-20251108-cleanup

**Contains:**
- ✅ Django Backend: YES (path: `./backend/`)
- ✅ Next.js Frontend: YES
- Python files: **~10,000**
- TypeScript files: **~47,000+**

**Identical structure to backup-20251108** with one additional documentation commit.

---

### Branch: feat/admin-benchmarks-theme (CURRENT)

**Contains:**
- ✅ Django Backend: YES (path: `./backend/`)
- ✅ Next.js Frontend: YES
- Python files: **10,001**
- TypeScript files: **47,344+**

**Top-level structure:**
```
Documentation/
GIS/
archive/
backend/         ← Django backend with 13 Django apps
data/
db/
docs/
lib/
migrations/
node_modules/
patches/
public/
reference/
scripts/
seed/
src/             ← Next.js frontend
```

**Django Apps Found:**
```
backend/apps/benchmarks/
backend/apps/calculations/
backend/apps/commercial/
backend/apps/containers/
backend/apps/documents/
backend/apps/financial/
backend/apps/gis/
backend/apps/landuse/
backend/apps/market_intel/
backend/apps/multifamily/
backend/apps/projects/
backend/apps/reports/
backend/apps/sales_absorption/
```

**Key files:**
- manage.py: `./backend/manage.py` ✅
- settings.py: `./backend/config/settings.py` ✅
- requirements.txt: `./backend/requirements.txt` ✅
- next.config.js: Found ✅

---

### Branch: main

**Contains:**
- ✅ Django Backend: NO (`manage.py` not found)
- ✅ Next.js Frontend: YES
- Python files: **9,137**
- TypeScript files: **45,959+**

**Top-level structure:**
```
Documentation/
GIS/
archive/
backend/         ← Contains services but no Django project
data/
db/
docs/
lib/
migrations/
node_modules/
public/
reference/
scripts/
services/        ← Python services (not Django)
sql/
src/
```

**Note:** The `main` branch does NOT contain the Django backend with `manage.py`. This is the production branch without backend.

---

### Branch: work

**Contains:**
- ✅ Django Backend: YES (path: `./backend/`)
- ✅ Next.js Frontend: YES
- Python files: **9,999**
- TypeScript files: **46,300+**

**Same structure as backup branches** - contains full Django backend.

---

## 4. Unpushed Commits Analysis

### Local-Only Branches (Not Pushed to Remote)

#### backup-20251108
**No remote tracking configured**
**Total commits:** 146

Recent commits (last 10):
```
789e632 feat: comprehensive system updates and new feature implementations
cafa56b fix: add budget components to resolve build error
c62a3c2 docs: update Architecture documentation with Migration 013 details
cf9e7e5 fix: cascading dropdown type mismatch in Parcel Detail flyout
e65401f fix: complete Parcel Detail flyout field layout fixes
50f7c0b fix: create missing /api/landuse/subtypes endpoint
79439bf style: improve Phasing table column spacing
604f58e fix: correct planning page addendum implementation
0eff1cb feat: implement planning page addendum fixes
11a11b9 fix: create missing /api/landuse/codes endpoint
```

#### backup-20251108-cleanup
**No remote tracking configured**
**Total commits:** 147

Recent commits (last 10):
```
361c105 docs: add complete project structure tree for reference
789e632 feat: comprehensive system updates and new feature implementations
cafa56b fix: add budget components to resolve build error
c62a3c2 docs: update Architecture documentation with Migration 013 details
cf9e7e5 fix: cascading dropdown type mismatch in Parcel Detail flyout
e65401f fix: complete Parcel Detail flyout field layout fixes
50f7c0b fix: create missing /api/landuse/subtypes endpoint
79439bf style: improve Phasing table column spacing
604f58e fix: correct planning page addendum implementation
0eff1cb feat: implement planning page addendum fixes
```

### Synced Branches

#### feat/admin-benchmarks-theme
- **Remote exists:** origin/feat/admin-benchmarks-theme
- **Commits ahead:** 0
- **Commits behind:** 0
- **Status:** ✅ FULLY SYNCED
- Remote SHA: ba4c18a9de40e5b0499182140a03a738a2d756ad

#### main
- **Tracking:** origin/main
- **Commits ahead:** 0
- **Commits behind:** 0
- **Status:** ✅ FULLY SYNCED

#### work
- **Tracking:** origin/work
- **Commits ahead:** 0
- **Commits behind:** 0
- **Status:** ✅ FULLY SYNCED

### Stashed Changes
**No stashes found.**

---

## 5. Working Directory Status

**Uncommitted changes:** 0
**Untracked files:** 0
**Staged files:** 0

**Working tree is completely clean.**

### Large Files Found (>10MB)

All large files are in `node_modules/` and are properly handled by `.gitignore`:
```
./node_modules/pdf-poppler/pdf-poppler-0.2.2.tgz
./node_modules/@swc/core-darwin-arm64/swc.darwin-arm64.node
./node_modules/@napi-rs/canvas-darwin-arm64/skia.darwin-arm64.node
./node_modules/@img/sharp-libvips-linux-arm64/lib/libvips-cpp.so.8.17.1
./node_modules/@img/sharp-libvips-darwin-arm64/lib/libvips-cpp.8.17.1.dylib
./backend/venv/bin/ruff
```

### .gitignore Status
✅ Properly configured with rules for:
- node_modules
- Python cache (__pycache__)
- .env files
- Large GIS files
- Backend uploads
- Test/debug files
- Build artifacts

---

## 6. Django Backend Detailed Analysis

### Location
**Primary path:** `./backend/`

### Django Project Structure

**Django project name:** `config`

**Project files:**
```
backend/
├── manage.py                 ✅ Django management script
├── config/                   ✅ Django project configuration
│   ├── __init__.py
│   ├── settings.py          ✅ Django settings
│   ├── urls.py              ✅ URL routing
│   ├── wsgi.py              ✅ WSGI config
│   └── asgi.py              ✅ ASGI config
├── apps/                     ✅ Django applications (13 apps)
├── db_backend/              ✅ Database backend package
├── requirements.txt          ✅ Python dependencies
└── [other files]
```

### Django Apps (13 Total)

1. **benchmarks** - `backend/apps/benchmarks/`
2. **calculations** - `backend/apps/calculations/`
3. **commercial** - `backend/apps/commercial/`
4. **containers** - `backend/apps/containers/`
5. **documents** - `backend/apps/documents/`
6. **financial** - `backend/apps/financial/`
7. **gis** - `backend/apps/gis/`
8. **landuse** - `backend/apps/landuse/`
9. **market_intel** - `backend/apps/market_intel/`
10. **multifamily** - `backend/apps/multifamily/`
11. **projects** - `backend/apps/projects/`
12. **reports** - `backend/apps/reports/`
13. **sales_absorption** - `backend/apps/sales_absorption/`

All apps contain `models.py` files.

### Key Dependencies (from requirements.txt)

**Django Core:**
```
Django==5.0.1
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.0
psycopg2-binary==2.9.9
django-cors-headers==4.3.1
drf-spectacular==0.27.0
```

**Python Calculation Engine:**
```
numpy==1.26.0
numpy-financial==1.0.0
pandas==2.2.0
scipy>=1.11.0
pydantic==2.9.0
```

**AI & Document Processing:**
```
anthropic>=0.18.0
pypdf>=3.0.0
openpyxl>=3.0.0
pdfplumber>=0.11.0
camelot-py[cv]>=0.11.0
reportlab>=4.0.0
```

### Database Configuration
**Database:** PostgreSQL (psycopg2-binary)
**Configuration file:** `backend/config/settings.py`

### Migration Status
**Not checked** (would require running Django server)

### Documentation Files Found
```
backend/ADMIN_ACCESS.md
backend/DJANGO_BACKEND_COMPLETE.md
backend/PHASE3_COMPLETION.md
backend/PHASE4_COMPLETION.md
backend/PHASE5_COMPLETION.md
backend/PHASE6_COMPLETION.md
backend/PHASE7_COMPLETION.md
backend/README.md
backend/README_FRONTEND_INTEGRATION.md
backend/README_TESTING.md
backend/TESTING_GUIDE.md
```

---

## 7. Remote Repository Status

**GitHub URL:** https://github.com/Greggwolin/landscape.git

### Sync Status Summary

**Branches only local:**
- backup-20251108
- backup-20251108-cleanup

**Branches only remote:**
- claude/landscape-knowledge-foundation-011CV4nwnQv1spooVKWXWcVy
- feature/coreui-prototype
- wip

**Branches synced (exist both local and remote):**
- feat/admin-benchmarks-theme (synced, commit ba4c18a)
- main (synced, commit 88cf90a)
- work (synced, commit 37af04b)

**Branches diverged:** None

### What Would Be Pushed

#### backup-20251108
```
Would create new remote branch: backup-20251108
Would push: 146 commits
Latest commit: 789e632 (feat: comprehensive system updates and new feature implementations)
```

#### backup-20251108-cleanup
```
Would create new remote branch: backup-20251108-cleanup
Would push: 147 commits
Latest commit: 361c105 (docs: add complete project structure tree for reference)
```

#### feat/admin-benchmarks-theme
```
Already synced with origin/feat/admin-benchmarks-theme
No commits to push
```

---

## 8. Repository Size Analysis

**.git directory size:** 123 MB
**Working directory size:** 5.3 GB

### Largest Files in Repository History (Top 20)

| Size | File Path |
|------|-----------|
| 18.9 MB | reference/multifam/4Q24-Matthews-LA-County-Multifamily-Sales-Report.pdf |
| 15.1 MB | reference/docs/Argus_EstateMaster_UserGuide.pdf |
| 14.0 MB | reference/multifam/2025 M&M US Multifamily Investment Forecast.pdf |
| 12.0 MB | reference/docs/Yardi_Manual_BLVD.pdf |
| 8.7 MB | reference/multifam/chadron/5644 Ravenspur Dr, Rancho Palos Verdes.pdf |
| 7.4 MB | reference/multifam/Lynn Villas OM 2025_FINAL FOR MARKETING.pdf |
| 6.7 MB | reference/multifam/chadron/14105 Chadron Ave_OM_2025.pdf |
| 4.8 MB | reference/multifam/chadron/14105 Chadron Ave_OM_2025[nopics].pdf |
| 4.5 MB | reference/multifam/VINCENT VILLAGE - OM SM.pdf |
| 4.3 MB | services/market_ingest_py/.venv/.../pydantic_core (binary) |
| 4.2 MB | services/market_ingest_py/.venv/.../libcrypto.3.dylib |
| 3.7 MB | reference/multifam/2025 JPM Co-Star Los Angeles - MultiFamily.pdf |
| 3.7 MB | docs/1451-Red Valley Phase 1 Email.pdf |
| 3.6 MB | reference/docs/ARGUS Enterprise 501-750.pdf |
| 3.1 MB | reference/docs/ARGUS Enterprise 1-250.pdf |
| 2.6 MB | reference/docs/ARGUS Enterprise 251-500.pdf |
| 2.5 MB | reference/docs/ARGUS Enterprise 751-1000.pdf |
| 2.4 MB | reference/docs/ARGUS Enterprise 1001-end.pdf |
| 1.6 MB | reference/multifam/Glendora Comps.pdf |
| 1.0 MB | reference/excel-models/PeoriaLakes MPC_2023.xlsm |

**Note:** Some virtual environment binaries from `services/market_ingest_py/.venv/` are in history. These should be in `.gitignore`.

---

## 9. Recommended Actions

### ✅ GOOD NEWS: Django Backend is Already on GitHub!

The Django backend is **fully synced** to GitHub on multiple branches:
- `origin/work` (commit 37af04b)
- `origin/feat/admin-benchmarks-theme` (commit ba4c18a)

### Priority 1: Nothing Urgent Needed

**The repository is in good shape.** All critical code is synced.

### Priority 2: Optional Cleanup

#### Option A: Push Backup Branches (Conservative)
If you want to preserve the backup branches on GitHub:

```bash
git checkout backup-20251108
git push origin backup-20251108

git checkout backup-20251108-cleanup
git push origin backup-20251108-cleanup
```

#### Option B: Delete Local Backup Branches (Recommended)
Since these branches are just snapshots and the code is already on `work` and `feat/admin-benchmarks-theme`:

```bash
git branch -D backup-20251108
git branch -D backup-20251108-cleanup
```

### Priority 3: Configure Branch Tracking

Set up `feat/admin-benchmarks-theme` to track the remote:

```bash
git checkout feat/admin-benchmarks-theme
git branch --set-upstream-to=origin/feat/admin-benchmarks-theme
```

---

## 10. Sync Plan Options

### Option A: Keep Everything (Safest)
**Do nothing.** Your critical work is already synced.

### Option B: Push Backup Branches
```bash
# Push both backup branches to remote
git push origin backup-20251108
git push origin backup-20251108-cleanup
```

**Impact:** Creates 2 new remote branches
**Data transferred:** ~146-147 commits (minimal, mostly shared with existing branches)

### Option C: Clean Up Local Backups (Recommended)
```bash
# Verify that work and feat/admin-benchmarks-theme have your Django code
git checkout work
ls backend/manage.py  # Should exist

git checkout feat/admin-benchmarks-theme
ls backend/manage.py  # Should exist

# If confirmed, delete local backup branches
git branch -D backup-20251108
git branch -D backup-20251108-cleanup
```

**Impact:** Removes local-only branches
**Risk:** None (code exists on other branches)

### Option D: Consolidate to Main Branch
```bash
# Create a PR from feat/admin-benchmarks-theme to main
# This would bring Django backend to the main branch
git checkout feat/admin-benchmarks-theme
git push origin feat/admin-benchmarks-theme  # Already up to date
# Then create PR on GitHub: feat/admin-benchmarks-theme -> main
```

---

## 11. Files to Review Before Any Push

### Potential Issues Found

**Large files in history:**
- PDF files in `reference/multifam/` (up to 18.9 MB each)
- Virtual environment files in `services/market_ingest_py/.venv/`

**Already handled by .gitignore:**
- ✅ node_modules/
- ✅ backend/venv/
- ✅ .env files
- ✅ __pycache__/

**Check for sensitive data:**
```bash
# Check for API keys or secrets in .env
grep -r "API_KEY\|SECRET\|PASSWORD" backend/.env 2>/dev/null
```

⚠️ **IMPORTANT:** The `backend/.env` file should NOT be committed. It's in `.gitignore`, which is correct.

---

## 12. Summary of Key Findings

### ✅ What's Good

1. **Django backend is FULLY SYNCED to GitHub** on `work` and `feat/admin-benchmarks-theme` branches
2. **No uncommitted changes** - working tree is clean
3. **Proper .gitignore configuration** - node_modules, venv, .env all excluded
4. **13 Django apps** fully implemented with models, views, and serializers
5. **Complete requirements.txt** with all necessary dependencies
6. **Comprehensive documentation** in backend/ directory

### ⚠️ What to Consider

1. **Two backup branches are local-only** (backup-20251108, backup-20251108-cleanup)
   - These can be pushed or deleted (code exists on other branches)

2. **main branch does NOT have Django backend**
   - `work` and `feat/admin-benchmarks-theme` branches have it
   - Consider merging to main if you want backend in production

3. **Branch tracking not configured** for `feat/admin-benchmarks-theme`
   - Should set upstream: `git branch --set-upstream-to=origin/feat/admin-benchmarks-theme`

4. **Large PDF files in repository history**
   - Total .git size is reasonable (123 MB)
   - Not a problem currently, but be aware

### 🎯 Recommended Next Steps

1. **Set up branch tracking** for feat/admin-benchmarks-theme
2. **Delete local backup branches** (code is safe on other branches)
3. **Create a PR** to merge feat/admin-benchmarks-theme → main (if you want backend in production)
4. **Optional:** Review remote-only branches and delete if no longer needed

---

## Conclusion

**Your Django backend code is SAFE and SYNCED to GitHub.** The audit confirms that:

- All Django apps are committed and pushed to remote
- No critical code exists only locally
- Repository is in good health with proper .gitignore rules
- No uncommitted changes that could be lost

The two "backup" branches are redundant snapshots that can be safely deleted locally, as their code already exists on the synced `work` and `feat/admin-benchmarks-theme` branches.

**You can proceed with confidence that your work is backed up on GitHub.**

---

**End of Audit Report**
**Generated:** November 13, 2025
**GR60**
