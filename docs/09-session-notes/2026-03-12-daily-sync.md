# Daily Sync — 2026-03-12

**Date**: Thursday, March 12, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added
- **Market Agents microservice** — New `services/market_agents/` with FRED data agent, base agent framework, orchestrator, Discord integration, and config system. First AI-driven market research agent for automated economic data retrieval.
- **Landscaper tool executor** — New `tool_executor.py` and `tool_schemas.py` added to backend Landscaper app, expanding tool execution infrastructure.
- **Alpha Getting Started Guide** — `LANDSCAPE_GETTING_STARTED_GUIDE_ALPHA.pdf` generated with dashboard, project workspace, and documents tab screenshots.
- **MF Operations user guide** — `LANDSCAPE_USER_GUIDE_MF_OPERATIONS.docx` and `PROJECT_CREATION_QUICKSTART.md` added to guide_screenshots.

### Bugs Fixed
- **Loan API routing** — All loan hooks updated to use `DJANGO_API_URL` prefix, fixing "Unable to save loan" error on Vercel production. `useCapitalization.ts` updated.
- **Vercel env var documentation** — `VERCEL_ENV_FIX.md` created with setup instructions for `NEXT_PUBLIC_DJANGO_API_URL`.

### Documentation
- **Nightly health check** — `health-2026-03-12_0800.json` generated, Mar 11 session note updated.
- **CLAUDE.md** — Updated architecture diagram and directory structure to include `market_agents` microservice.

## Files Modified

```
VERCEL_ENV_FIX.md                                    (+32)
backend/apps/landscaper/ai_handler.py                (+68, -5)
backend/apps/landscaper/tool_executor.py             (+125)
backend/apps/landscaper/tool_registry.py             (+11, -1)
backend/apps/landscaper/tool_schemas.py              (+37)
services/market_agents/ (6 new files)                (+866)
services/market_ingest_py/pyproject.toml             (+1, -1)
src/hooks/useCapitalization.ts                       (+5, -17)
docs/09-session-notes/2026-03-11-daily-sync.md       (updated)
docs/UX/health-reports/health-2026-03-12_0800.json   (+64)
LANDSCAPE_GETTING_STARTED_GUIDE_ALPHA.pdf            (new)
guide_screenshots/ (7 new images + 2 docs)
capture_*.js (8 screenshot capture scripts)
```

## Git Commits

```
879205b fix: route loan API calls to Django backend on Railway (2 hours ago)
2b4308b deploy: 2026-03-12_1116 - automated deployment (9 hours ago)
83b4e28 docs: nightly health check 2026-03-12 (12 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Market Agents service is scaffolded but not yet integrated with Landscaper or any frontend. Needs: deployment config, API endpoint wiring, and testing with live FRED data.
- [ ] Screenshot capture scripts (`capture_*.js`) committed to repo root — consider moving to `scripts/` or `.gitignore`.

## Alpha Readiness Impact

No direct alpha blocker movement today. The loan API routing fix resolves a production-blocking issue for the Capitalization tab. The market agents service is foundational work for Market/GIS tab enhancement (alpha blocker #5 area).

## Notes for Next Session

- The `market_agents` microservice is brand new — base agent, FRED agent, orchestrator, Discord notifier, and config are in place. Next step is wiring it into the Django backend or creating a standalone deployment (Railway or similar).
- Loan routing fix should be verified on production after Vercel redeploy picks up the `useCapitalization.ts` changes.
- Several `capture_*.js` scripts were committed to repo root during guide screenshot generation — these are one-off Puppeteer scripts and could be cleaned up.
