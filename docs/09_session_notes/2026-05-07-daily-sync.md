# Daily Sync — 2026-05-07

**Date**: Wednesday, May 7, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### UI Polish — Thread Previews & Surface Colors (7 commits)

**Thread summary previews:**
- Bumped preview-summary text color for legibility (`3c08c278`)
- Dropped bold-key-term emphasis in summary previews — client-side strip (`02738201`)
- Scoped `is_active` filter to list action only in Landscaper views, fixing a bug where detail/update endpoints were also filtering on active status (`546f85b6`)
- Moved bold-stripping from client to backend `thread_service.py` permanently (`37d5ac8a`)

**Chat-first UI surface colors:**
- Unified chat-panel surfaces onto `--w-panel-bg` (`5d1205ea`)
- Unified `--w-header-bg` to match `--w-panel-bg` (#1a1e28) (`e3e39a5c`)
- Reverted header unification — kept nav chrome distinct at `#08090A` (`53152cd9`). Decision: headers stay darker than content panels for visual separation.

### Carry-Forward from Overnight (pre-midnight, captured in 3-day window)

**Net-Lease Schema (Increments 1–3):**
- Operator entity foundation (`ff566526`)
- Tenant FK + net-lease extension + cleanup orphan lease infra (`3855f508`)
- EDGAR concept data fetcher + normalizer (`64979af2`)
- Concept catalog schema migration (`d9ea3731`)

**Landscaper Haiku model fix:**
- Bumped Haiku model to 4.5 — prior model retired (`441b9939`)

**Thread preview summaries (FB-292):**
- AI summary rendering in ProjectHomepage thread list (`4e37ad87`)
- Summary-regen trigger repair (`a09922b9`)

**Docs & housekeeping:**
- PROJECT_INSTRUCTIONS v4.6 update (`3b97e41e`)
- Gitignore vendor reference + log noise triage (`f146f99b`, `fb656c92`)

## Files Modified

```
backend/apps/landscaper/services/thread_service.py
backend/apps/landscaper/views.py
src/components/landscaper/LandscaperChatThreaded.tsx
src/components/landscaper/ThreadList.tsx
src/components/wrapper/ProjectHomepage.tsx
src/components/wrapper/RightContentPanel.tsx
src/components/wrapper/WrapperHeader.tsx
src/styles/wrapper.css
```

## Git Commits (today, 7 total)

```
53152cd9 style(wrapper): revert header unification — keep nav chrome distinct at #08090A
e3e39a5c style(wrapper): unify --w-header-bg to match --w-panel-bg (#1a1e28)
5d1205ea style(landscaper/chat): unify chat-panel surfaces on --w-panel-bg
37d5ac8a fix(landscaper/threads): remove bolding from summary previews permanently
546f85b6 fix(landscaper/threads): scope is_active filter to list action only
02738201 style(threads): drop bold-key-term emphasis in summary previews
3c08c278 style(threads): bump preview-summary text color to be legible
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Net-Lease Increment 3 EDGAR pipeline — concept catalog schema landed; fetcher + normalizer implemented. Next: wire into Landscaper tools or admin UI for tenant financial data.
- [ ] Scanned-PDF / OCR pipeline remains unimplemented (alpha blocker #5).

## Alpha Readiness Impact

No alpha blocker movement today. Work was focused on UI polish (thread previews, surface colors) and net-lease schema buildout (post-alpha feature track). Haiku model version fix ensures Landscaper chat stays functional.

## Notes for Next Session

- **Header color decision:** Nav chrome stays at `#08090A` (darker than content panels at `#1a1e28`). The unification was tried and reverted in the same session — don't re-attempt without revisiting the visual hierarchy rationale.
- **Thread `is_active` scoping:** The filter was accidentally applied to detail/update endpoints. Now scoped to list action only (`546f85b6`). Watch for any regression if `LandscaperThreadViewSet` is modified.
- **Bold-stripping moved server-side:** `thread_service.py` now strips `<strong>` tags from summaries before persisting. Client-side strip code was removed. If summary generation prompt changes, verify the regex in `thread_service.py` still catches the patterns.
