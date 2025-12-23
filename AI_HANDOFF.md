# AI_HANDOFF.md

**Purpose:** Operational guide for AI systems taking over this codebase.
**Last Updated:** 2025-12-23
**Audience:** Another senior AI system assuming full ownership

---

## Project Objective

Landscape is a real estate analytics platform attempting to be "ARGUS but AI-native." It targets land developers and commercial real estate professionals with progressive complexity ("napkin to tablecloth" - quick feasibility sketches that can scale to institutional underwriting). The core value proposition is document extraction, market intelligence, and a universal data model that works across property types (land development, multifamily, office, retail, industrial).

---

## Current Phase of Work

**Branch:** `feature/landscaper-panel-restructure`
**Git State:** 150+ uncommitted changes spanning frontend, backend, and migrations

**Active workstreams (based on recent commits Dec 2025):**
1. Landscaper AI Panel - Chat interface with Claude integration (partial)
2. Knowledge/Extraction Platform - Document extraction pipeline with batched processing
3. Developer Operations - Fees and overhead management
4. Market Intelligence - Competitor tracking and Zonda/HBACA data ingestion

**Most recent commit:** `b4dfa60 feat: add field catalog for Landscaper schema awareness`

---

## What is Stable

**Trust these - they work and have been validated:**

| Component | Location | Evidence |
|-----------|----------|----------|
| Container CRUD | `src/app/api/containers/[containerId]/route.ts` | Validated duplicate checks, field updates |
| Python Waterfall Engine | `services/financial_engine_py/financial_engine/waterfall/` | Validated against Excel within 0.00008% |
| IRR/NPV/DSCR Calculations | `backend/apps/calculations/views.py` | Python engine integration working |
| Budget Grid | `src/components/budget/` | 3-level categories, real-time calc |
| Zonda/HBACA Ingestion | `backend/tools/zonda_ingest/`, `hbaca_ingest/` | 704 records (Zonda), 9,392 records (HBACA) imported |
| Database Schema | `landscape` schema in Neon `land_v2` | ~280 tables, search_path enforced |

---

## What is Volatile

**Approach with caution - actively changing or partially implemented:**

| Component | Issue | Source |
|-----------|-------|--------|
| Document Extraction | Batched extraction works, but commit-to-tables incomplete | `src/app/api/extractions/[id]/commit/route.ts:66` |
| Landscaper AI Responses | Mix of real Claude and stubbed responses | `IMPLEMENTATION_STATUS_25-12-21.md` line 139 |
| Auth Integration | Hardcoded user IDs everywhere, AllowAny permissions | Multiple TODOs |
| TypeScript Types | Build ignores errors (`ignoreBuildErrors: true`) | `next.config.ts` |
| Rent Roll Writer | Extraction works, but no writer to `tbl_mf_unit` | Session notes 2025-12-18 |

---

## Known Landmines

### Landmine 1: Auto-Scroll Bug in Chat Components

**Trigger:** Adding `scrollIntoView` in useEffect with message dependencies
**Symptom:** Page auto-scrolls to bottom on mount, top content unreachable
**Solution:** Use user interaction guard - only scroll after user sends message
**File:** `KNOWN_ISSUES.md` section 1

```tsx
// BAD - will cause scroll bug
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);

// GOOD - only scroll after user action
const userHasSentMessage = useRef(false);
useEffect(() => {
  if (userHasSentMessage.current && messages.length > prevCount.current) {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages]);
```

### Landmine 2: Multifamily "Expiring Soon" Query

**Location:** `backend/apps/multifamily/views.py:158-160`
**Bug:** Filter compares `lease_end_date__lte=F('lease_end_date')` which is ALWAYS TRUE
**Impact:** Summary always returns count of all active leases, not actually expiring ones

### Landmine 3: Next.js API Route Creation

**Rule:** Do NOT create new routes in `src/app/api/`. All new endpoints go to Django.
**Reason:** Next.js routes are legacy, migration in progress
**Exception:** Proxy routes that forward to Django are acceptable

### Landmine 4: TypeScript Build Errors

**State:** Builds succeed despite type errors
**Risk:** Runtime bugs from uncaught type issues
**Mitigation:** Run `npx tsc --noEmit` to see actual type state before major changes

### Landmine 5: Dual API Layers

**Problem:** Same endpoint may exist in both Next.js and Django
**Example:** Landscaper chat has Next.js proxy AND Django backend
**Approach:** Always check both layers before modifying API behavior

---

## Coding Conventions Actually Observed

### File Naming
- Components: `PascalCase.tsx` (e.g., `BudgetGridTab.tsx`)
- Client components: `*Client.tsx` (e.g., `MapClient.tsx`)
- Hooks: `useCamelCase.ts` (e.g., `useContainers.ts`)
- API routes: `route.ts` in folder structure

### Database
- Raw SQL in Next.js via `sql` template tag from `@/lib/db`
- Django uses ORM but with custom db backend for schema
- Table prefix conventions: `tbl_`, `core_fin_fact_`, `lkp_`, `lu_`

### API Patterns
- Django: DRF ViewSets with serializers
- Next.js: Route handlers with `NextResponse`
- Response envelope: `{ count, results, summary }` for lists

### Component Libraries
1. CoreUI React (primary)
2. Radix UI (interaction primitives)
3. Custom `src/components/ui/` (shadcn-style)
4. MUI (data grids only)
5. TanStack Table (all new tables)

### State Management
- React Query for server state
- SWR also present (standardize on React Query)
- Context for global UI state

---

## Do Not Redo List

**Areas where churn is dangerous - changes require strong justification:**

### 1. Container System Architecture
**Files:** `tbl_container`, `src/app/api/containers/`
**Reason:** Months of work, validated, integrates with budget grid
**Risk:** Breaking change affects all property types

### 2. Waterfall Engine Core
**Files:** `services/financial_engine_py/financial_engine/waterfall/`
**Reason:** Validated against Excel, complex financial logic
**Risk:** $800K variance was just fixed; touching core distribution logic is high-risk

### 3. Budget Grid Core
**Files:** `src/components/budget/`
**Reason:** 41 files, complex TanStack integration, category hierarchy
**Risk:** Regression affects all financial data entry

### 4. Database Schema
**Files:** `migrations/*.sql`
**Reason:** 280+ tables, production data exists
**Risk:** Schema changes require careful migration planning

### 5. Django search_path Handling
**Files:** `backend/db_backend/base.py`
**Reason:** Ensures all Django queries hit correct schema
**Risk:** Breaking this causes silent data corruption

---

## How to Load Context and Proceed Safely

### Step 1: Read Authoritative Docs First
```
1. CLAUDE.md (conventions, architecture overview)
2. PROJECT_STATE.md (implementation status, what's broken)
3. ARCHITECTURE.md (data flows, guards)
4. KNOWN_ISSUES.md (solved bugs, prevention patterns)
```

### Step 2: Check Git State
```bash
git status                    # See uncommitted work
git log --oneline -10         # See recent commits
git diff --stat               # Understand scope of changes
```

### Step 3: Verify Services Running
```bash
# Frontend
npm run dev                   # Port 3000

# Backend
cd backend && ./venv/bin/python manage.py runserver 8000
```

### Step 4: Before Any Change
- Check if endpoint exists in BOTH Next.js and Django
- Search for related TODO/FIXME markers
- Read `docs/session-notes/` for recent context on that area
- Run TypeScript check: `npx tsc --noEmit`

### Step 5: Test Project
Primary test project: **Peoria Lakes MPC** (Project ID varies, check database)
- 42 parcels across 4 areas and 8 phases
- Used for waterfall validation, container hierarchy tests

### Step 6: Safe Change Protocol
1. Make change in smallest possible scope
2. Verify no TypeScript errors introduced
3. Test affected API endpoints manually
4. Check Django admin if models changed
5. Document any new decisions in appropriate file

---

## Environment Requirements

```bash
# Required in .env.local
DATABASE_URL=postgresql://...          # Neon PostgreSQL (land_v2)
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8000

# For AI features
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

---

## Key Commands

```bash
# Development
npm run dev                   # Next.js dev server
cd backend && ./venv/bin/python manage.py runserver 8000

# Validation
npm run lint                  # ESLint
npm run build                 # Build (ignores TS errors currently)
npx tsc --noEmit              # See actual type errors

# Database
npm run db:migrate            # Run migrations

# Testing
npm run test                  # Theme + contrast tests
npm run test:ui               # Playwright UI mode
```

---

## Red Flags - Stop and Escalate

If you encounter any of these, pause and seek clarification:

1. **Schema changes** - Requires migration, affects production
2. **Auth changes** - Currently deferred, touching may break existing flows
3. **Waterfall distribution logic** - High-risk financial calculations
4. **Container parent_id manipulation** - Can orphan entire hierarchies
5. **New Next.js API routes** - Violates architecture decision
6. **Removing "legacy" code** - May still be in use; verify first

---

## Uncertainty Log

Things I cannot confirm from available evidence:

1. **Which Claude responses are real vs stubbed** - Need runtime testing
2. **Coverage threshold requirements** - No documented targets
3. **Deployment pipeline** - Vercel mentioned but no full docs
4. **Migration priority for Next.js routes** - No explicit plan
5. **User acceptance criteria** - No product spec documents found
6. **Performance baselines** - No benchmarks documented

---

## Contact Points

From session notes, work appears to be primarily AI-assisted development sessions.
- Django admin: `http://localhost:8000/admin/` (admin/admin123)
- Slack channel mentioned: `#landscape-dev` (per WATERFALL_STATUS.md)

---

*This document represents best-effort context transfer based on codebase evidence.*
*Treat PROJECT_STATE.md and ARCHITECTURE.md as authoritative truth.*
*When in doubt, read more code before writing.*
