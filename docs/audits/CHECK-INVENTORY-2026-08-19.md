# Automated Check Inventory — 2026-08-19

**Session:** `LSCMD-BC-CHECKAUDIT-0819-BC5`
**Scope:** Every automated check in and around the `landscape` repo — proven capable of failing, or fixed/retired/surfaced if it wasn't.

---

## The disaster-recovery drill (handled first, per the priority added after BC6)

BC6 established that 176 live, application-code-referenced tables and views — including `tbl_project` — have no file anywhere in the repository. The Neon database is the only durable copy of the schema. That makes the backup/restore path the single most consequential check in this inventory.

**Finding: the drill has never completed a single run since it was created.**

`.github/workflows/disaster-drill.yml` (created 2025-10-16, commit `a174df6e`) had a YAML syntax error present since that first commit: the "Simulate corruption" step's closing heredoc delimiter (`EOF`) sat at column 1, while the surrounding `run: |` block is indented 10 spaces. YAML block scalars end at the first line indented less than the block's own indentation -- so this `EOF` silently terminated the block early, corrupting the rest of the document. Every trigger (`schedule: '0 2 * * 0'`, `workflow_dispatch`, and even `push`, despite its `paths-ignore: ['**']` guard, which can't suppress a run when the workflow itself fails to parse) has produced a `startup_failure` with **zero jobs run** -- confirmed directly: `gh run list --workflow disaster-drill.yml --limit 200` returns 200/200 push-triggered runs, every one a startup failure, and **zero** schedule- or workflow_dispatch-triggered runs in the entire history. The weekly Sunday 2am cron has never once actually fired a job in ~10 months.

**Fixed:** indented the closing `EOF` to match the block (10 spaces), mirroring the file's own working pattern -- the "Generate report" step's heredoc, ~150 lines later in the same file, does this correctly and was the reference. Re-validated with a Python YAML parser: now parses cleanly. Also added the `timeout-minutes: 3` + retry guard to its "Install PostgreSQL client" step that BC4 added to `preview.yml`'s identical step but never applied here (same hang class, unpatched).

**Not done, deliberately:** this session did not trigger a real end-to-end drill run. Doing so spends real Neon quota/cost creating and corrupting branches, and per this session's standing instruction, actions that spend unrecoverable money/quota are reported and proposed, not executed unprompted. **Recommendation: the next Sunday 2am UTC run (or an explicit `gh workflow run disaster-drill.yml` if Gregg wants it sooner) will be the first real end-to-end test this mechanism has ever had.** Until that runs and is confirmed, the restore path remains unverified in practice -- the YAML fix only proves the workflow can now execute, not that the restore logic inside it is correct.

**A second, deeper finding, independent of the syntax bug:** as designed, this drill does not test genuine point-in-time recovery. Step 4 ("Perform point-in-time restore") creates a **new branch from the still-live `production` branch** -- not a snapshot from before the simulated corruption. Because the corruption in Step 3 is applied only to a separate test branch (created in Step 1) and `production` itself is never touched, the "restore" step is really "create an untouched copy of production a second time," not an exercise of Neon's actual PITR/time-travel restore feature. If `production` itself were ever the one corrupted, this workflow -- even fixed and passing -- would not prove it could be recovered. This is a design gap, not a bug; redesigning the drill to branch `production` from an explicit past timestamp (Neon supports `neonctl branches create --parent production --timestamp <iso8601>`) is recommended as a follow-up, and is a larger, more deliberate change than this session's mandate to fix/retire/surface existing mechanisms.

**Recovery window:** not established. Neon's actual PITR retention window for this project (how far back a restore can reach) was not verified in this session -- it requires either the Neon console/API (this sandbox has no `NEON_API_KEY`) or Gregg checking the Neon dashboard directly. Recommend checking this alongside authorizing the first real drill run.

**Would a failure reach Gregg?** Partially, and only once the workflow can actually run. The workflow has "Notify success"/"Notify failure" steps that post a GitHub commit comment -- but those never fired either, since the job never got past `startup_failure` (a parse failure produces zero jobs, so no step -- including the notification steps -- ever executes). Once the syntax fix lands, a *future* failure would post a commit comment (visible on the commit, not proactively pushed anywhere) -- this is the "reports where nobody looks" category from Phase 3, and is routed into the new nightly-brief "Automated checks" section below so a failure doesn't require someone to go looking at a specific commit's comment thread.

---

## The six claims

| # | Claim | Verdict | Detail |
|---|---|---|---|
| 1 | Nightly DB-structure snapshot captures ~half the tables, silently | **CORRECTED** | The capture bug itself is real and was fixed by BC3 (`scripts/export_schema.py` / `context_utils.py`, commit `d6b427d1`, PR #251) -- it now cross-checks against `pg_class`/`pg_namespace` directly and fails loudly (`## CAPTURE STATUS: DISCREPANCY DETECTED`, exit 1) on any mismatch. But the "nightly" framing is wrong: **nothing automated invokes it.** No launchd plist, no Cowork task, no CI workflow calls `scripts/generate-daily-context.sh` (the wrapper that runs it). It is a manual, on-demand tool. The last real output on disk is dated 2026-02-13 -- over six months stale -- and BC3's fix has not been exercised by a real invocation since it landed. |
| 2 | Disaster-recovery drill has been failing, leaving the restore path unproven | **CONFIRMED, and worse than the claim states** | Not "failing" in the sense of running and going red -- it has never run at all (see above). The "failing on every push" framing in the source material is imprecise; `paths-ignore` doesn't fully suppress the record because the workflow can't be parsed to evaluate the trigger filter, so a run record with zero jobs is still created on every push, but scheduled/manual runs also never fired. |
| 3 | A nightly deployment check writes to a wrong user's home folder, reporting healthy by silence for months | **CORRECTED -- already resolved before this session** | Source: `landscape-vercel-check`, a Cowork scheduled task, writing to `/Users/greggwolin/...` (wrong user -- correct is `5150east`) at a path superseded 2026-07-24, untouched since 2026-03-22. Its own `SKILL.md` now carries: *"RETIRED 2026-08-03 (session DL4B). No scheduled task exists for this folder; nothing runs this."* Retired 16 days before this audit started. Current state is not "broken" -- it's "absent": no Vercel deployment health check runs for Landscape today. That's a real, separate gap (see Phase 3 below), but it's not the claim as stated. |
| 4 | The 15-minute auto-commit safety net has not run since 2025-09-19 | **CONFIRMED, exactly** | `git log` shows the last `Auto-commit: Save work progress` commit dated 2025-09-19 16:59:28 -- nothing since, ~11 months. Root cause: `scripts/start-auto-commit.sh` is a bare `nohup ... &` background loop with **no launchd plist** behind it (its own comment: *"Since cron is not available in this environment"*). It dies on any reboot, logout, or terminal-session end and never restarts itself. `.auto-commit.pid` in the primary checkout points at a PID that is not running. No `auto-commit.log` exists anywhere in the current checkout. |
| 5 | ~21 artifact integration tests silently skip because an import-time guard queries a DB that isn't there | **CONFIRMED, exactly, and fixed** | `backend/apps/landscaper/tests/test_artifact_integration.py` has exactly 21 `test_` methods across 4 classes, each guarded by `@unittest.skipUnless(_artifact_tables_present(), ...)` -- a decorator argument evaluated at **module import time**, during pytest collection, before `conftest.py`'s lazy test-DB build (`managed=True` flip + `--run-syncdb`) has run. Confirmed via a real CI log (run `32287546347`, job `96180551621`, 2026-08-19): all 21 skip, every time, unconditionally. **Fixed** this session: moved the check into each class's `setUp()` (which runs after the DB fixture is live). Verified against a real local Postgres 14 test DB: before the fix, 21/21 skip; after, 21/21 execute -- 16 passed immediately, 5 failed with a genuine bug (an `APIClient` that was never authenticated, hitting a real 401 from `IsAuthenticated` -- the endpoints were correctly rejecting the unauthenticated request, the test setup was incomplete). Fixed that too (`force_authenticate`, matching the pattern already used in `apps/projects/tests_api.py`). Full suite: 21/21 passing. Whole backend suite: 849 passed / 20 skipped (was 828/41 before this fix -- exactly the 21 tests moving from skip to pass). |
| 6 | A package install in CI hangs with no timeout | **CONFIRMED fixed in BC4, with one gap closed this session** | `preview.yml`'s "Install PostgreSQL client" step has carried `timeout-minutes: 3` + a retry since BC4. Never independently tested by a real hang (noted, left as-is -- inducing a real network hang isn't a safe or practical Phase-2 proof). **New finding this session:** `disaster-drill.yml` had the *identical* step with **no timeout guard at all** -- the same hang class, unpatched, in a sibling file. Fixed to match. |

---

## Full inventory

### CI workflows (`.github/workflows/`)

| Check | What it checks | Trigger | Output goes to | Human sees on failure |
|---|---|---|---|---|
| **SQL Migration Recovery Guard** | Any `.sql` file under `migrations/`/`backend/migrations/` on disk but untracked by git; and (new this session) whether either directory is currently gitignored via a canary-file probe | PR push (no base filter) | PR status check | Red X on PR, **required**, blocks merge |
| **Build and Test** | `npm run lint` / `typecheck` / `build` / `test:unit` (now the full real jest suite, see below) | PR push (no base filter) | PR status check | Red X on PR, **required**, blocks merge |
| **Backend Tests** | `pytest` against a throwaway Postgres 16 service container | PR push (no base filter) | PR status check | Red X on PR, **required**, blocks merge |
| **Create Database Branch / Run Migrations** | Creates a Neon PR-scoped branch, applies migrations + a SQL smoke test | PR push (no base filter) | PR status check | Red X on PR, visible but **not required** -- known intermittent Ubuntu-mirror-install hangs pre-date this session |
| **Production Deployment (`test` job)** | lint/typecheck/build/`test:unit` (hermetic, no live DB) | push to `main` | Actions tab only | **Not a PR check** (post-merge only); no notification step -- a failure is a red X on the `main` commit in the Actions tab and nowhere else |
| **Production Deployment (`health-check` job)** | curls the live URL, expects 200 | push to `main`, after `test` | Actions tab only | Same as above -- no proactive notification |
| **Cleanup Preview** | Deletes the Neon branch on PR close | PR closed (no base filter) | PR comment (best-effort, `continue-on-error`) | A failed cleanup doesn't block anything and isn't loudly surfaced -- an orphaned Neon branch would only be noticed by someone checking the Neon console |
| **Disaster Recovery Drill** | Neon branch-based corruption/restore simulation (see dedicated section above) | Sunday 2am UTC, manual dispatch | GitHub commit comment (on success/failure) + uploaded report artifact | Previously **nothing ran at all** (fixed this session); a future failure posts a commit comment, not otherwise pushed anywhere -- now also routed into the nightly brief |

### Git hooks (`.husky/`)

| Check | What it checks | Human sees on failure |
|---|---|---|
| `pre-commit` (`lint-staged` → `eslint --fix`) | Any staged `.js/.jsx/.ts/.tsx` file with an eslint error that can't be auto-fixed | Commit refused at the terminal, staged changes reverted automatically by lint-staged; visible only if watching the terminal at commit time |
| `commit-msg` (FB-304 guard) | Rejects a commit whose first line starts `docs: nightly health check` if its staged paths include source/code (not pure generated docs) | Commit refused at the terminal with an explicit explanation; same visibility caveat |

### Backend / frontend test suites

| Suite | Where it runs | Notes |
|---|---|---|
| pytest (Django backend) | `Backend Tests` CI job, required | 849 passed / 20 skipped as of this session (was 828/41 before the artifact-test fix) |
| Jest (frontend unit tests) | `Build and Test` CI job (`test:unit`), required | **Fixed this session** -- was a 2-path allowlist that silently excluded 16 of 19 real spec files (230+ of 251 tests); now runs everything real via `jest.config.ts`'s `testPathIgnorePatterns` excluding only genuine Playwright specs. Surfaced 8 real pre-existing failing assertions across 3 files (lease rollover math, S-curve allocation math, a stale property-taxonomy label) -- marked `test.failing()`, dated, tracked, not silently dropped; still executes and reports every run |
| Playwright (`tests/e2e/`, `tests/contrast.probe.spec.ts`, `tests/ui_agent_framework/scenarios/`) | **Nowhere, automatically** | See dedicated section below |

### Scheduled jobs on this Mac (launchd)

| Job | Schedule | Status | Output |
|---|---|---|---|
| `com.landscape.daily-brief.plist` | 23:30 daily | **Loaded, running, last exit 0** -- confirmed via `.err` log entries through 2026-08-18 23:30 | `logs/daily-brief.err` (active); `logs/daily-brief.log` empty since May 16 (nothing writes to stdout, harmless) |
| Auto-commit safety net | *(intended: every 15 min, never had a real backing plist)* | **Dead since 2025-09-19** -- see Claim 4 above | None -- no log file exists |

### Cowork scheduled tasks (`~/Documents/Claude/Scheduled/`)

| Task | Status |
|---|---|
| `landscape-health-check` | Disabled 2026-04-29 -- folded into `landscape-daily-briefing` step G |
| `landscape-vercel-check` | Retired 2026-08-03 -- see Claim 3 |
| `landscape-daily-briefing` | Live -- appears to run the health-check pipeline below as its "step G"; not independently re-verified end-to-end this session |
| `nightly-landscape-sync` | Live -- calls `scripts/nightly/commit-generated-docs.sh` |
| `landscape-daily-log` | Live -- build-status/log generation; multiple in-progress-looking backup files present, not re-verified this session |

### Health-check pipeline (`scripts/health/`)

`run-health-check.sh` orchestrates 6 agents (`coreui-audit.sh`, `django-route-enforcer.sh`, `claudemd-sync.sh`, `extraction-queue.sh`, `dead-tools.py`, `allowed-updates-audit.py`), writing `docs/UX/health-reports/health-<timestamp>.json`. **Confirmed actively running daily** -- files present for every date 2026-08-10 through 2026-08-19. Already has a real staleness detector in `generate_daily_brief.py`'s `gather_health_status()` (reports `status: 'skipped'` with a reason if the latest file is stale or missing) -- this is the one mechanism in the whole inventory that already had a working freshness check before this session. Its results are now included in the new "Automated checks" brief section rather than only the separate "System Status" section.

### Other schedules

- **Vercel cron** (`vercel.json`): `POST /api/cron/sync-cpi-to-settings` at `0 12 15 * *` (15th of each month). A failure would only appear in Vercel's own cron-invocation logs -- not independently re-audited this session, flagged for a future pass.
- **No system crontab** for this user (`crontab -l` → no crontab).

---

## Playwright specs: do they run? **No -- confirmed explicitly.**

Six genuine Playwright spec files exist: `tests/contrast.probe.spec.ts`, `tests/e2e/contrast.e2e.spec.ts`, and four under `tests/ui_agent_framework/scenarios/`. (Three other `.spec.ts` files under `tests/` -- `investmentMetrics.spec.ts`, `lease-calculator.spec.ts`, `lease-rollover.spec.ts` -- are genuine Jest specs, not Playwright, despite the shared naming convention; verified by file content, not filename pattern.)

**Zero of the six run anywhere automatically** -- not in any CI workflow, not in a git hook, not on any schedule. `preview.yml` carried a comment claiming the contrast e2e test "runs in the post-deploy api-tests job" -- that job was removed (no `VERCEL_TOKEN`, dead deploy dependency) and never replaced; the comment was stale and has been corrected this session. They only run if a human invokes `npm run test:contrast`, `test:ui`, or `test:headless` by hand.

**Disposition: Surfaced, not fixed or retired.** Wiring them into CI for real needs a deployed-preview URL and a `VERCEL_TOKEN` secret -- infrastructure and a cost/complexity decision this session isn't positioned to make unilaterally (already flagged as deferred by a prior session's comment, tracked alongside #43/#39). Deleting them would discard real test coverage (contrast/accessibility compliance, UI agent smoke scenarios) with no clear benefit. The honest middle ground: the corrected comment now says so plainly in the workflow file, and the nightly brief's new section reports them as never-run rather than letting their existence imply coverage that doesn't exist.

---

## Phase 2 -- proof log (every deliberate break, and its revert)

All performed in scratch worktree `/tmp/landscape-bc5`, branch `chore/check-audit-0819`, PR #253. Every break below was reverted in the same session before the PR merged; none reached `main`.

| Check | Break | Result | Reverted |
|---|---|---|---|
| `commit-msg` (FB-304 guard) | Staged `backend/manage.py`, committed with message `docs: nightly health check ...` | **Rejected**, exit 1, exact expected error text | Yes -- `git reset` + `git checkout --` |
| `pre-commit` (lint-staged) | First attempt (unused var) was auto-fixed by `eslint --fix`, not a real proof. Second attempt: genuine JS syntax error (`(x any) =>`, missing paren) | **Rejected**, exit 1, staged changes automatically reverted by lint-staged | Yes -- probe file deleted, unstaged |
| `Build and Test` (typecheck) | `src/lib/_bc5_typecheck_probe.ts` assigning a string to a `number`-typed const | **Failed in real CI** (`TS2322`), confirmed via job log | Yes -- file deleted, follow-up commit pushed |
| `Backend Tests` | New throwaway test file asserting `1 == 2` | **Failed in real CI** (`assert 1 == 2`, run `32308082946`, job `96245095569`), confirmed via job log | Yes -- file deleted, follow-up commit pushed |
| `SQL Migration Recovery Guard` (original check) | **Could not be tripped as originally written -- see structural finding below.** | N/A -- structurally always-true post-checkout | N/A -- superseded by the canary check below |
| `SQL Migration Recovery Guard` (new canary check) | Added `backend/migrations/*.sql` to `.gitignore` -- the exact regression class the guard exists to catch | **Failed in real CI** -- `##[error]backend/migrations is currently gitignored -- a real .sql migration file placed here would silently never be tracked.` (run `32308908165`, job `96247616163`), confirmed via job log | Yes -- `git revert`, `.gitignore` restored |
| `Disaster Recovery Drill` | Not executed live (cost/quota) | N/A -- see dedicated section above | N/A |

**Structural finding -- SQL Migration Recovery Guard's original check can never independently fail in CI.** Its logic compares `find migrations backend/migrations -name '*.sql'` (files on disk) against `git ls-files ... -- '*.sql'` (files git tracks), immediately after `actions/checkout@v4` with no intervening step. `actions/checkout` can only ever materialize exactly the tracked file set for a given commit -- there is no way for a file to be present on disk but absent from `git ls-files` at that point, because checkout doesn't "restore" untracked/ignored local state; it deterministically writes out the tracked tree. Verified this is not a one-off: the job has no `needs:` on any other job and no step before checkout, so no other job's output could leave a stray file either. This means the check has been structurally unable to independently regress-test the exact failure mode it was built for (a `.gitignore` rule silently re-excluding a real migration file) since the moment it was written -- it would show green even if `.gitignore` regressed to the old blanket `*.sql` rule tomorrow, because a gitignored file simply never reaches CI's checkout in the first place. **Fixed this session:** added a second step that creates a temporary canary `.sql` file in each directory and checks whether `git add --dry-run` would actually track it -- this is the functional test that can trip on a real gitignore regression (verified locally: exits 0 for a trackable canary, 1 for a gitignored one, using `git add --dry-run`, not `git check-ignore -v`, per the false-negative already on record for that command with standalone negation rules).

---

## Phase 3 -- dispositions

| Check | Disposition | Why |
|---|---|---|
| `disaster-drill.yml` YAML parse failure | **Fixed** | Reversible one-line indentation fix; restores the workflow's ability to run at all |
| `disaster-drill.yml` postgres-client timeout | **Fixed** | Matches BC4's already-established fix for the identical step elsewhere |
| `disaster-drill.yml` PITR design gap | **Surfaced, not fixed** | A real redesign (branch `production` from an explicit past timestamp), bigger than this session's fix/retire/surface mandate for existing mechanisms; documented above and in the completion report as the top follow-up |
| `test:unit` / `jest.config.ts` allowlist gap | **Fixed** | Structural fix (exclude Playwright by pattern, run everything else) closes the class of bug, not just today's instance |
| `test:tokens` (production.yml's narrower duplicate) | **Retired** | Zero callers once `production.yml` was repointed to `test:unit`; a check nobody calls is worse than none |
| 8 real failing jest assertions surfaced by the above | **Surfaced, not fixed** | Genuine financial-calculation and API-contract bugs (lease rollover math, S-curve math, a stale taxonomy label) outside this audit's scope; marked `test.failing()` -- dated, tracked, still runs every pass, flips to a real failure the moment the code changes |
| `test_artifact_integration.py` import-time skip guard | **Fixed** | Moved to `setUp()`; verified 21/21 now execute against a real test DB |
| `ArtifactRestEndpointTests` unauthenticated `APIClient` | **Fixed** | Test-setup gap, not application code -- the endpoints were correctly rejecting the request; matches an existing pattern already used elsewhere in the codebase |
| SQL Migration Recovery Guard structural gap | **Fixed** | Added the canary-based functional check; kept the original check too (harmless, real defense-in-depth against a future pipeline reorder) |
| Stale `preview.yml` comment describing a removed `api-tests` job | **Fixed** | Misleading documentation implying coverage that doesn't exist -- directly in scope for a session about silent false confidence |
| Playwright specs never running | **Surfaced** | See dedicated section above |
| Nightly DB-structure snapshot never actually scheduled | **Surfaced, not fixed** | The script itself is fixed (BC3) and correct; scheduling it means standing up a new recurring job (a GitHub Actions cron with live-DB credentials, or a new launchd plist) -- a bigger decision than repairing an existing mechanism, and this session's standing instruction is to report and propose rather than create new standing automation unprompted. **Recommended**: a small scheduled GitHub Actions workflow (reuses the same Neon secrets pattern already in `disaster-drill.yml`) rather than a local launchd job, since it shouldn't depend on Gregg's laptop being on |
| Auto-commit safety net (dead since 2025-09-19) | **Surfaced, not fixed or retired** | Per this session's standing instruction: stopping, disabling, or deleting a job Gregg may still depend on isn't this session's call, and reviving it (a real launchd plist) is a new-standing-infrastructure decision, not a repair to something already running. Listed plainly in the brief as dead; Gregg's call whether to revive (as a real launchd job) or retire it outright |
| `landscape-vercel-check` (wrong-home-folder check) | **No action -- already retired 2026-08-03** | Resolved before this session started; noted for the record only |

---

## What this proves and what it does not

**Proven:** every required CI check (Build and Test, Backend Tests, SQL Migration Recovery Guard) genuinely blocks a merge on a real failure -- not assumed, demonstrated with real deliberate breaks and real CI runs. The two git hooks genuinely refuse a bad commit. The artifact-integration and full-jest-suite fixes are proven by a real before/after run against a live database, not just code review.

**Not done, deliberately, per this session's scope and standing instructions:**
- No real disaster-recovery drill was executed (cost/quota, report-and-propose).
- No new standing schedule was created on this Mac or in GitHub Actions (the nightly-snapshot and auto-commit gaps are surfaced, not filled).
- No application bugs uncovered as a side effect (8 jest failures, the artifact-REST 401, none of the DR drill's PITR design questions) were fixed beyond what was needed to make the *check* honest -- the underlying calculations and the drill's design are flagged for dedicated follow-up sessions, not patched here.
