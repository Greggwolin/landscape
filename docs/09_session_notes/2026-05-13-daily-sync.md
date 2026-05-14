# Daily Sync — 2026-05-13

**Date**: Tuesday, May 13, 2026
**Generated**: Nightly automated sync
**Branch**: `feature/project-home-redesign`

---

## Work Completed Today

No new code commits today. The single commit on this date (`7582bdbd`) was the nightly health check generated during the previous sync cycle (early morning May 13).

### Health Check Results (2026-05-13 08:05 MST)

| Agent | Status | Notes |
|-------|--------|-------|
| CoreUI compliance auditor | FAIL | 7,486 violations (ongoing tech debt — MUI imports, hardcoded hex, forbidden Tailwind) |
| Django API route enforcer | PASS | No new Next.js API routes; 421 legacy routes, 23 Django viewsets |
| CLAUDE.md sync checker | WARN | `backend/apps/landscaper/views.py` is 23h newer than last CLAUDE.md update |
| Extraction queue monitor | SKIP | Extraction table not found |
| Dead tool detector | FAIL | 3 dead table refs (`tbl_market_comparable` in map_tools, `tbl_knowledge_fact` + `tbl_knowledge_entity` in appraisal_knowledge_tools) |
| Allowed updates auditor | PASS | No mismatches |

## Uncommitted / Untracked Files

- `docs/09_session_notes/2026-05-07` through `2026-05-13` — 7 untracked sync notes accumulating; batch commit recommended
- `reference/netlease/` — 8 untracked net lease PDFs
- `scripts/edgar/` — untracked directory
- `logs/daily-brief.err` — modified (ongoing appends)

## Branch Status

`feature/project-home-redesign` is **7 commits ahead of `main`** (unchanged since May 8):

| Commit | Description |
|--------|-------------|
| `7582bdbd` | docs: nightly health check 2026-05-13 |
| `b3274ddb` | Unify rail + chat + threadlist surfaces to panel-bg (v4) |
| `2116dad9` | Hide chat scrollbar, anchor artifact header, Claude card gap (v3) |
| `622cf547` | Per-section cards + minimal rail padding (v2) |
| `57ad86d3` | Floating-card rail for right artifacts panel |
| `d0c6140f` | Tighten side padding on project home page |
| `3649c1a9` | Rebuild project home page — Claude-style layout |

Branch has been idle since May 8 (5 days, excluding nightly syncs).

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Dead tool detector: 3 dead table references need cleanup (`tbl_market_comparable`, `tbl_knowledge_fact`, `tbl_knowledge_entity`)
- [ ] CLAUDE.md sync: `backend/apps/landscaper/views.py` has changes not reflected in CLAUDE.md
- [ ] Batch commit accumulated session notes (7 files) + health reports
- [ ] Branch idle 5 days — consider merging `feature/project-home-redesign` to main or archiving

## Alpha Readiness Impact

No movement today. Alpha status remains ~92% on the legacy `/projects/[id]` surface. Scanned-PDF/OCR pipeline remains the primary blocker.

## Notes for Next Session

- Branch stalling — 5 days without active development. Decision needed: merge to main or continue iterating.
- CoreUI compliance debt is large (7,486 violations) but not blocking alpha.
- Dead table refs in Landscaper tools are a latent bug risk — `tbl_market_comparable`, `tbl_knowledge_fact`, `tbl_knowledge_entity` are referenced but may not exist in the current schema.
