# CC Prompt: Round 2 Market Agents — Setup & Test

**Branch:** `main` (or current working branch)

---

## ⚠️ BEFORE YOU START

Read this entire prompt thoroughly, then ask any clarifying questions before executing.

⚠️ DO NOT process, import, or write any data to the database during verification steps. Verification is read-only. Confirm pipeline routing by tracing code paths only — do not trigger live harvests against production data sources until explicitly instructed.

If anything is unclear about:
- The distinction between time-series agents (public.market_data) and research agents (landscape.tbl_research_*)
- Dependency installation order
- Environment variable setup for HUD/Census APIs
- Series registration SQL and why it's needed
- How to test each agent independently
- The staggered scheduling model

...ask first. Do not assume.

---

## OBJECTIVE

Complete setup and testing of 8 new market intelligence agents that Cowork has written:

**Track 1 — FRED Expansion:** `fred_agent.py` updated with ~20 new series across 4 bundles (treasury, lending/SLOOS, GDP, housing supply). No new files, just config additions.

**Track 2 — New Time-Series Agents (→ public.market_data):**
1. `census_bps_agent.py` — Census Building Permits (place-level monthly via Excel download from census.gov — NOT the REST API, which doesn't exist for place-level data)
2. `hud_agent.py` — HUD Fair Market Rents + Income Limits (annual)

**Track 3 — New Research Agents (→ landscape.tbl_research_*):**
3. `mba_agent.py` — MBA origination/delinquency from PR Newswire
4. `kbra_agent.py` — KBRA CMBS research
5. `trepp_agent.py` — Trepp CMBS insights blog
6. `brokerage_research_agent.py` — CBRE/Cushman/JLL MarketBeat PDFs
7. `construction_cost_agent.py` — ENR/RLB cost indexes
8. `naiop_agent.py` — Industrial/office demand forecasts

---

## CONTEXT

### New Files Created by Cowork

| File | Type | Purpose |
|------|------|---------|
| `agents/census_bps_agent.py` | Time-series | Census BPS place-level permits |
| `agents/hud_agent.py` | Time-series | HUD FMR + income limits |
| `agents/mba_agent.py` | Research | MBA lending data |
| `agents/kbra_agent.py` | Research | KBRA CMBS research |
| `agents/trepp_agent.py` | Research | Trepp CMBS insights |
| `agents/brokerage_research_agent.py` | Research | Brokerage MarketBeat PDFs |
| `agents/construction_cost_agent.py` | Research | ENR/RLB cost indexes |
| `agents/naiop_agent.py` | Research | NAIOP demand forecasts |
| `sql/seed_bps_hud_series.sql` | SQL seed | Series registration for BPS + HUD + FRED expanded |

All paths relative to `services/market_agents/market_agents/`.

### Modified Files

| File | Change |
|------|--------|
| `config.py` | 4 new FRED bundles, PHOENIX_METRO_PLACES, HUD/BPS/research agent toggles |
| `orchestrator.py` | Census BPS + HUD in time-series roster, 6 new research agents in research roster |
| `agents/__init__.py` | All new agent exports |
| `agents/fred_agent.py` | `series_codes()` expanded to include new bundles |

---

## DOWNSTREAM IMPACT

**No existing code is broken.** All changes are additive:
- FRED agent continues unchanged (new series are opt-in via config bundles)
- New time-series agents write to public.market_data using the same BaseAgent pattern
- New research agents write to landscape.tbl_research_* tables (created in Round 1 migration)
- Orchestrator additions are opt-in via config toggles (all default to False)
- Config additions have safe defaults

**Consumers of new data:**
- Landscaper market tools (future — will query tbl_research_publication)
- Market Intelligence tab (future — will display harvested research)
- No existing UI depends on this data yet

---

## IMPLEMENTATION STEPS

### Step 1: Install Dependencies

```bash
cd services/market_agents
poetry install
```

Verify no import errors:
```bash
cd services/market_agents
poetry run python -c "
from market_agents.agents.census_bps_agent import CensusBpsAgent
from market_agents.agents.hud_agent import HudAgent
from market_agents.agents.mba_agent import MBAAgent
from market_agents.agents.kbra_agent import KBRAAgent
from market_agents.agents.trepp_agent import TreppAgent
from market_agents.agents.brokerage_research_agent import BrokerageResearchAgent
from market_agents.agents.construction_cost_agent import ConstructionCostAgent
from market_agents.agents.naiop_agent import NAIOPAgent
print('All 8 agents import successfully')
"
```

### Step 2: Run Series Registration SQL

The Census BPS and HUD agents need their series registered in `public.market_series` before they can write data. The FRED expanded series also need registration.

```bash
psql "$DATABASE_URL" -f services/market_agents/market_agents/sql/seed_bps_hud_series.sql
```

Verify:
```bash
psql "$DATABASE_URL" -c "SELECT code, provider, name FROM public.market_series WHERE provider IN ('BPS', 'HUD') ORDER BY code;"
```

Expected: 12 BPS series + 8 HUD series = 20 rows.

Also verify FRED expanded series:
```bash
psql "$DATABASE_URL" -c "SELECT code, provider FROM public.market_series WHERE code IN ('DGS2', 'DGS10', 'SOFR', 'GDPC1', 'PERMIT', 'HOUST') ORDER BY code;"
```

Expected: 6 rows.

### Step 3: Verify Round 1 Migration Tables Exist

The research agents need the tables from the Round 1 migration. Confirm they exist:

```bash
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'landscape' AND table_name LIKE 'tbl_research_%' ORDER BY 1;"
```

Expected: `tbl_research_financial_data`, `tbl_research_harvest_log`, `tbl_research_publication`.

If missing, run:
```bash
psql "$DATABASE_URL" -f migrations/20260402_research_harvest_tables.sql
```

### Step 4: Configure Environment Variables

Add to `.env` (or Railway env vars):

```bash
# Census BPS (no key needed — public API, but agent must be enabled)
CENSUS_BPS_ENABLED=true

# HUD API (free registration at https://www.huduser.gov/hudapi/public/register)
HUD_ENABLED=true
HUD_API_TOKEN=your_hud_token_here

# Research agent toggles (all default false)
MBA_HARVEST_ENABLED=true
KBRA_HARVEST_ENABLED=true
TREPP_HARVEST_ENABLED=true
BROKERAGE_HARVEST_ENABLED=true
CONSTRUCTION_COST_HARVEST_ENABLED=true
NAIOP_HARVEST_ENABLED=true
```

### Step 5: Test Each Agent Individually

**Time-series agents** (write to public.market_data):

```bash
# Census BPS — fetches Phoenix metro place-level permits
cd services/market_agents
poetry run python -m market_agents.agents.census_bps_agent

# HUD — requires HUD_API_TOKEN
poetry run python -m market_agents.agents.hud_agent
```

Verify BPS data:
```bash
psql "$DATABASE_URL" -c "SELECT series_id, geo_id, date, value FROM public.market_data WHERE series_id IN (SELECT id FROM public.market_series WHERE provider = 'BPS') ORDER BY date DESC LIMIT 10;"
```

Verify HUD data:
```bash
psql "$DATABASE_URL" -c "SELECT series_id, geo_id, date, value, units FROM public.market_data WHERE series_id IN (SELECT id FROM public.market_series WHERE provider = 'HUD') ORDER BY date DESC LIMIT 10;"
```

**Research agents** (write to landscape.tbl_research_*):

```bash
# MBA
poetry run python -m market_agents.agents.mba_agent

# KBRA
poetry run python -m market_agents.agents.kbra_agent

# Trepp
poetry run python -m market_agents.agents.trepp_agent

# Brokerage Research
poetry run python -m market_agents.agents.brokerage_research_agent

# Construction Cost
poetry run python -m market_agents.agents.construction_cost_agent

# NAIOP
poetry run python -m market_agents.agents.naiop_agent
```

Verify research data:
```bash
psql "$DATABASE_URL" -c "SELECT source, publication_type, COUNT(*) FROM landscape.tbl_research_publication GROUP BY source, publication_type ORDER BY source;"
```

```bash
psql "$DATABASE_URL" -c "SELECT source, COUNT(*) as pubs, SUM(CASE WHEN extraction_status = 'extracted' THEN 1 ELSE 0 END) as extracted FROM landscape.tbl_research_publication GROUP BY source;"
```

### Step 6: Test FRED Expanded Series

```bash
cd services/market_agents
poetry run python -m market_agents.agents.fred_agent
```

Verify new series fetched:
```bash
psql "$DATABASE_URL" -c "SELECT ms.code, COUNT(md.id) as rows FROM public.market_series ms LEFT JOIN public.market_data md ON md.series_id = ms.id WHERE ms.code IN ('DGS10', 'SOFR', 'GDPC1', 'UMCSENT', 'HOUST') GROUP BY ms.code ORDER BY ms.code;"
```

### Step 7: Test Orchestrator Integration

```bash
# Time-series only (includes Census BPS + HUD now)
cd services/market_agents
poetry run market-agents

# Research only (includes all 8 research agents)
poetry run market-agents --research

# Both
poetry run market-agents --all
```

### Step 8: Verify Harvest Log

```bash
psql "$DATABASE_URL" -c "SELECT agent_name, status, publications_new, extractions_completed, started_at FROM landscape.tbl_research_harvest_log ORDER BY started_at DESC LIMIT 20;"
```

---

## SUCCESS CRITERIA

All must pass:

1. [ ] All 8 agents import without errors
2. [ ] Series registration SQL runs without errors (20 BPS/HUD + 17 FRED expanded)
3. [ ] Census BPS agent writes permit data to public.market_data for at least 1 Phoenix metro city
4. [ ] HUD agent writes FMR data for at least 1 target geography
5. [ ] FRED agent fetches at least 1 row for new series (DGS10, SOFR, or GDPC1)
6. [ ] At least 3 of 6 research agents create publications in tbl_research_publication
7. [ ] Orchestrator `--research` flag runs without crash
8. [ ] Harvest log shows entries for agents that ran
9. [ ] No existing FRED data or time-series data is modified or deleted
10. [ ] `poetry run python -c "from market_agents.agents import *"` succeeds

---

## TROUBLESHOOTING

**Import errors:** Check `pyproject.toml` has all deps (requests, beautifulsoup4, pdfplumber, loguru, tenacity, psycopg2-binary, apscheduler). Run `poetry lock && poetry install`.

**Series not found:** Census BPS and HUD agents will log warnings if their series aren't in `public.market_series`. Re-run `seed_bps_hud_series.sql`.

**HUD 401/403:** HUD API tokens expire. Register a new one at https://www.huduser.gov/hudapi/public/register.

**Census BPS empty results:** The agent downloads Excel files from `https://www2.census.gov/econ/bps/Place/West Region/footnote{YYYYMM}.xls`. Recent months may not be published yet (typically ~2 month lag). The agent needs either `openpyxl` or `xlrd` to parse the files — add to `pyproject.toml` if missing. If header detection fails, check `_map_columns()` against the actual column headers in the downloaded file.

**Research agent "0 publications":** These agents depend on scraping live web pages. Site structure changes break CSS selectors. Check the agent logs for HTTP errors vs. parsing failures.

**PDF extraction empty:** `pdfplumber` requires the PDF to have a text layer. Scanned PDFs return empty tables. This is expected — the agent logs it and moves on.

---

## SERVER RESTART

Not required — these are standalone Python services, not part of the Next.js or Django servers.

To restart the scheduler if it's running:
```bash
# Kill existing scheduler process, then:
cd services/market_agents
poetry run market-agents --loop
```
