# DECISIONS.md

**Purpose:** Catalog of architectural and product decisions with evidence sources.
**Last Updated:** 2025-12-23
**Maintainer:** AI Handoff Protocol

---

## Critical Decisions

### D-001: All New API Endpoints Go to Django

**Date:** Observed in CLAUDE.md (documented conventions)
**Status:** FINAL
**Source:** `CLAUDE.md` lines 56-63

**Decision:**
All new API endpoints must be created in Django backend (`backend/apps/`), not Next.js (`src/app/api/`).

**Rationale:**
- Next.js routes are labeled "legacy and being migrated"
- Django provides OpenAPI docs at `/api/docs/`
- Centralized API management through DRF

**Consequences:**
- Next.js API routes still exist (395 files) but should not grow
- New features require Django app creation or extension
- Frontend calls may proxy through Next.js to Django

**Evidence:**
```
CLAUDE.md: "All new API endpoints go to Django backend, not Next.js."
CLAUDE.md: "Next.js routes (src/app/api/) are legacy and being migrated"
```

---

### D-002: No ORM in Next.js - Raw SQL Only

**Date:** Observed in CLAUDE.md
**Status:** FINAL
**Source:** `CLAUDE.md` lines 65-82, `src/lib/db.ts`

**Decision:**
Next.js frontend uses raw SQL via `@neondatabase/serverless` tagged template literals. No ORM.

**Rationale:**
- Direct control over queries
- Avoids ORM abstraction overhead for Neon serverless

**Consequences:**
- All SQL is hand-written
- Types must be manually maintained (`src/types/database.ts` ~57k lines)
- No migration tooling for Next.js layer

**Tradeoffs:**
- Pros: Performance, transparency
- Cons: More boilerplate, manual type sync

**Evidence:**
```typescript
// From CLAUDE.md example
import { sql } from '@/lib/db';
const projects = await sql`SELECT * FROM tbl_project WHERE is_active = true`;
```

---

### D-003: TypeScript Build Errors Ignored

**Date:** December 2025 (explicit in next.config.ts)
**Status:** REVERSIBLE
**Source:** `next.config.ts` lines 7-8

**Decision:**
`typescript.ignoreBuildErrors: true` is enabled to allow builds with TypeScript errors.

**Rationale (quoted):**
> "Most async params have been fixed. Remaining errors are pre-existing TypeScript issues like 'error' is of type 'unknown', Activity type mismatches, etc."

**Consequences:**
- Builds succeed despite type errors
- Runtime type bugs may slip through
- Technical debt accumulates

**TODO Marker:** "Clean up remaining TypeScript strict mode issues in a separate PR"

**Evidence:** `next.config.ts` line 6-8

---

### D-004: Universal Container System for All Property Types

**Date:** November 2025 (multiple session notes)
**Status:** FINAL
**Source:** `CLAUDE.md`, `docs/11-implementation-status/CONTAINER_INTEGRATION_COMPLETE_25-11-13.md`

**Decision:**
Use `tbl_container` with flexible tree structure instead of rigid property-type hierarchies.

**Rationale:**
- Same data model for Land Dev, Multifamily, Office, Retail, Industrial
- Labels configurable per project (Area/Phase/Parcel vs Building/Floor/Unit)

**Consequences:**
- Legacy `tbl_parcel` and `tbl_phase` still exist but are secondary
- New budget items use `container_id` not `parcel_id`/`phase_id`

**Evidence:**
```
CLAUDE.md: "The container system replaces rigid property-type-specific hierarchies"
```

---

### D-005: Python Waterfall Engine is Authoritative

**Date:** December 5, 2025
**Status:** FINAL
**Source:** `docs/02-features/financial-engine/WATERFALL_STATUS.md`

**Decision:**
Python implementation in `services/financial_engine_py/financial_engine/waterfall/` is the production waterfall engine. TypeScript implementation is deprecated.

**Rationale (quoted):**
> "The Python implementation is now the authoritative engine, with the TypeScript implementation deprecated."

**Differences Noted:**
| Aspect | TypeScript (Deprecated) | Python (Current) |
|--------|------------------------|------------------|
| Precision | JavaScript floats | Python Decimal |
| IRR | Custom Newton-Raphson | numpy-financial XIRR |
| Testing | Limited | Comprehensive pytest |

**Evidence:** `WATERFALL_STATUS.md` lines 423-435

---

### D-006: Django search_path Forced to landscape Schema

**Date:** Observed in codebase
**Status:** FINAL
**Source:** `backend/db_backend/base.py`, `ARCHITECTURE.md` line 29

**Decision:**
Every Django connection sets `search_path = landscape, public` on connection.

**Rationale:**
- Database has multiple schemas
- Ensures Django always operates in `landscape` schema

**Consequences:**
- Cannot accidentally query wrong schema
- Public schema still accessible as fallback

**Evidence (quoted from ARCHITECTURE.md):**
> "Database search_path forced to `landscape, public` on every Django connection"

---

### D-007: Landscaper Chat Stubbed for Phase 6, Real Claude in Phase 7+

**Date:** November 20, 2025 (Phase 6), December 19-21, 2025 (Phase 3 wiring)
**Status:** UNDER REVIEW (Partial Claude integration exists)
**Source:** `docs/session-notes/PHASE_6_LANDSCAPER_CHAT_IMPLEMENTATION_COMPLETE.md`

**Decision:**
Landscaper chat originally implemented with stubbed AI responses. Real Claude API integration is planned for Phase 7+.

**Current State (Dec 2025):**
- Claude API partially integrated in `backend/apps/landscaper/ai_handler.py`
- Tool use for field updates implemented (commit `7ff881f`)
- Some flows still return mocked/stubbed responses

**Consequences:**
- AI responses may be inconsistent (some real, some stubbed)
- Anthropic API key required for real responses

**UNCONFIRMED:** Exact scope of which responses are real vs stubbed is unclear.

---

### D-008: CoreUI as Primary UI Library

**Date:** Observed in CLAUDE.md
**Status:** FINAL
**Source:** `CLAUDE.md` "Component Libraries (Priority Order)"

**Decision:**
1. CoreUI React (`@coreui/react`) - Primary
2. Radix UI - Interaction primitives
3. Custom components (`src/components/ui/`)
4. MUI - Data grids only

**Rationale:**
Consolidation attempt; MUI was previously used but is being limited.

**Consequences:**
- New components should use CoreUI
- MUI exists but should not be extended for general UI

---

### D-009: TanStack Table for All New Data Tables

**Date:** Observed in CLAUDE.md
**Status:** FINAL
**Source:** `CLAUDE.md`

**Decision:**
Use `@tanstack/react-table` for all new table implementations.

**Context:**
- Handsontable exists in legacy "Budget Grid Dark" - do not extend
- AG Grid, Glide Data Grid installed but not preferred

**Consequences:**
- Multiple grid libraries exist in codebase
- New work should only use TanStack

---

### D-010: Auth Integration Deferred

**Date:** Observed across codebase
**Status:** UNDER REVIEW
**Source:** Multiple TODO markers, `PROJECT_STATE.md` line 29

**Decision:**
Authentication integration deferred. Hardcoded user IDs used in many endpoints.

**Evidence (TODOs found):**
- `src/app/api/projects/recent/route.ts:29`: "TODO: Get actual user ID from auth context"
- `src/app/api/benchmarks/route.ts:85`: "TODO: Get from auth"
- `backend/apps/projects/views.py:30`: "TODO: Change to IsAuthenticated in production"

**Consequences:**
- AllowAny permission class used widely
- User tracking incomplete
- Production hardening blocked

---

## Infrastructure Decisions

### D-011: Neon PostgreSQL with land_v2 Database

**Date:** Observed in CLAUDE.md
**Status:** FINAL
**Source:** `CLAUDE.md`, `backend/config/settings.py`

**Decision:**
Database hosted on Neon PostgreSQL. Database name: `land_v2`. Primary schema: `landscape`.

**Table count:** ~280 tables
**Type file:** ~57k lines generated

---

### D-012: Suspense Boundaries Deferred for useSearchParams

**Date:** December 2025
**Status:** REVERSIBLE
**Source:** `next.config.ts` lines 10-13

**Decision:**
`missingSuspenseWithCSRBailout: false` to allow builds without Suspense wrappers.

**Rationale (quoted):**
> "Many pages use useSearchParams() which requires Suspense in Next.js 15+"

**TODO:** "Remove after wrapping all useSearchParams() usage in Suspense boundaries"

---

## Deferred Decisions (Explicitly Noted as Future Work)

### DEFERRED-001: GP Catch-up UI Configuration

**Source:** `WATERFALL_STATUS.md` lines 192-217

Engine supports GP catch-up but hardcoded to OFF. No UI toggle, no database field.

### DEFERRED-002: EMx Hurdle Gating

**Source:** `WATERFALL_STATUS.md` lines 219-239

Formula exists in `is_hurdle_met()` but not wired into distribution flow.

### DEFERRED-003: CPI Auto-Sync

**Source:** `PROJECT_STATE.md` line 28, `src/app/api/benchmarks/inflation-analysis/route.ts`

CPI integration stubbed with hardcoded values.

---

## Unconfirmed Decisions (Insufficient Evidence)

### UNCONFIRMED-001: Migration Strategy for Next.js to Django APIs

No explicit timeline or prioritization found for which Next.js routes migrate first.

### UNCONFIRMED-002: Test Coverage Requirements

Backend tests exist but coverage thresholds not documented. Many flows lack tests.

### UNCONFIRMED-003: Deployment Pipeline

Vercel cron defined for CPI sync but no other deployment docs found in evidence.

---

*Document generated from evidence in PROJECT_STATE.md, ARCHITECTURE.md, CLAUDE.md, session notes, and codebase inspection.*
