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

## Workflow

### Step 1: Pre-flight Check

Run these checks and present a summary to the user:

1. **Current branch** — `git branch --show-current`. If already on `main`, warn and ask if they want to proceed (direct push to main).
2. **Uncommitted changes** — `git status --short`. If dirty, show the files and ask if user wants to commit first.
3. **Unpushed commits** — `git log origin/<branch>..HEAD --oneline`. Show what's about to ship.
4. **Lint check** — `npm run lint` (quick sanity gate). If failures, show them and ask whether to proceed anyway.
5. **Branch divergence** — `git fetch origin main && git log HEAD..origin/main --oneline`. If main has commits not in the branch, warn about potential merge conflicts.

Present the summary concisely:

```
Deploy Summary:
  Branch: feature/alpha-prep → main
  Uncommitted: none (or list files)
  Commits to ship: 3 (show oneline list)
  Lint: pass/fail
  Conflicts risk: low/high
```

Then ask: **"Ready to merge and deploy?"**

Do NOT proceed without explicit confirmation.

### Step 2: Merge to Main

On user confirmation:

```bash
# Ensure feature branch is up to date with main
git fetch origin main
git merge origin/main  # Resolve conflicts if any — stop and ask user if conflicts arise

# Switch to main and merge
git checkout main
git merge <feature-branch> --no-ff -m "Merge <feature-branch> into main"
```

If merge conflicts occur, STOP. Show the conflicted files and ask the user how to proceed. Do not auto-resolve.

### Step 3: Version Bump & Changelog

After merging to main but **before pushing**, bump the version and create a changelog entry.

#### 3a. Determine the new version

Read the current version from the Django Changelog table:

```bash
cd backend
./venv/bin/python manage.py shell -c "
from apps.feedback.models import Changelog
latest = Changelog.objects.order_by('-deployed_at').first()
print(latest.version if latest else 'v0.1.0')
"
```

Parse the version string (format: `v0.1.XX`) and increment by .01:
- `v0.1.0` → `v0.1.01`
- `v0.1.01` → `v0.1.02`
- `v0.1.09` → `v0.1.10`
- `v0.1.10` → `v0.1.11`

The version format is always `v0.1.XX` where XX is a zero-padded two-digit number (01-99).

#### 3b. Generate changelog notes

Collect all commits being shipped in this deploy:

```bash
# Get commit messages since the last version tag / last deploy
git log origin/main..main --pretty=format:"%s" --no-merges
```

Transform these raw commit messages into **plain English release notes**. Rules:
- Group related commits into logical changes (don't list every commit)
- Write from the user's perspective, not the developer's ("Fixed loan card layout" not "Updated CSS grid-template-columns")
- Use past tense ("Added", "Fixed", "Improved", "Removed")
- Keep each line to one sentence
- Skip merge commits and housekeeping (linting, formatting-only changes)
- If a commit message is already clear, use it as-is

Example output:
```
- Fixed loan card layout to show all four sections on one row
- Moved origination costs from Year 1 to Time 0 in leveraged cash flow
- Added light grey shading to loan card section headers
- Improved spacing between labels and input fields
```

#### 3c. Write the changelog entry to the database

```bash
cd backend
./venv/bin/python manage.py shell -c "
from apps.feedback.models import Changelog
Changelog.objects.create(
    version='<NEW_VERSION>',
    auto_generated_notes='''<RAW_COMMIT_LIST>''',
    published_notes='''<PLAIN_ENGLISH_NOTES>''',
    is_published=True,
)
print('Changelog entry created: <NEW_VERSION>')
"
```

#### 3d. Commit the version bump

No files need to change — the version is stored in the database, not in code. The changelog entry is written directly to the DB. However, update `package.json` version to stay in sync:

```bash
# Update package.json version field (strip the 'v' prefix)
npm version <NEW_VERSION_WITHOUT_V> --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version to <NEW_VERSION>"
```

#### 3e. Show the user what's being published

Present the changelog entry for confirmation before pushing:

```
Version: v0.1.XX
Notes:
  - Fixed loan card layout ...
  - Moved origination costs ...
```

Ask: **"Changelog looks good? Ready to push?"**

### Step 4: Push to GitHub

```bash
git push origin main
```

Confirm the push succeeded. If it fails (e.g., rejected), show the error and ask the user what to do. Never force-push.

### Step 5: Monitor Deployments

Both Vercel and Railway auto-deploy on push to main. Monitor both:

**Vercel:** Use the Vercel MCP tools:
1. `list_deployments` with projectId `prj_ZUmjZRJY4TG0X4ROmfLULzB1WF7D` and teamId `team_rkhm3d3pNNYzKHfWsYNHKQ4T`
2. Find the most recent deployment (should be triggered by the push)
3. Poll `get_deployment` every 15-20 seconds until `readyState` is `READY` or `ERROR`
4. If `ERROR`, pull build logs with `get_deployment_build_logs` and show the user

**Railway:** No MCP available, so use the health endpoint (Step 5) as the verification gate. Optionally check `gh` CLI if available:
```bash
# If gh CLI is available and Railway GitHub integration is set up
gh run list --repo Greggwolin/landscape --limit 3
```

Tell the user deployment is in progress and give updates as states change.

### Step 6: Health Verification

Once Vercel shows `READY`, verify both endpoints actually respond:

**Frontend (Vercel):**
```
GET https://landscape-hazel.vercel.app
Expected: HTTP 200 (or 302 redirect to login — that's OK too)
```

Use the Vercel MCP `web_fetch_vercel_url` tool for this, since the deployment may be behind Vercel Authentication.

**Backend (Railway):**
```
GET https://landscape-production.up.railway.app/api/docs/
Expected: HTTP 200 (Swagger UI)
```

Use WebFetch for the Railway endpoint.

### Step 7: Report Results

Present final status:

```
Deploy Complete ✓
  Version: v0.1.XX
  Merged: feature/alpha-prep → main
  Commits: 3
  Changelog: published (click version badge to view)
  Vercel: ✓ healthy (landscape-hazel.vercel.app)
  Railway: ✓ healthy (/api/docs/ responding)
```

Or if something failed:

```
Deploy Issue ✗
  Version: v0.1.XX (changelog written)
  Merged: ✓
  Pushed: ✓
  Vercel: ✓ healthy
  Railway: ✗ /api/docs/ returned 502 — check Railway logs
```

### Step 8: Return to Feature Branch (Optional)

Ask the user if they want to:
1. Stay on `main`
2. Create a new feature branch
3. Return to the previous branch

## Edge Cases

- **Dirty working tree at start**: Offer to stash, commit, or abort
- **Merge conflicts**: Stop immediately, show conflicts, ask user
- **Push rejected**: Show error, never force-push, ask user
- **Vercel build fails**: Pull build logs, show relevant errors
- **Railway unhealthy**: Suggest checking Railway dashboard, offer to pull runtime logs if available
- **Timeout**: If deployment hasn't reached READY after 5 minutes, warn user and suggest checking dashboards manually
- **Already on main**: Warn, confirm intent, then just push (skip merge step)

## What This Skill Does NOT Do

- Force-push anything, ever
- Auto-resolve merge conflicts
- Deploy to staging/preview (this is prod-only)
- Run the full test suite (lint only — add Playwright gate later if desired)
- Touch Railway config or Vercel settings
