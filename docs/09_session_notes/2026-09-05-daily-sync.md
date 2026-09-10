# Daily Sync — 2026-09-05 (Friday)

**Commits on `origin/main`:** 2

---

## Commits

### 1. Market refresh workflow (#267)
- GitHub Actions workflow `market-refresh.yml` for automated monthly market data refresh
- New Django management command `refresh_market_data.py`
- Migration `20260823_cpi_auto_sync_settings` — CPI auto-sync settings table
- CPI sync cron rewritten to use the new infrastructure
- First automatic refresh scheduled for 2026-09-16

### 2. Variance endpoint fabricated actuals (#273)
- Anti-fabrication fix: variance endpoint was inventing actual cost figures
- New serializer enforces real data only
- Test `test_variance_actuals.py` added
- `AdviceAdherencePanel` updated in views.py
- Continues the 3-day anti-fabrication sweep (rent-control cap #272, discount rate #269, hardcoded other-income #271, inflation default #268)

---

## Branch status

| Branch | Ahead | Status |
|--------|-------|--------|
| `feat/parcels-artifact` | 11 | Waiting for review (~15 days) |
| `fix/market-refresh-and-cron-0821` | 6 | Waiting for review (~14 days) |

## Working tree

- `CLAUDE.md` modified (unstaged audit entry update)
- 4+ untracked daily-sync files from prior runs
- Local main 1 commit ahead of origin (unpushed doc commit)

## CLAUDE.md

No update needed. Market refresh is infra (GH Actions + management command), not tracked in architecture section. Variance fix continues the documented anti-fabrication pattern.

## CARRY_FORWARD.md

No changes. Both items remain open:
- Demo project clones need re-run
- PropertyTab floor-plan double-counting unverified

## Notes

- Anti-fabrication work is the dominant theme this week: 5 fixes in 3 days
- Gregg's carry-forward confirms market refresh is live and first auto-run is Sep 16
- Gregg's carry-forward notes this nightly sync has been failing (context exhaustion) — 4+ nights unrecorded
