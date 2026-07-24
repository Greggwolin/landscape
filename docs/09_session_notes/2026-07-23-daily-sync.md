# Daily Sync — 2026-07-23

**Date**: Wednesday, July 23, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Land Cost What-If Factor Parsing Fix (LSCMD-QB15-COSTSCENARIOFIX-0723)

Single targeted commit (`e471e58e`, +80 lines, -2 lines) fixing cost-side what-if factor parsing in the scenario engine:

**What changed:**
- **New `_cost_factor_from_override()` method** in `whatif_engine.py` — cost overrides now route through a dedicated parser that checks (1) percent-from-label first, (2) currency-unit absolute-target-over-current-total second, (3) standard `_pct_or_ratio_factor` as fallback. Previously, cost overrides used `_pct_or_ratio_factor` directly, which missed label-embedded percentages like "+15%" and mishandled absolute dollar targets.
- **Expanded `_pct_factor_from_label()` regex coverage** — added `+N%` / `-N%` shorthand patterns (e.g., "+15%" → 1.15), and "increase by N%" / "decrease by N%" natural-language patterns. Also added "over" to the above-synonyms list.
- **Two new tests** in `test_whatif_engine.py`: (1) `test_currency_cost_override_uses_percent_label_not_raw_dollar_multiplier` — verifies "Development costs +15%" with currency unit correctly applies 1.15× factor instead of treating 115.0 as a raw multiplier; (2) `test_absolute_cost_override_uses_target_over_current_total` — verifies plain currency target computes factor as target/current (130/100 = 1.3×).

**Impact:** Fixes a class of bugs where cost-side what-if scenarios (e.g., "what if development costs increase 15%") produced wildly wrong results because the factor was computed from the raw dollar value instead of the embedded percentage.

## Files Modified

| File | Changes |
|------|---------|
| `backend/apps/landscaper/services/whatif_engine.py` | +40 / -2 |
| `backend/apps/landscaper/tests/test_whatif_engine.py` | +42 |

## Git Commits

```
e471e58e Fix land cost what-if factor parsing (LSCMD-QB15-COSTSCENARIOFIX-0723)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] What-if engine: Phase 5 (Python waterfall replication for excel audit trust score) still outstanding.
- [ ] Scanned PDF / OCR pipeline remains the primary alpha blocker.

## Alpha Readiness Impact

No change to alpha blocker status. Today's commit continues stabilizing the what-if scenario engine (post-alpha scope) — no movement on tracked alpha blockers.

## Notes for Next Session

- The what-if engine (`whatif_engine.py`) is now at ~1,793 lines with the cost-factor parser addition. Test file at ~264 lines. Both cost and price sides now have dedicated override parsing paths.
- The `_pct_factor_from_label` regex battery now covers 6 patterns: `+N%`, `-N%`, `N% below/lower/...`, `N% above/higher/.../over`, `increase by N%`, `decrease by N%`. This should handle the majority of natural-language what-if labels from Landscaper.
- Working tree is clean, on `main` branch. No uncommitted changes.
