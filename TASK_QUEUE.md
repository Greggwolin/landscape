# TASK_QUEUE.md

**Purpose:** Ordered backlog of work with entry conditions and dependencies.
**Last Updated:** 2025-12-23
**Branch:** `feature/landscaper-panel-restructure`

---

## Active Work (In Progress - Uncommitted)

The current branch has significant uncommitted changes. Before starting new work, these must be addressed.

### BLOCKED-000: Commit or Stash Current Changes

**Status:** BLOCKING ALL OTHER WORK
**Evidence:** Git status shows 150+ modified/added files

**Entry Condition:** None - start here
**Definition of Done:**
- All staged changes committed with meaningful message
- Or stashed if work is incomplete
- Clean working tree for new tasks

**Risk:** Large uncommitted changesets risk merge conflicts and lost work.

---

## Priority 1: Critical Bugs

### BUG-001: Multifamily Lease "Expiring Soon" Query Bug

**Status:** READY TO FIX
**Severity:** High (returns incorrect data)
**Source:** `PROJECT_STATE.md` line 25, `backend/apps/multifamily/views.py:158-160`

**Problem:**
```python
expiring_soon = leases.filter(
    lease_status='ACTIVE',
    lease_end_date__lte=F('lease_end_date')  # ALWAYS TRUE - compares field to itself
).count()
```

**Entry Condition:** Understanding of intended behavior (90-day window?)
**Definition of Done:**
- Filter uses actual date range (e.g., `lease_end_date__lte=date.today() + timedelta(days=90)`)
- Test confirms correct count returned
- Summary endpoint returns accurate data

**Dependencies:** None

---

### BUG-002: Extraction Commit Endpoint Incomplete

**Status:** BLOCKED (requires design clarification)
**Source:** `PROJECT_STATE.md` line 19, `src/app/api/extractions/[id]/commit/route.ts:66`

**Problem:**
```typescript
// TODO: Commit the data to the appropriate tables based on extraction_type
```

Endpoint marks queue rows as committed but does NOT persist to actual tables (`tbl_mf_unit`, rent roll, operating, parcel).

**Entry Condition:**
- Clarify which tables each extraction_type maps to
- Define field mapping from staging to target tables

**Definition of Done:**
- Extraction data written to appropriate target tables
- Status updated correctly
- Rollback logic if partial failure

**Dependencies:** Field registry mapping must be complete

---

## Priority 2: Technical Debt

### DEBT-001: TypeScript Strict Mode Cleanup

**Status:** DEFERRED (explicit TODO in config)
**Source:** `next.config.ts` line 6

**Problem:**
Build ignores TypeScript errors. Unknown types, Activity mismatches.

**Entry Condition:** Dedicated PR with no feature work
**Definition of Done:**
- `typescript.ignoreBuildErrors: false` works
- All type errors resolved or explicitly suppressed with comments
- Build succeeds clean

**Dependencies:** None, but large effort

---

### DEBT-002: Suspense Boundary Wrappers

**Status:** DEFERRED (explicit TODO in config)
**Source:** `next.config.ts` lines 10-13

**Problem:**
`missingSuspenseWithCSRBailout: false` bypasses Next.js 15 requirement.

**Entry Condition:** Audit all `useSearchParams()` usage
**Definition of Done:**
- All components with useSearchParams wrapped in Suspense
- Config option removed
- No CSR bailout warnings

**Dependencies:** DEBT-001 may intersect

---

### DEBT-003: Auth Integration

**Status:** BLOCKED (requires auth system design)
**Source:** Multiple TODOs across codebase

**Scope:**
- `src/app/api/projects/recent/route.ts` - hardcoded user_id
- `src/app/api/benchmarks/route.ts` - hardcoded user_id
- `backend/apps/projects/views.py` - AllowAny permissions
- `backend/apps/acquisition/views.py` - AllowAny permissions

**Entry Condition:**
- Auth system chosen and documented
- JWT implementation complete in Django

**Definition of Done:**
- All endpoints use authenticated user context
- AllowAny replaced with IsAuthenticated
- User audit trail functional

**Dependencies:** Auth infrastructure must exist first

---

## Priority 3: Feature Completion

### FEAT-001: Claude API Full Integration for Landscaper

**Status:** IN PROGRESS (partial)
**Source:** `docs/11-implementation-status/IMPLEMENTATION_STATUS_25-12-21.md` line 139

**Current State:**
- Claude API calls exist in `ai_handler.py`
- Tool use implemented for field updates
- Some flows still mocked

**Entry Condition:** Anthropic API key configured
**Definition of Done:**
- All chat responses use Claude API
- No stub/mock responses in production paths
- Error handling for API failures
- Rate limiting considered

**Dependencies:** ANTHROPIC_API_KEY in environment

---

### FEAT-002: Document Extraction to Activity Generation

**Status:** PLANNED (Phase 4)
**Source:** `IMPLEMENTATION_STATUS_25-12-21.md` lines 241-242

**Entry Condition:** Extraction pipeline stable
**Definition of Done:**
- Activity created when document extraction completes
- Activity links to extracted fields
- Field highlighting works from activity click

**Dependencies:** FEAT-001 (extraction must work end-to-end)

---

### FEAT-003: Rent Roll Bulk Validation and Writing

**Status:** PLANNED
**Source:** `docs/session-notes/2025-12-18-chunked-rent-roll-extraction.md` lines 145-149

**Current State:**
- Chunked extraction works (96 units extracted from Chadron)
- Units staged in `ai_extraction_staging`
- No writer to `tbl_mf_unit`

**Entry Condition:** Staging table has pending rent roll records
**Definition of Done:**
- Bulk validation endpoint exists
- Writer persists validated units to `tbl_mf_unit`
- Duplicate handling (update vs insert)
- Audit trail of what was written

**Dependencies:** Extraction pipeline must be stable

---

### FEAT-004: GP Catch-up UI Configuration

**Status:** PLANNED
**Source:** `WATERFALL_STATUS.md` lines 259-263

**Entry Condition:** Waterfall engine working (it is)
**Definition of Done:**
- UI toggle in napkin form
- Database field to store preference
- Service layer reads from DB instead of hardcoded `False`

**Dependencies:** None

---

### FEAT-005: EMx Hurdle Gating in Waterfall

**Status:** PLANNED
**Source:** `WATERFALL_STATUS.md` lines 265-269

**Entry Condition:** Understanding of distribution flow
**Definition of Done:**
- `is_hurdle_met()` called before tier distributions
- EMx mode selectable in UI
- EMx thresholds configurable per tier

**Dependencies:** None

---

## Priority 4: Infrastructure

### INFRA-001: Test Coverage for Extraction Flows

**Status:** NOT STARTED
**Source:** `PROJECT_STATE.md` line 35

**Problem:**
> "No evidence of coverage around the newer developer-operations or extraction flows"

**Entry Condition:** Features stable enough to test
**Definition of Done:**
- pytest tests for extraction service
- pytest tests for developer-operations endpoints
- Frontend component tests for extraction UI

**Dependencies:** Features must be stable

---

### INFRA-002: Next.js to Django Migration Tracking

**Status:** NOT STARTED
**Source:** Observation - no migration tracker exists

**Problem:**
395 Next.js API routes exist. No documented plan for which to migrate when.

**Entry Condition:** Decision on migration priority
**Definition of Done:**
- List of routes categorized by migration priority
- Tracking document for progress
- CI check preventing new Next.js routes

**Dependencies:** Product decision on priority

---

## DO NOT ATTEMPT YET

### BLOCKED: Notification System
**Reason:** Activity feed infrastructure still maturing
**Source:** `IMPLEMENTATION_STATUS_25-12-21.md` line 253

### BLOCKED: Excel Export for Waterfall
**Reason:** Placeholder exists but core waterfall still has gaps (GP catch-up, EMx)
**Source:** `WATERFALL_STATUS.md` line 279

### BLOCKED: Sensitivity Analysis
**Reason:** Requires stable waterfall with all modes working
**Source:** `WATERFALL_STATUS.md` lines 273-275

---

## Task Dependencies Graph

```
BLOCKED-000 (Commit Changes)
    │
    ├── BUG-001 (Expiring Soon) ───────────────────┐
    │                                               │
    ├── BUG-002 (Extraction Commit) ──────────────┐│
    │       │                                      ││
    │       └── FEAT-003 (Rent Roll Writer) ──────┼┤
    │                                              ││
    ├── FEAT-001 (Claude Full Integration) ───────┤│
    │       │                                      ││
    │       └── FEAT-002 (Extraction Activities)──┤│
    │                                              ││
    ├── FEAT-004 (GP Catch-up UI) ────────────────┤│
    │                                              ││
    ├── FEAT-005 (EMx Hurdle) ────────────────────┼┘
    │                                              │
    ├── DEBT-001 (TypeScript) ────────────────────┤
    │       │                                      │
    │       └── DEBT-002 (Suspense) ──────────────┤
    │                                              │
    └── DEBT-003 (Auth) ──────────────────────────┘
            │
            └── INFRA-001 (Test Coverage)
```

---

## Estimation Warning

No time estimates provided per project conventions. Tasks marked as small/medium/large for relative sizing only:

| Task | Relative Size |
|------|---------------|
| BUG-001 | Small |
| BUG-002 | Medium |
| DEBT-001 | Large |
| DEBT-002 | Medium |
| DEBT-003 | Large |
| FEAT-001 | Medium |
| FEAT-002 | Small |
| FEAT-003 | Medium |
| FEAT-004 | Small |
| FEAT-005 | Medium |

---

*Generated from PROJECT_STATE.md, ARCHITECTURE.md, implementation status docs, and codebase inspection.*
