# Valuation Tab Guide

**Status:** ✅ MVP + Sales Comparison UI complete | 🔄 Interactive AI adjustments in progress  
**Last Updated:** October 27, 2025

This guide consolidates the backend/ frontend implementation summaries and the interactive AI adjustments specification for the Valuation tab.

---

## 1. Platform Overview

- **Goal:** Deliver full appraisal-style valuation (Sales Comparison, Cost, Income, and Reconciliation) with AI-assisted insights.
- **Project Scope:** Database schema, Django APIs, frontend UI for Sales Comparison approach, Landscaper chat sidebar, and forthcoming AI adjustments grid.
- **Primary Project:** Chadron (Project ID 17) seeded with three comparables for demo/testing.

---

## 2. Backend Implementation (Complete)

### Schema & Migration
- Migration `backend/migrations/014_valuation_system.sql` creates:
  - `tbl_sales_comparables`
  - `tbl_sales_comp_adjustments`
  - `tbl_cost_approach`
  - `tbl_income_approach`
  - `tbl_cap_rate_comps`
  - `tbl_valuation_reconciliation`
- Features: FK integrity, timestamp triggers, validation constraints (e.g., cap rates 1‑15%), indexes on `project_id`/`sale_date`, column comments for documentation.

### Django Layer
- Models reside in `backend/apps/financial/models_valuation.py` (6 models with calculated props, cascades, choice fields).
- Serializers in `serializers_valuation.py` cover nested adjustments, validation, and read-only computed fields.
- `views_valuation.py` implements full CRUD viewsets:
  - Sales comps (`/api/valuation/sales-comps/…`, add adjustment route).
  - Cost approach (`/api/valuation/cost-approach/…`).
  - Income approach & cap rate comps.
  - Reconciliation + summary endpoint.
- URLs registered in `backend/apps/financial/urls.py`.
- Data seeding via `backend/scripts/seed_chadron_valuation.py`.

### API Client & Types
- `src/types/valuation.ts`: ~15 interfaces and union types for models/forms.
- `src/lib/api/valuation.ts`: 13 helper functions for fetch/upsert/delete actions (sales comps, adjustments, cost/income approaches, reconciliation, summary).

---

## 3. Frontend Implementation (Complete for MVP)

- **Route:** `/projects/[projectId]/valuation` (Next.js App Router).
- **Components:**
  - `SalesComparisonApproach.tsx` – primary container with header, CTA, grid, matrix, summary, and AI sidebar.
  - `ComparableCard.tsx` – card view showing sale price, unit metrics, adjustments summary, and actions.
  - `AdjustmentMatrix.tsx` – collapsible table summarizing adjustments with color-coded deltas.
  - `IndicatedValueSummary.tsx` – weighted averages, total indicated value (~$45.9 M for Chadron), variance vs asking, narrative block.
  - `LandscaperChatPanel.tsx` – stubbed AI chat with quick actions (“Explain adjustment methodology”, etc.).
  - Additional layout/wrapper logic in `page.tsx` for nav, tabs, loading/error states.
- **Styling:** CoreUI tokens, dark theme parity, responsive (2/3 content + 1/3 sidebar).
- **Access:** Run backend (`python manage.py runserver`) + frontend (`npm run dev` on available port). Load `http://localhost:3006/projects/17/valuation` to see seeded comps.

---

## 4. Interactive AI Adjustments (Design & Status)

### Current State
- Migration `backend/migrations/015_ai_adjustment_suggestions.sql` applied:
  - New table `tbl_ai_adjustment_suggestions` to store AI recommendations per adjustment type with confidence, justification, model version.
  - Added `user_adjustment_pct`, `ai_accepted`, `user_notes`, `last_modified_by` to `tbl_sales_comp_adjustments`.
- Backend/front-end wiring pending: models, serializers, viewsets, API routes, TypeScript types, and UI components.

### UX Specification
- Comparables grid expands to show per-comp columns: `Comp`, `AI`, `Final`.
- Property attributes (Address, Sale Date, etc.) span merged columns.
- Adjustment rows show:
  - AI button with badge (confidence color) + accept checkbox.
  - Final editable input for user override.
- Selecting an adjustment opens an `AdjustmentAnalysisPanel` with:
  - Narrative explaining AI logic referencing comps + subject.
  - Revised suggestions (e.g., +5% → +3%) with accept button.
  - Confidence indicator (`high|medium|low|none`).
- Layout: 3 comps × 3 columns each + label column, matching user-provided screenshot.

### Backend To-Do
1. Add `AIAdjustmentSuggestion` model + signals to `models_valuation.py`.
2. Update `SalesCompAdjustment` model/serializer to include new fields.
3. Create serializers/viewsets/endpoints for AI suggestions and update flows.
4. Persist user overrides + AI accept status.

### Frontend To-Do
1. Extend `valuation.ts` types and `api/valuation.ts` functions for suggestions, accept/reject endpoints, and storing user overrides.
2. Implement `AdjustmentCell` + `AdjustmentAnalysisPanel` components with state management (open/close per selection).
3. Integrate AI button behavior (call AI service, display justification, accept/cancel).
4. Wire checkbox to set `ai_accepted` and copy AI percentage into user value.

---

## 5. Usage & Testing Notes

1. **Servers:**
   ```bash
   # Backend
   cd backend && source venv/bin/activate && python manage.py runserver

   # Frontend
   npm run dev -- -p 3006   # or default port if free
   ```
2. **URL:** `http://localhost:3006/projects/17/valuation`
3. **Expectations:**
   - 3 comparable cards (Reveal Playa Vista, Cobalt, Atlas).
   - Adjustment matrix collapsible section.
   - Indicated value summary with variance vs asking price.
   - Landscaper chat stub with 4 quick actions.
4. **Seed Data:** Provided for Project 17; run `python backend/scripts/seed_chadron_valuation.py` if data missing.
5. **API Smoke Test:** Use Postman or curl to hit `GET /api/valuation/sales-comps/by_project/17/` and verify JSON includes adjustments + summary stats.

---

## 6. File Inventory

**Backend:**  
`backend/migrations/014_valuation_system.sql`, `backend/migrations/015_ai_adjustment_suggestions.sql`, `backend/apps/financial/models_valuation.py`, `serializers_valuation.py`, `views_valuation.py`, `urls.py`, `scripts/seed_chadron_valuation.py`.

**Frontend:**  
`src/app/projects/[projectId]/valuation/page.tsx`, `components/{ComparableCard,AdjustmentMatrix,IndicatedValueSummary,SalesComparisonApproach,LandscaperChatPanel}.tsx`, `src/types/valuation.ts`, `src/lib/api/valuation.ts`.

---

## 7. Future Enhancements

- Complete AI adjustments workflow (models, API, UI interactions, acceptance logging).
- Build Cost and Income approach UI panels plus reconciliation visualization.
- Replace stub chat panel with real AI endpoint tied to valuation datasets.
- Add inline editing for comparables, multi-project filtering, and PDF export of valuation package.
- Implement automated tests covering API endpoints, type-safe client, and UI regression.

---

Legacy documents (`valuation-tab-implementation-summary.md`, `valuation-tab-COMPLETE-implementation.md`, `valuation-tab-interactive-adjustments-implementation*.md`, `valuation-tab-interactive-adjustments-SESSION-COMPLETE.md`) have been archived for reference. Use this guide as the single source of truth going forward.
