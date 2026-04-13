# Daily Sync — April 12, 2026

**Date**: Saturday, April 12, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Commit: `b21788e` — "docs: nightly health check 2026-04-12"

Documentation-heavy commit: nightly health check, prior day's session note, skills/reference library reorganization, and excel model archive.

### Documentation Updated

- `docs/session-notes/2026-04-11-daily-sync.md` — Created (captures four-status model commit)
- `docs/UX/health-reports/health-2026-04-12_0800.json` — Nightly health check
- `docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md` — Updated latest section for four-status model
- Skills library reorganized: `skills/excel-model-audit-SKILL-v2.md`, `skills/excel-model-audit-SKILL-v3.md`, audit test results
- Excel models consolidated under `skills/excel-models/` (18+ .xlsx/.xlsm files moved/added)
- Reference materials added: `skills/reference/` (Appraisal of Real Estate 14th Ed, MIT AI Valuation, waterfall structures reference, build-to-rent white paper, ALTA settlement form, Stevens Carey articles)
- Gap analysis session notes archived

### Uncommitted Work In Progress (7 files, +252/-84 lines)

Significant extraction pipeline improvements sitting unstaged:

**Extraction Writer Hardening** (`extraction_writer.py`, +170 lines net):
- **Double-encoded JSON fix** — `ai_extraction_staging.extracted_value` is jsonb but some rows arrive double-encoded (JSON string inside jsonb). New coercion at write time parses these back to dicts.
- **Null-like string coercion** — Values like `"null"`, `"none"`, `"n/a"`, `"na"`, `"-"` converted to actual `None` before DB write.
- **User ID tracking** — `ExtractionWriter` now accepts `user_id` parameter, passed through to `FactService` and `EntitySyncService` for `created_by` audit trail.
- **Acquisition scope upsert** — Changed from UPDATE-only to INSERT-or-UPDATE for acquisition table writes. New projects that lack a seeded acquisition row no longer fail silently.

**Workbench JWT Auth** (`workbench_views.py`, +28 lines):
- New `_get_user_from_jwt()` helper manually authenticates raw Django views (not DRF) using SimpleJWT.
- `commit_staging` endpoint now extracts user_id and passes to ExtractionWriter for entity/fact audit trail.

**Supporting Changes:**
- `extraction_service.py` (+35/-) — Adjustments to extraction pipeline flow
- `opex_utils.py` (+21/-) — Operating expense utility refinements
- `text_extraction.py` (+35/-) — Text extraction service improvements
- `extraction_views.py` (+30/-) — Extraction view enhancements
- `useExtractionStaging.ts` (+17/-) — Frontend hook updates

## Files Modified

### Committed (`b21788e`)
```
 docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md         |  19 +-
 docs/UX/health-reports/health-2026-04-12_0800.json       |  73 +++
 docs/session-notes/2026-04-11-daily-sync.md              |  94 ++++
 skills/ (excel models, reference materials, audit docs)   | 2000+ lines
 35 files changed, 2155 insertions(+), 9 deletions(-)
```

### Uncommitted
```
 backend/apps/knowledge/services/extraction_service.py    |  35 +++--
 backend/apps/knowledge/services/extraction_writer.py     | 170 ++++++++++++-----
 backend/apps/knowledge/services/opex_utils.py            |  21 +--
 backend/apps/knowledge/services/text_extraction.py       |  35 +++--
 backend/apps/knowledge/views/extraction_views.py         |  30 +++-
 backend/apps/knowledge/views/workbench_views.py          |  28 +++
 src/hooks/useExtractionStaging.ts                        |  17 ++-
 7 files changed, 252 insertions(+), 84 deletions(-)
```

### Untracked Files (new)
```
 docs/ENTITY_FACT_WIRING_AUDIT.md
 docs/KNOWLEDGE_RETRIEVAL_DISCOVERY.md
 docs/SCHEMA_DUMP_SEEDING_TARGETS.md
 docs/USER_B_SMOKE_TEST_RESULTS.md
 docs/audits/badge-pill-audit.html
 docs/test-data/
 scripts/landscape_test_data_200.json
 scripts/rerun_59_failed_docs.py
 scripts/run_118_doc_test.py
 scripts/seed_config.py
 scripts/seed_user_a.py
 scripts/seed_user_a_knowledge.py
 scripts/test_documents/
 scripts/test_results_118.json
 scripts/test_results_59_retry.json
```

## Git Commits

```
b21788e docs: nightly health check 2026-04-12 (Gregg Wolin, 13 hours ago)
```

## Health Check Results (April 12)

| Agent | Status | Notes |
|-------|--------|-------|
| CoreUI Compliance | FAIL | 6,979 violations (unchanged from Apr 11) |
| Django API Route Enforcer | PASS | 420 Next.js routes, 22 Django viewsets |
| CLAUDE.md Sync Checker | PASS | No stale files |
| Extraction Queue Monitor | SKIP | Table not found |
| Dead Tool Detector | FAIL | Same 2 dead refs in `appraisal_knowledge_tools.py` |
| Allowed Updates Auditor | PASS | No mismatches |

## Active To-Do / Carry-Forward

- [ ] **Commit extraction pipeline hardening** — 7 files with substantial fixes (double-encoding, null coercion, upsert, JWT auth) are uncommitted. Review and commit.
- [ ] **Four-status backend endpoints** — Verify `resolve`, `accept-all-matches`, `accept-all-new` routes work end-to-end (carried from Apr 11).
- [ ] **Dead tool refs** — `appraisal_knowledge_tools.py` references `tbl_knowledge_entity` and `tbl_knowledge_fact` which don't exist. Fix or stub (carried from Apr 11).
- [ ] **CoreUI compliance debt** — 6,979 violations. Not blocking alpha but tracking.
- [ ] **`setInputText` wiring** — Imperative handle exists but no conflict row "discuss" button calls it yet (carried from Apr 11).
- [ ] **Stale worktree dirs** — `.claude/worktrees/` entries being deleted (12 shown in git status). Good cleanup.
- [ ] **Untracked audit/test docs** — Several new docs and test scripts untracked: `ENTITY_FACT_WIRING_AUDIT.md`, `KNOWLEDGE_RETRIEVAL_DISCOVERY.md`, `USER_B_SMOKE_TEST_RESULTS.md`, seeding scripts. Decide what to commit.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No alpha blocker movement today. The uncommitted extraction pipeline hardening (double-encoding fix, null coercion, acquisition upsert) directly improves the **Extraction Pipeline** blocker (#5) — once committed and tested, extraction reliability for the Ingestion Workbench should improve meaningfully.

## Notes for Next Session

1. **Priority: commit extraction pipeline changes** — The 7-file diff addresses real extraction failures (double-encoded jsonb, null strings, missing acquisition rows). These are quality fixes that should be committed.
2. **Test extraction end-to-end** — After commit, run a document through the full pipeline: upload → extract → workbench review → commit staging → verify production table writes.
3. **Untracked docs decision** — `ENTITY_FACT_WIRING_AUDIT.md` and `KNOWLEDGE_RETRIEVAL_DISCOVERY.md` look like useful audit artifacts. Consider adding to `docs/audits/`.
4. **Skills library is growing** — 18+ Excel models + reference PDFs now in `skills/`. This is useful for the excel-model-audit skill but adds repo weight. Consider `.gitignore` for large binaries or move to external storage.
