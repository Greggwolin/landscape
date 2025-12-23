**High-Level Summary**
- Next.js 15 frontend with numerous App Router API routes querying Neon PostgreSQL via `src/lib/db.ts` (see `src/app/api/projects/[projectId]/route.ts` for direct table updates).
- Django 5 REST backend wired under `backend/config/urls.py` with custom search_path handling for the `landscape` schema in `backend/db_backend/base.py`.
- Python financial engine available for cashflow/metric computation alongside DRF endpoints in `backend/apps/calculations/views.py` and engine modules under `services/financial_engine_py/`.
- AI/extraction and knowledge features documented as in-progress in `docs/11-implementation-status/IMPLEMENTATION_STATUS_25-12-21.md`, with corresponding Next.js routes and Django apps present.
- Market ingestion CLI for macro data lives in `services/market_ingest_py/README.md`, targeting Postgres time-series tables.

**Implemented Features**
- Container management PATCH endpoint validates duplicates and updates `landscape.tbl_container` through Neon (`src/app/api/containers/[containerId]/route.ts`, `src/lib/db.ts`).
- Developer fee API computes fee bases from project budget/financial tables and returns labeled summaries (`src/app/api/developer-operations/fees/route.ts`).
- Financial calculation endpoints expose IRR/NPV/DSCR and metric bundles via DRF, invoking the Python engine when available (`backend/apps/calculations/views.py`, `services/financial_engine_py/financial_engine/core/cashflow.py`).
- Multifamily CRUD/reporting ViewSets supply unit, lease, and turn APIs with occupancy summaries and floorplan diffs (`backend/apps/multifamily/views.py`).
- Knowledge persistence layer defines entity/fact/embedding tables with constraints and indexes for retrieval (`backend/apps/knowledge/models.py`).
- Market ingestion tooling fetches FRED/ACS/BLS/FHFA series and writes to Postgres with lineage tracking (`services/market_ingest_py/README.md`).
- Landscaper chat proxy forwards messages to the Django AI endpoints with request/response transforms (`src/app/api/projects/[projectId]/landscaper/chat/route.ts`).

**Partially Implemented Features**
- PRESENT BUT INACTIVE: Unified DMS extraction uses regex fallback and logs “AI API not available” pending Claude integration (`src/app/api/dms/extract-unified/route.ts`).
- PRESENT BUT INACTIVE: Extraction commit endpoint applies corrections then only marks queue rows committed; TODO notes to persist into rent roll/operating/parcel tables (`src/app/api/extractions/[id]/commit/route.ts`).
- Benchmarks service tolerates missing tables by returning empty arrays and uses a stub CPI delta (`src/app/api/benchmarks/route.ts`, `src/app/api/benchmarks/inflation-analysis/route.ts`).
- Recent projects API hardcodes user id and fabricates `last_accessed` timestamps instead of reading audit data (`src/app/api/projects/recent/route.ts`).
- TypeScript build errors are ignored with a TODO to clean up strict issues (`next.config.ts`).

**Broken or Non-Functional Components**
- Multifamily lease “expiring soon” count filters leases with `lease_end_date__lte=F('lease_end_date')`, which always matches active leases and omits the intended date window, so the summary is inaccurate (`backend/apps/multifamily/views.py`).

**Deferred / Stubbed Logic**
- CPI auto-sync and historical integration are stubbed with hardcoded values in inflation analysis (`src/app/api/benchmarks/inflation-analysis/route.ts`).
- Auth integration is deferred across several routes (e.g., hardcoded user ids in `src/app/api/benchmarks/route.ts` and `src/app/api/projects/recent/route.ts`), indicating missing real auth context wiring.
- Strict type enforcement is deferred by `typescript.ignoreBuildErrors: true` in `next.config.ts`.

**Test Coverage Status**
- Frontend/unit tests cover theme token contrast parsing (`tests/themeTokens.spec.ts`) and lease revenue calculations (`tests/lease-calculator.spec.ts`); Playwright checks header contrast in light/dark themes and includes a diagnostic probe that never fails (`tests/e2e/contrast.e2e.spec.ts`, `tests/contrast.probe.spec.ts`).
- Backend pytest suites exist for API presence and logic (e.g., project/auth/calculation endpoints in `backend/apps/projects/tests_api.py`, knowledge query mapping in `backend/apps/knowledge/tests/test_db_queries.py`, calculations integration in `backend/apps/calculations/tests_integration.py`), but many use mocked users and do not exercise real database writes.
- No evidence of coverage around the newer developer-operations or extraction flows beyond the above files.

**Evidence Index**
- README/Status: `docs/11-implementation-status/IMPLEMENTATION_STATUS_25-12-21.md`
- Frontend APIs & DB helper: `src/app/api/containers/[containerId]/route.ts`, `src/app/api/developer-operations/fees/route.ts`, `src/lib/db.ts`, `src/app/api/projects/[projectId]/landscaper/chat/route.ts`
- Backend core: `backend/config/urls.py`, `backend/db_backend/base.py`, `backend/apps/calculations/views.py`, `backend/apps/multifamily/views.py`, `backend/apps/knowledge/models.py`
- Services/Tools: `services/financial_engine_py/financial_engine/core/cashflow.py`, `services/market_ingest_py/README.md`
- Tests: `tests/themeTokens.spec.ts`, `tests/lease-calculator.spec.ts`, `tests/e2e/contrast.e2e.spec.ts`, `tests/contrast.probe.spec.ts`, `backend/apps/projects/tests_api.py`, `backend/apps/knowledge/tests/test_db_queries.py`
- Config/Deferred: `src/app/api/dms/extract-unified/route.ts`, `src/app/api/extractions/[id]/commit/route.ts`, `src/app/api/benchmarks/route.ts`, `src/app/api/benchmarks/inflation-analysis/route.ts`, `src/app/api/projects/recent/route.ts`, `next.config.ts`
