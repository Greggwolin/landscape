# OpenClaw Agent Spec Review — Codebase Verification

**Date:** 2026-03-05
**Reviewer:** Claude (with full codebase access)
**Status:** 4 critical corrections, 2 minor corrections, remainder verified accurate

---

## Critical Corrections (will cause agent failures if not fixed)

### 1. Extraction Queue Monitor — Wrong table name + wrong columns

**Spec says:** `ai_extraction_staging`
**Actual table:** `dms_extract_queue`

**Actual columns:**
```
queue_id, doc_id, extract_type, priority, status, attempts,
max_attempts, error_message, extracted_data, extracted_text,
created_at, processed_at
```

**Impact:** Every SQL query in the extraction-queue-monitor subagent will fail. The `SELECT` in `stale_pending_query`, `high_failure_query`, and `schema_drift_query` all reference the wrong table and wrong field names.

**Fix:** Replace all references to `ai_extraction_staging` with `dms_extract_queue` and update column names to match actual schema.

---

### 2. Dead Tool Detector — Wrong tools directory path

**Spec says:** `backend/services/landscaper/`
**Actual path:** `backend/apps/landscaper/tools/`

There is no `backend/services/landscaper/` directory. The tools live under the Django apps structure, not a separate services directory.

**Impact:** The `tool_dir` scan path and all file-level checks will find nothing.

**Fix:** Change `tool_dir: backend/services/landscaper/` → `tool_dir: backend/apps/landscaper/tools/`

---

### 3. Django API Route Enforcer — Wrong exemption list

**Spec says exempt routes:** `auth/`, `webhooks/`, `revalidate/`
**Actual Next.js API routes that exist:**

- `src/app/api/oauth/` — exists (OAuth callbacks)
- `src/app/api/auth/` — does NOT exist
- `src/app/api/webhooks/` — does NOT exist
- `src/app/api/revalidate/` — does NOT exist

**Impact:** The exemption filter is checking for routes that don't exist while missing the one that does (`oauth/`). Won't cause failures per se, but the agent will flag `oauth/` as a violation when it should be exempt.

**Fix:** Change exempt list to `["oauth"]`. Consider also exempting `uploadthing/` if that callback route exists.

---

### 4. Dead Tool Detector / Orchestrator — Wrong financial engine path

**Spec says:** `backend/services/financial/`
**Actual path:** `services/financial_engine_py/`

Note: it's at the repo root under `services/`, not under `backend/`. Different directory entirely.

**Impact:** Any path checks or import validations against the financial engine will miss.

**Fix:** `backend/services/financial/` → `services/financial_engine_py/`

---

## Minor Corrections

### 5. Tool count discrepancy

**Spec says:** 210+ tools
**Actual count:** ~193 `@register_tool` decorators found in codebase

Not a breaking issue but worth noting for threshold/drift detection logic.

### 6. CLAUDE.md Sync Checker — tool count reference

Same as above — if the sync checker validates tool count against CLAUDE.md's "210+" claim, it will flag a false positive since actual count is ~193. CLAUDE.md itself may need updating.

---

## Verified Accurate

These claims checked out against the codebase:

| Claim | Status |
|-------|--------|
| `ALLOWED_UPDATES` dict in `tool_executor.py` | ✅ Confirmed |
| Container system at `backend/apps/containers/` | ✅ Confirmed |
| Schema name `landscape` | ✅ Confirmed |
| Tools use `@register_tool` decorator | ✅ Confirmed |
| `tailwind.config.js` token definitions | ✅ Confirmed |
| CoreUI theme at `src/styles/coreui-theme.css` | ✅ Confirmed |
| Provider chain in `src/app/layout.tsx` | ✅ Confirmed |

---

## Recommendation

Fix the 4 critical items before passing to OpenClaw. The table name error (#1) is the most dangerous — it'll produce silent failures or SQL errors on every run of the extraction monitor. The path errors (#2, #4) will cause file-not-found on startup scans. The exemption list (#3) will produce false positives on legitimate routes.
