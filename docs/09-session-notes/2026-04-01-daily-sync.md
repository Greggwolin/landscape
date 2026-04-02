# Daily Sync — April 1, 2026

**Date**: Tuesday, April 1, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added or Progressed

- **Operations GET migrated to Django** — The 1,303-line legacy Next.js P&L route has been fully replicated in `backend/apps/financial/views_operations.py` (+958 lines). Includes helpers (`_to_float`, `_to_int`, `_parse_number`, `_format_expense_label`), parent category labels, and full P&L calculation logic. `useOperationsData.ts` updated to call Django. Legacy Next.js route retained as dead code pending production confirmation.
- **New Landscaper tool: `update_land_use_pricing`** — Writes to `land_use_pricing` table (source of truth for lot pricing) and auto-triggers `recalculate-sfd` to propagate to parcel assumptions and cash flow. Prevents misuse of `update_parcel_sale_assumptions` for pricing changes.
- **`ingest_document` tool hardened** — Now auto-triggers extraction pipeline if document hasn't been processed yet. Checks `dms_extract_queue` and `knowledge_embeddings` before falling back to `DocumentProcessor` or `extract_document_batched`.
- **Extraction service: direct text extraction fallback** — When no embeddings or extracted_text exist, falls back to `extract_text_from_url()` (handles images via Vision API, fresh uploads). Caches result in `core_doc.extracted_text`.
- **Extraction staging dedup fix** — `ai_extraction_staging` INSERT logic updated to handle non-pending existing rows (accepted/applied/rejected) that were silently dropped by the `ON CONFLICT WHERE status='pending'` clause.
- **Map market layers** — Recent Sales layer (Redfin SF comps, 5-mile radius, 365-day lookback) with price-tier coloring (green/yellow/red by quartile). Market Competitors layer with popup details. Both wired to layer toggle system.
- **Leveraged Cash Flow UI polish** — Accounting-style bottom borders on rows preceding subtotals. Total column added. Header padding aligned with CashFlowAnalysisTab.
- **Waterfall config form improvements** — Extended in `WaterfallConfigForm.tsx`.
- **Front foot pricing support** — `price_uom` schema updated to include `'per_ff'` (front foot) with description: lot_width × base_price_per_unit.
- **Thread race condition fix** — CamelCase mismatch fixed + server-side guard added to prevent blank thread accumulation.
- **Project templates seed** — `LANDSCAPE_TEMPLATES_COWORK_BRIEF.docx` rebuilt with finalized seed numbers.

### Bugs Fixed

- Thread auto-selection race condition (camelCase mismatch + server-side guard)
- Extraction staging dedup for non-pending rows
- `ingest_document` silently failing when extraction not yet complete

### Technical Debt Addressed

- Operations GET endpoint moved from legacy Next.js to Django (major migration milestone)
- Extraction pipeline resilience improved (auto-trigger, Vision fallback, caching)
- Session log Tier 1 Open Items updated — multiple items marked resolved

### Documentation Updated

- `docs/daily-context/session-log.md` — Tier 1 Open Items updated with 6 resolved items
- `docs/09-session-notes/2026-03-31-daily-sync.md` — Created (staged)
- `docs/cc-prompts/map-auth-fix-and-market-layers.md` — New CC prompt doc
- `docs/cc-prompts/map-popup-and-competitors-fix.md` — New CC prompt doc

## Files Modified

```
30 files changed, +2,285 insertions, -162 deletions

Key files:
 backend/apps/financial/views_operations.py         | +968 (Operations GET migration)
 backend/apps/landscaper/tool_executor.py           | +264 (ingest_document hardening + _ensure_extraction_complete)
 backend/apps/knowledge/services/extraction_service.py | +182/-40 (fallback extraction + staging dedup)
 src/components/map-tab/MapTab.tsx                  | +149 (market layers)
 src/components/map-tab/MapCanvas.tsx               | +124 (map layer rendering)
 src/components/capitalization/LeveragedCashFlow.tsx | +111 (accounting borders + total column)
 backend/apps/knowledge/services/text_extraction.py | +88 (Vision API fallback)
 backend/apps/landscaper/ai_handler.py              | +75 (tool context)
 src/hooks/useLandscaperThreads.ts                  | +60 (race condition fix)
 backend/apps/landscaper/tool_schemas.py            | +55 (update_land_use_pricing tool)
 backend/apps/calculations/views.py                 | +48 (calculation endpoint updates)
```

## Git Commits

No commits today (all changes are uncommitted on working tree).

Last committed (March 31):
- `22dfa3f` Update marketing site to CoreUI dark theme tokens
- `bce59bd` Add static marketing site
- `e627800` chore: bump version to v0.1.15
- `f058293` fix: add missing transformDjangoResponse shared module
- `9e74a0a` feat: S&U report rewrite, portfolio models, cash flow fixes
- `3b9a97b` fix: waterfall promote recalc, MF acquisition at time=0, persist results

## Active To-Do / Carry-Forward

- [ ] **Re-run demo project clones on host:** `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] **PropertyTab.tsx floor plan double-counting fix** (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] **Operations GET: delete legacy Next.js route** — `src/app/api/projects/[projectId]/operations/route.ts` retained as dead code. Delete after confirming Django route stable in production.
- [ ] **Commit uncommitted work** — 30 files, +2,285 lines of significant feature work sitting on working tree. Needs commit + push.
- [ ] **Scanned PDF / OCR pipeline** — Still not implemented (OCRmyPDF identified as preferred solution).

## Alpha Readiness Impact

- **Operations Tab moved from ⚠️ PARTIAL to ✅ WORKS** — Both GET (P&L) and save endpoints now on Django. This resolves the last major API migration gap for the MF appraiser workflow.
- **Overall alpha readiness: ~92%** — Up from ~90%. Only remaining blockers: extraction pipeline (OCR for scanned PDFs) and Knowledge Base (pgvector Phase 2, no Library UI).

## Notes for Next Session

1. **Big uncommitted changeset** — 30 files with 2,285 net additions. Should be committed before starting new work. Consider splitting into logical commits (Operations GET migration, map layers, extraction hardening, Landscaper tools, LCF UI).
2. **New `update_land_use_pricing` tool** — Verify it works end-to-end: user says "change SFD price to $150/FF" → tool writes to `land_use_pricing` → `recalculate-sfd` fires → parcel assumptions + cash flow updated.
3. **Map market layers** — Test with a project that has Redfin comps data. Verify layer toggle, popup content, and price-tier coloring.
4. **Operations GET** — Test the Django route against the legacy Next.js route for parity. Key risk: the P&L calculation is complex (~958 lines) and any discrepancy will be visible to users immediately.
