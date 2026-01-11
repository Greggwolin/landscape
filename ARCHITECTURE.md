**Technology Stack**
- Frontend: Next.js 15.5 with React 18/TypeScript 5, Tailwind, MUI, MapLibre, Neon client, and AI SDKs (see dependencies in `package.json`).
- Backend: Django 5 + DRF + SimpleJWT with custom Postgres backend to force `landscape` schema (`backend/requirements.txt`, `backend/db_backend/base.py`).
- Data/Infra: Neon/Postgres configured via `DATABASE_URL` parsing in `backend/config/settings.py` and reused by Next through `src/lib/db.ts`; Vercel cron defined for CPI sync (`vercel.json`).
- Services: Python financial engine packaged under `services/financial_engine_py/` and market ingestion CLI integrating FRED/ACS/BLS/FHFA in `services/market_ingest_py/README.md`.
- AI: Anthropic/OpenAI SDK usage for extraction and chat (`src/lib/ai/claude-extractor.ts`, `backend/apps/landscaper/ai_handler.py`).

**Directory Map (purpose)**
- `src/app/` – Next.js App Router pages + API routes for projects, budget, extraction, GIS, etc. (enumerated in `project-structure.txt`).
- `src/lib/` – Shared utilities including Neon DB helper (`src/lib/db.ts`) and TS financial engine modules (`src/lib/financial-engine/`).
- `backend/apps/` – DRF apps for projects/containers/financial/calculations/multifamily/knowledge/landscaper and others (`project-structure.txt`, `backend/config/urls.py`).
- `services/financial_engine_py/` – Python cashflow/metric engines consumed by DRF calculations (`services/financial_engine_py/financial_engine/core/cashflow.py`).
- `services/market_ingest_py/` – Market data ingestion CLI and helpers (`services/market_ingest_py/README.md`).
- `docs/` – Architecture/feature/database references and status reports (`docs/00_overview/status/IMPLEMENTATION_STATUS_25-12-21.md`).

**Data Flow (request → processing → persistence → response)**
- Container update: Next PATCH `src/app/api/containers/[containerId]/route.ts` reads JSON → validates duplicates/fields → executes SQL via `src/lib/db.ts` against `landscape.tbl_container` → returns `NextResponse` JSON.
- Developer fees: `src/app/api/developer-operations/fees/route.ts` requires `project_id`, aggregates budget/actuals from `landscape` tables through Neon, computes amounts, and returns labeled fee summaries.
- Landscaper chat: `src/app/api/projects/[projectId]/landscaper/chat/route.ts` proxies GET/POST to Django at `NEXT_PUBLIC_DJANGO_API_URL` → routed by `backend/config/urls.py` to `apps.landscaper` where `backend/apps/landscaper/ai_handler.py` builds Anthropic prompts/tools → Django JSON reshaped back to frontend format.
- Calculations: DRF actions in `backend/apps/calculations/views.py` validate payloads → call Python metrics/cashflow functions in `services/financial_engine_py/financial_engine/core/cashflow.py` or related modules → return DRF responses with computed metrics.
- Market ingest: CLI in `services/market_ingest_py/README.md` pulls external macro data → upserts into Postgres `public.market_*` tables and lineage rows (`services/market_ingest_py/db.py` referenced in README) without involving Next/Django request paths.

**Agent / Service Orchestration**
- Landscaper AI handler defines tool schemas for project/parcel updates and document retrieval before calling Anthropic (`backend/apps/landscaper/ai_handler.py`), enabling structured actions from chat requests.
- Claude extraction helper assembles prompts, calls `claude-3-5-sonnet` via `@anthropic-ai/sdk`, and parses unified results or PDF variants (`src/lib/ai/claude-extractor.ts`).
- Knowledge persistence app exposes entity/fact models with indexing and is wired via `backend/config/urls.py` for knowledge routes, supporting downstream retrieval/extraction flows (`backend/apps/knowledge/models.py`).

**Explicit Invariants / Guards**
- Database search_path forced to `landscape, public` on every Django connection (`backend/db_backend/base.py`).
- User preferences require valid scope and key length; non-global scopes must include `scope_id` (`backend/apps/projects/serializers.py`).
- Debt service cannot be zero for DSCR calculations, returning 400 on violation (`backend/apps/calculations/views.py`).
- Container PATCH rejects duplicate `container_code` within a project and empty `display_name`, and demands at least one field to update (`src/app/api/containers/[containerId]/route.ts`).
- Developer fee endpoints return 400 when `project_id` is missing and guard null base amounts (`src/app/api/developer-operations/fees/route.ts`).
- Knowledge facts enforce confidence between 0.00–1.00 via validators (`backend/apps/knowledge/models.py`).

**Evidence Index**
- Stack/Config: `package.json`, `backend/requirements.txt`, `backend/config/settings.py`, `backend/db_backend/base.py`, `vercel.json`
- App Structure: `project-structure.txt`, `src/lib/db.ts`, `backend/config/urls.py`
- Flows: `src/app/api/containers/[containerId]/route.ts`, `src/app/api/developer-operations/fees/route.ts`, `src/app/api/projects/[projectId]/landscaper/chat/route.ts`, `backend/apps/landscaper/ai_handler.py`, `backend/apps/calculations/views.py`, `services/financial_engine_py/financial_engine/core/cashflow.py`, `services/market_ingest_py/README.md`
- Agents/AI: `src/lib/ai/claude-extractor.ts`, `backend/apps/knowledge/models.py`
- Guards: `backend/apps/projects/serializers.py`, `src/app/api/containers/[containerId]/route.ts`, `src/app/api/developer-operations/fees/route.ts`, `backend/apps/calculations/views.py`
