# Daily Sync — 2026-05-15

**Date**: Thursday, May 15, 2026
**Generated**: Nightly automated sync
**Branch**: `feature/user-dashboard`

---

## Work Completed Today

### Features Added
- **Artifacts panel on dashboard** (`b57d76c6`): Mounted the right-rail artifacts panel on `/w/dashboard`, giving the home surface the same artifact display capability as project views.
- **Unassigned artifacts on home rail** (`c123bb14`): Surfaced artifacts created in unassigned (pre-project) threads on the home dashboard artifacts rail.
- **Location brief as unified artifact** (`36e0e0d6`, `fc50be8a`, `80ee415d`): Wrapped `generate_location_brief` output into the unified artifact system. Location brief now renders in the same panel layout as project artifacts, with title included in tool result.
- **Landscaper Phase 3 — intent classification + navigation** (`42abdd09`): Added intent classification system and navigation tools (`navigation_tools.py`, 265 lines). Landscaper can now classify user intent and navigate the UI accordingly. Tab sweep included.
- **Cross-project read override** (`80b5523b`, `cbd9543a`): Tool executor now supports cross-project reads with brace escaping in tool-call examples.
- **Auth landing on /w/dashboard** (`270c72e6`): Authenticated users now land on `/w/dashboard` instead of the legacy project list.
- **Report-as-artifact server-side rendering** (`f8374f8b`, `7c1364aa`, `39dd710d`): New `report_artifact_tools.py` (1 tool) + `artifact_adapter.py` (216 lines). All 20+ report generators can now render directly as artifacts, bypassing LLM row composition entirely. Fixes the max_tokens-mid-tool-use class of bugs. Hardcoded report code enum for safety. Firing discipline rerouted through `render_report_as_artifact`.
- **Legacy route redirects** (`37e5e680`): Added Next.js redirects in `next.config.ts` to funnel legacy top-level routes (`/`, `/register`, `/login`) to `/w/` counterparts.
- **Onboarding cleanup** (`4a2694d5`): Removed 1,861 lines of dead onboarding code (OnboardingChat, OnboardingSurvey, DocumentUploadModal + their .bak files). Simplified LoginForm.

### Bugs Fixed
- **Chat cards for all artifact tools** (`4c34e632`): Ensured chat cards render for every artifact tool type. Clear active artifact on project change to prevent stale panel.
- **Artifact panel on /w/chat** (`314f0dba`): Phase 4 artifact panel now correctly mounted on the `/w/chat` route.
- **Full-row completeness on artifact tools** (`e64a99c8`): Artifact tools now require complete row data, preventing partial renders.
- **Mid-chain continue fixes** (`14f5689b`, `d41a5da0`): Fixed orphan `tool_use` blocks and built proper `tool_result` placeholders in the mid-chain continue path. Addresses the max_tokens truncation issue.
- **Home dashboard prompt alignment** (`6c0303f6`): Aligned home-dashboard system prompt with Phase 3 intent classifier.
- **Admin role fallback** (`27e956da`): Unrecognized roles now default to `alpha_tester` in EditUserModal instead of crashing.
- **Chat input clear after auto-send** (`d2e0b4c4`): Fixed lingering text in chat input after auto-send from dashboard seed query.
- **Artifacts rail UX** (`9f4048ba`): Hide artifacts rail when empty on home; relabeled "Documents" for clarity.

### Documentation
- Nightly health check (`194d9f69`, `0c008e8b`): Health report JSON + session history note.

## Files Modified (key files, not exhaustive)

```
backend/apps/landscaper/ai_handler.py              (multiple touches — intent classifier, prompt alignment)
backend/apps/landscaper/tool_executor.py            (cross-project read override)
backend/apps/landscaper/tool_registry.py            (new tool registrations)
backend/apps/landscaper/tool_schemas.py             (navigation + report schemas)
backend/apps/landscaper/tools/navigation_tools.py   (NEW — 265 lines)
backend/apps/landscaper/tools/report_artifact_tools.py (NEW — render_report_as_artifact)
backend/apps/landscaper/tools/location_brief_tools.py (unified artifact wrapper)
backend/apps/reports/artifact_adapter.py            (NEW — 216 lines, report→artifact bridge)
next.config.ts                                      (legacy route redirects)
src/app/login/LoginForm.tsx                         (simplified, onboarding removed)
src/app/w/dashboard/page.tsx                        (artifacts panel, layout tweaks)
src/app/w/layout.tsx                                (auth landing, panel mounts)
src/app/onboarding/                                 (DELETED)
src/components/Onboarding/                          (DELETED — 1,861 lines)
```

## Git Commits (26 today)

```
4a2694d5 feat(login): pull onboarding interview from alpha
37e5e680 feat(routing): redirect legacy top-level routes to /w/ counterparts
39dd710d fix(landscaper): reroute firing discipline to render_report_as_artifact
7c1364aa fix(landscaper): hardcode report code enum, resolve tool conflict
f8374f8b feat(landscaper): render any report as artifact server-side
d41a5da0 fix(landscaper): build tool_result placeholder in-place on mid_chain_continue
14f5689b fix(landscaper): close orphan tool_use in mid_chain_continue path
e64a99c8 fix(landscaper): require full-row completeness on artifact tools
314f0dba fix(user-dashboard): mount Phase 4 artifact panel on /w/chat
270c72e6 feat(auth): land authenticated users on /w/dashboard
cbd9543a fix(landscaper): escape braces in cross-project tool-call examples
80b5523b feat(landscaper): cross-project read override in tool executor
27e956da chore(admin): default unrecognized role to alpha_tester in EditUserModal
6c0303f6 fix(landscaper): align home-dashboard prompt with Phase 3 intent classifier
42abdd09 feat(landscaper): Phase 3 — intent classification + navigation + tab sweep
80ee415d feat(user-dashboard): unify location-brief panel layout with project pattern
fc50be8a fix(landscaper): include title in location-brief tool result
36e0e0d6 feat(landscaper): wrap generate_location_brief as unified artifact
c123bb14 fix(user-dashboard): surface unassigned artifacts on home rail
9f4048ba feat(user-dashboard): hide artifacts rail on empty home; relabel Documents
4c34e632 fix(landscaper): chat cards for all artifact tools; clear active artifact on project change
b57d76c6 feat(user-dashboard): mount artifacts panel on dashboard
0c008e8b docs(history): note LF-USERDASH-0514 prompt-box work landed in 194d9f69
194d9f69 docs: nightly health check 2026-05-15
d2e0b4c4 fix(user-dashboard): clear chat input after auto-send
cafbb836 fix(user-dashboard): restore auto-send after race fix
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned-PDF / OCR pipeline still not implemented (last remaining alpha blocker)
- [ ] Navigation tools (Phase 3) need production verification — intent classifier + tab sweep may need tuning based on real user interactions
- [ ] Report-as-artifact adapter covers 20+ generators but may need edge-case handling for generators with non-standard preview shapes
- [ ] BASE_INSTRUCTIONS cleanup deferred — ~80 lines of pre-guard T-12 rules still in ai_handler.py

## Alpha Readiness Impact

Today's work significantly advances the chat-first UI (`/w/`) as the primary surface:
- Auth landing now goes to `/w/dashboard` (milestone for alpha cutover)
- Legacy route redirects ensure no dead-end URLs
- Artifacts system now covers reports (20+ generators) + location briefs + all existing artifact types
- Intent classification (Phase 3) gives Landscaper the ability to navigate the UI contextually
- Dead onboarding code removed (-1,861 lines) simplifies the login flow

The `/w/` surface is now close to feature-complete for alpha. Remaining gap is the scanned-PDF/OCR pipeline.

## Notes for Next Session

- **Report artifact rendering** is the big architectural win today — removes LLM from tabular row composition, fixing the entire class of max_tokens truncation bugs. Watch for edge cases in report generators with unusual preview dict shapes.
- **Navigation tools** (`navigation_tools.py`) add 2 new Landscaper tools. CLAUDE.md tool count should be updated once exact registry count is confirmed against the running server.
- **Cross-project reads** are now supported in the tool executor — this was previously blocked. Verify it works correctly with the entity guard rules.
- **Onboarding deletion** was clean but verify no import references remain in other files.
