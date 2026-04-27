# Daily Sync — April 25, 2026

**Date**: Friday, April 25, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added / Progressed
- **Excel Audit Phase 4 — waterfall classifier** (commit fbff515, +974/-19): New `waterfall_classifier.py` (635 lines) classifies Excel-based waterfall structures into typed enums (`tiered_irr_hurdle`, `pref_then_split`, `pref_catchup_split`, `em_hurdle`, `hybrid`, `custom`, `none`). Returns tier list with hurdles, LP/GP splits, `source_cells` map keyed to `Sheet!Cell` refs, plus pref rate/compounding and sponsor co-invest %. New `persistence.py` (214 lines) persists findings to `tbl_excel_audit` + `tbl_excel_audit_finding`. Tool `classify_waterfall` registered in `UNIVERSAL_TOOLS` and advertised via `tool_schemas.py`. Tool count: 262 registered, 259 advertised.
- **Location brief firing discipline — S7 v2** (commits 6aeb329, 016c82a): Redesigned agent test scenario S7 around an "explicit-ask" principle. `generate_location_brief` now fires ONLY on explicit artifact-noun triggers (brief, report, overview, profile, snapshot, summary). Soft asks ("how's the market") trigger an OFFER pattern, not autonomous generation. Added `LOCATION BRIEF — STRICT FIRE/OFFER RULES` section to `BASE_INSTRUCTIONS` in `ai_handler.py`. S7 v2 calibration: 91% pass rate (32/35), all 4 category thresholds met (up from 89% in S7 v1 with 45 variants).

### LoopNet Deal-Sourcing Deferral
- **LoopNet tools deferred** (commits f91dfda, df45ce6, af399cd): Recon confirmed Akamai SCF challenge hard-blocks LoopNet from datacenter IPs (Railway egress). Crexi public JSON API gates filters behind auth + Google Place IDs. Three tool schemas (`loopnet_search_listings`, `loopnet_get_listing_detail`, `loopnet_search_similar`) removed from `tool_schemas.py`; `loopnet_tools.py` and `loopnet-mcp` Railway service retained for revival once a paid feed (ATTOM/Reonomy) is procured post-alpha. Tool count split: 262 registered, 259 advertised. RECIPE 5 (DEAL SOURCING) deleted from `ai_handler.py`; recipes 6-10 renumbered to 5-9.

### Documentation Updated
- **PROJECT_INSTRUCTIONS.md** (commit d7163c2, +675 lines): New canonical behavioral rules file at `docs/PROJECT_INSTRUCTIONS.md`. Consolidates communication style, CC prompt structure, anti-patterns, dual-output spec delivery, downstream-impact analysis, token economy, tool verification, and PDF/OCR protocol into a single cross-system reference. `CLAUDE.md` updated with pointer and division-of-responsibility rules.
- **CLAUDE.md** updated across multiple commits: Phase 4 waterfall classifier added to Excel Audit Pipeline section, location brief firing discipline documented, LoopNet deferral noted with tool count split, last-updated date bumped.

### Technical Debt Addressed
- S7 test manifest simplified from 45 to 35 variants in v2 redesign (-688/+542 lines) — tighter, more focused test coverage
- `ai_handler.py` cleaned up: LoopNet TOOL_DOMAIN_MAP entries removed, recipe list compacted from 10 to 9

## Files Modified

```
CLAUDE.md                                                    |  22+/2- (across 3 commits)
docs/PROJECT_INSTRUCTIONS.md                                 | 675 +++ (new)
backend/apps/knowledge/services/excel_audit/__init__.py      |  26 +-
backend/apps/knowledge/services/excel_audit/persistence.py   | 214 +++ (new)
backend/apps/knowledge/services/excel_audit/waterfall_classifier.py | 635 +++ (new)
backend/apps/landscaper/tool_registry.py                     |   2 +-
backend/apps/landscaper/tool_schemas.py                      | 146 +/- (Phase 4 add + LoopNet remove)
backend/apps/landscaper/tools/excel_audit_tools.py           |  78 +-
backend/apps/landscaper/ai_handler.py                        |  79 +/- (firing rules + LoopNet cleanup)
services/loopnet_mcp/scraper.py                              |  23 +-
services/loopnet_mcp/server.py                               |  99 +/- (debug endpoint + Akamai detection)
tests/agent_framework/manifests/s7_location_brief_intent.json| 196 +/- (v2 redesign)
tests/agent_framework/scenario_s7.py                         | 618 +/- (v2 redesign)
```

## Git Commits

```
af399cd defer LoopNet deal-sourcing tools (gx14)
df45ce6 fix(loopnet-mcp): detect Akamai SCF challenge + tag fetch path
f91dfda chore(loopnet-mcp): add temporary /api/debug endpoint for parser tuning
fbff515 feat(landscaper): activate Excel audit Phase 4 (classify_waterfall)
016c82a Landscaper: tighten location brief firing discipline (S7 v2 after-fix)
6aeb329 S7 v2: redesigned around explicit-ask principle (before-fix baseline)
d7163c2 docs: add canonical PROJECT_INSTRUCTIONS.md and reference from CLAUDE.md
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Excel Audit Phases 5-7 remain: Python replication of waterfall math, Sources & Uses balance check, trust score aggregation, HTML report generation
- [ ] LoopNet revival: blocked until paid feed (ATTOM/Reonomy) procured post-alpha. `loopnet_tools.py` + MCP service retained for easy reactivation.
- [ ] Scanned PDF / OCR pipeline still not implemented (OCRmyPDF identified as preferred solution)

## Alpha Readiness Impact

No movement on the remaining alpha blockers (extraction pipeline OCR is the only real one left). Today's work was incremental: Excel audit pipeline now covers Phases 0-4 (classifier through waterfall), and the location brief tool routing is tighter (91% intent accuracy). LoopNet deferral is a strategic decision, not a regression — deal sourcing was never in the alpha workflow. Alpha readiness holds at ~90%.

## Notes for Next Session

- **Tool count is now split**: 262 registered, 259 advertised. The 3 LoopNet tools exist in `loopnet_tools.py` with `@register_tool` decorators but their schemas were pulled from `tool_schemas.py` so Landscaper won't show them to users. Revival is straightforward — paste schemas back + restore TOOL_DOMAIN_MAP entries.
- **PROJECT_INSTRUCTIONS.md is the new behavioral rules source of truth.** CLAUDE.md now points to it. When behavioral rules change, edit `PROJECT_INSTRUCTIONS.md` first, then mirror to Cowork project settings and Claude.ai project knowledge.
- **Excel audit Phase 4 output**: `classify_waterfall(doc_id)` returns a structured waterfall classification. Next phases (5-7) would replicate the waterfall math in Python to cross-verify Excel's computed values. This is follow-on work, not alpha-blocking.
- **Location brief firing discipline is locked in.** The explicit-ask principle (fire on artifact nouns, offer on soft asks, question on context statements) should be applied to any future artifact-generating tools.
