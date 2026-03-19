---
name: deploy
description: "Merge feature branch to main, push to GitHub, and verify Vercel + Railway deployments are healthy. Use this skill whenever the user says 'deploy', 'ship it', 'push to prod', 'merge and deploy', 'send it', or asks to get their code changes live. Also trigger when the user asks to check deployment status, verify production health, or confirm a deploy went through."
---

# Deploy Skill — Landscape CI/CD Pipeline

This skill walks through merging a feature branch to main, pushing to GitHub, and verifying that both Vercel (frontend) and Railway (backend) deployments succeed with healthy endpoints.

## Environment Constants

```
GITHUB_REPO: Greggwolin/landscape
VERCEL_TEAM_ID: team_rkhm3d3pNNYzKHfWsYNHKQ4T
VERCEL_PROJECT_ID: prj_ZUmjZRJY4TG0X4ROmfLULzB1WF7D
VERCEL_PROD_URL: https://landscape-hazel.vercel.app
RAILWAY_PROD_URL: https://landscape-production.up.railway.app
```

## Branch Naming Convention

Feature branches follow a versioned naming pattern:
- `alpha06` — work targeting v0.1.06
- `alpha07` — work targeting v0.1.07
- Legacy branches like `alpha-prep` or `feature/alpha-prep` may exist but should be migrated to the numbered convention.

The "current working branch" is whatever non-main branch is checked out when `/deploy` is invoked.

## Workflow

### Step 1: Pre-flight Check

Run these checks and present a summary:

1. **Current branch** — `git branch --show-current`. If already on `main`, warn and ask if they want to proceed (direct push to main).
2. **Uncommitted changes** — `git status --short`. If dirty, auto-commit with a descriptive message grouping the changes logically. Only stop to ask if files look sensitive (.env, credentials, etc.).
3. **Stale lock files** — Check for `.git/index.lock`. If it exists and is older than 5 minutes, remove it. If it can't be removed, tell the user to delete it from their host machine and stop.
4. **Unpushed commits** — `git log origin/<branch>..HEAD --oneline` (if remote tracking exists). Show what's about to ship.
5. **Lint check** — `npm run lint 2>&1 | tail -20`. Warnings are OK. Only stop on actual errors.
6. **Branch divergence** — `git fetch origin main && git log HEAD..origin/main --oneline`. If main has commits not in the branch, flag merge risk.
7. **Stale branches** — Identify any local branches that are fully contained in the current branch (ancestors with 0 unique commits). List them for cleanup in Step 8.

Present concisely:

```
Deploy Summary:
  Branch: alpha05 → main
  Uncommitted: 3 files (will auto-commit)
  Commits to ship: 16 (list abbreviated)
  Lint: pass (4 warnings)
  Conflicts risk: low
  Stale branches: feature/alpha-prep (fully merged)
```

### Step 2: Commit Uncommitted Work

If there are uncommitted changes, commit them now:

```bash
git add <specific-files>  # Never git add -A
git commit -m "feat: <descriptive summary of changes>"
```

Group related changes into one commit. Use conventional commit prefixes (feat/fix/chore/docs). If changes span multiple concerns, make multiple commits.

### Step 3: Merge Main into Feature Branch

Bring the feature branch up to date with main before merging the other direction:

```bash
git fetch origin main
git merge origin/main
```

If merge conflicts occur, STOP. Show the conflicted files and ask the user how to proceed. Do not auto-resolve.

### Step 4: Merge Feature Branch into Main

```bash
git checkout main
git pull origin main  # Ensure local main is current
git merge <feature-branch> --no-ff -m "Merge <feature-branch> into main"
```

If merge conflicts occur, STOP and ask.

### Step 5: Version Bump & Changelog

After merging to main but **before pushing**, bump the version and create a changelog entry.

#### 5a. Check for existing changelog entry

Sometimes the changelog is pre-written during the session (e.g., via raw SQL insert). Check first:

```bash
cd /path/to/landscape
node -e "
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT version, LEFT(published_notes, 80) as preview FROM landscape.tbl_changelog ORDER BY deployed_at DESC LIMIT 1\`
.then(r => console.log(JSON.stringify(r[0])))
.catch(e => console.error(e.message));
"
```

If the latest changelog version already matches what we're about to deploy (i.e., it was pre-inserted this session), **skip changelog creation** and just do the version bump commit (Step 5d).

#### 5b. Determine the new version

If no pre-existing entry, read the current version:

```bash
cd /path/to/landscape
node -e "
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT version FROM landscape.tbl_changelog ORDER BY deployed_at DESC LIMIT 1\`
.then(r => console.log(r[0]?.version || 'v0.1.0'))
.catch(e => console.error(e.message));
"
```

Parse the version string (format: `v0.1.XX`) and increment:
- `v0.1.04` → `v0.1.05`
- `v0.1.09` → `v0.1.10`
- `v0.1.99` → `v0.2.00`

The version format is always `v0.1.XX` where XX is a zero-padded two-digit number (01-99).

#### 5c. Generate and write changelog

Collect commits being shipped:

```bash
git log origin/main..main --pretty=format:"%s" --no-merges
```

Transform into **plain English release notes**:
- Group related commits into logical changes
- Write from the user's perspective ("Added thread management" not "Refactored useLandscaperThreads hook")
- Use past tense ("Added", "Fixed", "Improved", "Removed")
- Keep each item to 1-2 sentences
- Skip merge commits and housekeeping (linting, nightly docs, formatting-only)
- Separate items with `\n\n` (paragraph breaks, not bullet points) — the ChangelogModal renders with `white-space: pre-wrap`

Write to DB:

```bash
cd /path/to/landscape
node -e "
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
const version = '<NEW_VERSION>';
const now = new Date().toISOString();
const autoNotes = '<RAW_COMMIT_LIST>';
const publishedNotes = '<PLAIN_ENGLISH_NOTES>';
sql\`INSERT INTO landscape.tbl_changelog
  (changelog_id, version, deployed_at, auto_generated_notes, published_notes, is_published, created_at, updated_at)
  VALUES (
    (SELECT COALESCE(MAX(changelog_id), 0) + 1 FROM landscape.tbl_changelog),
    \${version}, \${now}, \${autoNotes}, \${publishedNotes}, true, \${now}, \${now}
  )
  RETURNING changelog_id, version\`
.then(r => console.log('Changelog created:', JSON.stringify(r[0])))
.catch(e => console.error(e.message));
"
```

**Important:** The tbl_changelog table has no column defaults (no auto_now_add at SQL level — only Django ORM). All timestamp columns must be provided explicitly.

#### 5d. Commit the version bump

```bash
# Update package.json version (strip the 'v' prefix)
npm version <NEW_VERSION_WITHOUT_V> --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version to <NEW_VERSION>"
```

### Step 6: Push to GitHub

```bash
git push origin main
```

If rejected, show the error and ask. Never force-push to main.

### Step 7: Monitor Deployments

Both Vercel and Railway auto-deploy on push to main.

**Vercel:** Use the Vercel MCP tools:
1. `list_deployments` with projectId `prj_ZUmjZRJY4TG0X4ROmfLULzB1WF7D` and teamId `team_rkhm3d3pNNYzKHfWsYNHKQ4T`
2. Find the most recent deployment (triggered by the push)
3. Poll `get_deployment` every 15-20 seconds until `readyState` is `READY` or `ERROR`
4. If `ERROR`, pull build logs with `get_deployment_build_logs` and show the user

**Railway:** No MCP available. Use the health endpoint as the verification gate:
```bash
# If gh CLI is available
gh run list --repo Greggwolin/landscape --limit 3
```

### Step 8: Health Verification

Once Vercel shows `READY`, verify both endpoints respond:

**Frontend (Vercel):**
```
GET https://landscape-hazel.vercel.app
Expected: HTTP 200 (or 302 redirect to login — that's OK too)
```

Use the Vercel MCP `web_fetch_vercel_url` tool.

**Backend (Railway):**
```
GET https://landscape-production.up.railway.app/api/docs/
Expected: HTTP 200 (Swagger UI)
```

Use WebFetch for the Railway endpoint.

### Step 9: Create Next Working Branch & Cleanup

After successful deploy:

1. **Create the next working branch** off main, using the versioned naming convention:
   ```bash
   # If we just deployed v0.1.05, next branch is alpha06
   git checkout -b alpha<NEXT_VERSION_NUMBER>
   git push -u origin alpha<NEXT_VERSION_NUMBER>
   ```

2. **Delete stale branches** identified in Step 1:
   ```bash
   # Only delete branches that are fully merged into main
   git branch -d <stale-branch>
   # If remote tracking exists:
   git push origin --delete <stale-branch>
   ```

   Never delete `main`. Ask before deleting the branch we just deployed from (the user may want to keep it for reference).

3. **Switch to the new branch** so the next session starts clean:
   ```bash
   git checkout alpha<NEXT_VERSION_NUMBER>
   ```

### Step 10: Report Results

Present final status:

```
Deploy Complete ✓
  Version: v0.1.05
  Merged: alpha05 → main (16 commits)
  Changelog: published (click version badge to view)
  Vercel: ✓ healthy (landscape-hazel.vercel.app)
  Railway: ✓ healthy (/api/docs/ responding)
  Now on: alpha06 (ready for next round)
  Cleaned up: feature/alpha-prep (deleted)
```

Or if something failed:

```
Deploy Issue ✗
  Version: v0.1.05 (changelog written)
  Merged: ✓
  Pushed: ✓
  Vercel: ✓ healthy
  Railway: ✗ /api/docs/ returned 502 — check Railway logs
```

## Edge Cases

- **Dirty working tree**: Auto-commit (Step 2) unless files look sensitive
- **git index.lock**: Try to remove. If permission denied, tell user to delete from host machine
- **Merge conflicts**: Stop immediately, show conflicts, ask user
- **Push rejected**: Show error, never force-push, ask user
- **Vercel build fails**: Pull build logs, show relevant errors
- **Railway unhealthy**: Suggest checking Railway dashboard
- **Timeout**: If deployment hasn't reached READY after 5 minutes, warn and suggest checking dashboards manually
- **Already on main**: Warn, confirm intent, then just push (skip merge steps)
- **Changelog already exists**: Skip creation, just do version bump commit
- **Django venv unavailable**: Use Node.js + @neondatabase/serverless for DB operations (preferred path)

## What This Skill Does NOT Do

- Force-push anything, ever
- Auto-resolve merge conflicts
- Deploy to staging/preview (this is prod-only)
- Run the full test suite (lint only — add Playwright gate later if desired)
- Touch Railway config or Vercel settings
