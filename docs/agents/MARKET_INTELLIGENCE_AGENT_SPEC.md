# Market Intelligence Agent — Implementation Spec

**Date:** 2026-03-18
**Target Runtime:** Local Qwen LLM (no Claude API)
**Scope:** Single agent, end-to-end (data → insights → UI surface)
**Predecessor:** Phase 0 Discovery (2026-03-13), `services/market_agents/` framework

---

## ⚠️ BEFORE YOU START

Read this entire spec thoroughly, then ask clarifying questions before writing code.

If anything is unclear about:
- How the existing `services/market_agents/` framework relates to this agent
- Which database tables to read from vs. write to
- How insights surface in the UI (Landscaper chat vs. activity feed vs. inline)
- The Qwen execution model (how/where Qwen runs, context window limits)
- How this agent interacts with the existing Landscaper tool system
- File naming and location conventions

...ask first. Do not assume.

---

## 1. OBJECTIVE

Build a Market Intelligence Agent that:
1. Scans active projects nightly
2. Compares user assumptions against platform comparables data
3. Generates structured insights (stored in `agent_insight` table)
4. Surfaces those insights in the Landscaper chat and project activity feed

This is the **first platform intelligence agent**. It establishes the pattern (schema, runner, UI hooks) that future agents (Comp Research, Portfolio, etc.) will follow.

---

## 2. WHAT EXISTS TODAY

### 2.1 Existing Framework (`services/market_agents/`)

The overnight batch agent framework is built and functional:

| File | Purpose | Reuse? |
|------|---------|--------|
| `base_agent.py` | Abstract base with geo resolution, DB write, Discord logging | **Extend** — add a `PlatformAgent` subclass |
| `orchestrator.py` | APScheduler + sequential agent runner + Discord digest | **Reuse** — register new agent in roster |
| `config.py` | Metro areas, API keys, schedule config | **Extend** — add platform agent config |
| `discord.py` | Webhook logging to #market-intel-log and #market-intel-digest | **Reuse as-is** |
| `agents/fred_agent.py` | FRED economic data fetcher | **No change** — separate concern |

### 2.2 Existing Data (from Phase 0 Discovery)

| Source | Table | Count | Key Fields |
|--------|-------|-------|------------|
| Rental comps | `tbl_rental_comparable` | 453 | `asking_rent`, `effective_rent`, `city`, `total_units`, `unit_type` |
| Sales comps | `tbl_sales_comparables` | 51 | `sale_price`, `price_per_unit`, `cap_rate`, `city`, `state` |
| Competitive projects | `market_competitive_projects` | 25 | `asking_rent_avg`, `occupancy_rate`, `city`, `units` |
| User projects | `tbl_project` | 31 active | `cap_rate_current`, `current_noi`, `current_vacancy_rate`, `city`, `state`, `msa_id` |
| Project assumptions | `tbl_project_assumption` | varies | Key-value pairs: `physical_vacancy_pct`, `cap_rate_going_in`, etc. |
| FRED data | `public.market_data` | 9,291 | Mortgage rates, CPI, home prices, employment |

### 2.3 What Does NOT Exist Yet

- `landscape.agent_insight` table (schema designed, not created)
- `landscape.agent_run_log` table (schema designed, not created)
- Any comparison logic
- Any UI for displaying agent insights
- Any Landscaper tool for querying agent insights

---

## 3. ARCHITECTURE

### 3.1 New Agent Class Hierarchy

```
BaseAgent (existing — external data fetchers)
    └── FredAgent (existing)

PlatformAgent (NEW — internal data analyzers)
    └── MarketIntelligenceAgent (NEW)
    └── [future: CompResearchAgent, PortfolioAgent, etc.]
```

`PlatformAgent` differs from `BaseAgent`:
- Reads from platform tables (not external APIs)
- Writes to `agent_insight` (not `tbl_market_observation`)
- Iterates over **projects** (not metro areas)
- Does NOT need geo resolution or series metadata
- Uses Qwen for natural language insight generation

### 3.2 Execution Flow

```
Orchestrator (existing)
    │
    ├── FredAgent.run()          ← external data (unchanged)
    │
    └── MarketIntelligenceAgent.run()   ← NEW
         │
         ├── 1. Load active projects with assumptions
         ├── 2. For each project:
         │     ├── a. Find matching comps (city/state/property_type)
         │     ├── b. Run comparison checks (rent, vacancy, price, cap rate)
         │     ├── c. If divergence > threshold → generate insight
         │     └── d. INSERT into agent_insight
         ├── 3. Log run to agent_run_log
         └── 4. Return RunResult for digest
```

### 3.3 Qwen Integration

Qwen generates the **narrative body** of each insight — not the detection logic.

Detection is pure SQL/Python (deterministic):
```
user_rent = $500/unit
median_comp_rent = $620/unit
divergence = -19.4%
threshold exceeded? YES (>10%)
```

Qwen writes the insight text:
```
"Your asking rent of $500/unit at Chadron Terrace is 19.4% below the
median of 12 comparable properties in Hawthorne, CA ($620/unit).
This may indicate upside potential or a data entry issue worth reviewing."
```

**Qwen prompt pattern:**
- Input: structured comparison result (JSON)
- Output: 2-3 sentence plain English insight
- Temperature: 0.3 (factual, not creative)
- Max tokens: 200
- No tool calls, no function calling — pure text generation

If Qwen is unavailable, fall back to a template string (no LLM required for the agent to function).

---

## 4. DATABASE CHANGES

### 4.1 Migration: Create Agent Tables

**File:** `migrations/037_agent_insight_tables.sql`

```sql
-- UP
CREATE TABLE landscape.agent_insight (
    id SERIAL PRIMARY KEY,
    agent_type VARCHAR(50) NOT NULL,
    project_id INTEGER REFERENCES landscape.tbl_project(project_id),
    user_id INTEGER,
    insight_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'alert', 'critical')),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    payload JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'seen', 'dismissed', 'acted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    superseded_by INTEGER REFERENCES landscape.agent_insight(id)
);

CREATE INDEX idx_agent_insight_project ON landscape.agent_insight(project_id);
CREATE INDEX idx_agent_insight_status ON landscape.agent_insight(status);
CREATE INDEX idx_agent_insight_type ON landscape.agent_insight(agent_type, insight_type);
CREATE INDEX idx_agent_insight_created ON landscape.agent_insight(created_at DESC);

CREATE TABLE landscape.agent_run_log (
    id SERIAL PRIMARY KEY,
    agent_type VARCHAR(50) NOT NULL,
    run_at TIMESTAMPTZ DEFAULT NOW(),
    duration_ms INTEGER,
    projects_scanned INTEGER DEFAULT 0,
    insights_generated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_detail TEXT,
    config_snapshot JSONB DEFAULT '{}'
);

CREATE INDEX idx_agent_run_log_type ON landscape.agent_run_log(agent_type);
CREATE INDEX idx_agent_run_log_date ON landscape.agent_run_log(run_at DESC);

-- DOWN
DROP TABLE IF EXISTS landscape.agent_insight;
DROP TABLE IF EXISTS landscape.agent_run_log;
```

### 4.2 Insight Lifecycle

```
new → seen → dismissed
              └→ acted
```

- `new` — agent created it, user hasn't viewed
- `seen` — user viewed (auto-set when project loads)
- `dismissed` — user explicitly dismissed
- `acted` — user clicked through and modified the flagged value

`superseded_by` — when a nightly run generates an updated insight for the same project + insight_type, the old one points to the new one. Prevents stale insights from accumulating.

---

## 5. COMPARISON CHECKS

### 5.0 Exact Column Reference (from Django models)

**`tbl_project`** (Django: `backend/apps/projects/models.py`):
```
# Geography (for comp matching)
city                    VARCHAR(100)    -- e.g. "Hawthorne"
state                   VARCHAR(10)     -- e.g. "CA"
market                  VARCHAR(100)    -- e.g. "Los Angeles County"
msa_id                  INTEGER         -- FK to MSA

# Pricing & Valuation
asking_price            DECIMAL(15,2)
acquisition_price       DECIMAL(15,2)
price_per_unit          DECIMAL(15,2)
price_per_sf            DECIMAL(15,2)
cap_rate_current        DECIMAL(10,4)   -- e.g. 0.0400 = 4.0%
cap_rate_proforma       DECIMAL(10,4)

# Current Year Financials
current_gpr             DECIMAL(15,2)   -- Gross Potential Rent
current_vacancy_rate    DECIMAL(10,4)   -- e.g. 0.0500 = 5.0%
current_noi             DECIMAL(15,2)
current_opex            DECIMAL(15,2)

# Proforma Financials
proforma_vacancy_rate   DECIMAL(10,4)
proforma_noi            DECIMAL(15,2)
proforma_opex           DECIMAL(15,2)

# Note: NO asking_rent column on tbl_project.
# Rent data comes from tbl_rental_comparable or tbl_rent_roll_unit.
```

**`tbl_rental_comparable`** (Django: `backend/apps/market_intel/models.py`):
```
comparable_id           SERIAL PK
project_id              FK → tbl_project
property_name           VARCHAR(200)
city                    — NOT a column; use project.city for matching
distance_miles          DECIMAL(5,2)
total_units             INTEGER
unit_type               VARCHAR(50)     -- e.g. "1BR/1BA"
bedrooms                DECIMAL(3,1)
bathrooms               DECIMAL(3,1)
avg_sqft                INTEGER
asking_rent             DECIMAL(10,2)   -- ← PRIMARY rent benchmark
effective_rent          DECIMAL(10,2)
as_of_date              DATE
is_active               BOOLEAN
```

**`tbl_sales_comparables`** (Django: `backend/apps/financial/models_valuation.py`):
```
comparable_id           SERIAL PK
project_id              FK → tbl_project
property_name           VARCHAR(255)
city                    VARCHAR(100)
state                   VARCHAR(2)
sale_date               DATE
sale_price              DECIMAL(15,2)
price_per_unit          DECIMAL(10,2)   -- ← PRIMARY price benchmark
price_per_sf            DECIMAL(10,2)
actual_cap_rate         DECIMAL(6,4)
pro_forma_cap_rate      DECIMAL(6,4)
cap_rate                VARCHAR(255)    -- ⚠️ String field (land uses text like "utilities")
noi_at_sale             DECIMAL(15,2)
property_type           VARCHAR         -- ← discriminator for land vs MF comps
```

**`market_competitive_projects`** (Django: `backend/apps/market_intel/models.py`):
```
id                      SERIAL PK
project_id              FK → tbl_project
comp_name               VARCHAR(200)
total_units             INTEGER
price_min               DECIMAL(15,2)
price_max               DECIMAL(15,2)
absorption_rate_monthly DECIMAL(8,2)
status                  VARCHAR(50)     -- "selling", "sold_out", "planned"
# ⚠️ NO occupancy_rate column — Phase 0 was wrong
# ⚠️ NO asking_rent_avg column — Phase 0 was wrong
```

**FRED Data** (`public.market_data`):
```
# Mortgage rate series: MORTGAGE30US
# Access via: SELECT value FROM public.market_data
#   WHERE series_id = 'MORTGAGE30US' ORDER BY date DESC LIMIT 1
```

---

### CRITICAL: Platform-Level Comp Querying

Comps are stored with a `project_id` FK, but the Market Intelligence Agent queries them
**ACROSS all projects** for market benchmarking. Every comp uploaded to any project feeds
the platform intelligence pool. The `project_id` on comps tells us *who uploaded it* —
it does NOT restrict which projects can benefit from the data.

**Matching strategy (all comp checks):**
1. Match by `city + state` (primary) — e.g., all comps in "Hawthorne, CA" regardless of project
2. Exclude the subject project's own comps from the benchmark (avoid self-comparison)
3. Filter by recency: `sale_date` or `as_of_date` within 18 months
4. Minimum comp count: need ≥3 matching comps to generate an insight; skip otherwise

```sql
-- Example: platform-level rent comp query for a project in Hawthorne, CA
SELECT
    rc.asking_rent,
    rc.effective_rent,
    rc.unit_type,
    rc.bedrooms,
    p.project_name AS source_project
FROM tbl_rental_comparable rc
JOIN tbl_project p ON p.project_id = rc.project_id
WHERE p.city = 'Hawthorne'
  AND p.state = 'CA'
  AND rc.project_id != :subject_project_id   -- exclude self
  AND rc.is_active = true
  AND rc.as_of_date >= NOW() - INTERVAL '18 months'
```

**Note on `tbl_rental_comparable`:** This table has no `city` column of its own.
City comes from the parent project via JOIN. Sales comps (`tbl_sales_comparables`)
DO have their own `city` and `state` columns — use those directly.

---

### 5.1 Rent Divergence (Multifamily)

**Source:** `tbl_project.current_gpr / tbl_project.total_units / 12` (derived monthly rent per unit)
  - Fallback: if `current_gpr` is null, skip this check for the project
  - ⚠️ `tbl_project` has no `asking_rent` column — must derive from GPR or use rent roll
**Benchmark:** `tbl_rental_comparable.asking_rent` across ALL projects in same city/state
  - Platform-level query (see above) — NOT filtered by project_id
  - Exclude subject project's own comps
  - Aggregate: median of `asking_rent` from matching comps
**Metric:** `(derived_user_rent - median_comp_rent) / median_comp_rent`

| Divergence | Severity | Insight Type |
|------------|----------|-------------|
| ±10-20% | warning | `rent_divergence` |
| >±20% | alert | `rent_divergence` |

**Payload:**
```json
{
    "user_value": 500,
    "user_value_source": "current_gpr / total_units / 12",
    "benchmark_value": 620,
    "benchmark_source": "platform median — 12 rent comps across 4 projects in Hawthorne, CA",
    "divergence_pct": -19.4,
    "comp_count": 12,
    "source_projects": 4,
    "project_city": "Hawthorne",
    "project_state": "CA"
}
```

### 5.2 Vacancy Rate Check (Multifamily)

**Source:** `tbl_project.current_vacancy_rate` (decimal, e.g. 0.0500 = 5%)
  - Also check `proforma_vacancy_rate` as a separate insight
**Benchmark:** Portfolio average vacancy across ALL active MF projects in platform
  - ⚠️ `market_competitive_projects` has NO `occupancy_rate` column
  - Query: `SELECT AVG(current_vacancy_rate) FROM tbl_project WHERE asset_type = 'MF' AND is_active = true AND current_vacancy_rate IS NOT NULL AND project_id != :subject_project_id`
**Metric:** `project_vacancy - platform_avg_vacancy`

| Divergence | Severity |
|------------|----------|
| ±3-5% | warning |
| >±5% | alert |

**Insight Type:** `vacancy_divergence`

### 5.3 Price Per Unit (Acquisitions)

**Source:** `tbl_project.price_per_unit`
**Benchmark:** `tbl_sales_comparables.price_per_unit` across ALL projects in same city/state
  - Sales comps have their own `city` + `state` columns — query directly, no JOIN needed
  - Filter: `WHERE city = :project_city AND state = :project_state AND sale_date >= NOW() - INTERVAL '18 months' AND price_per_unit IS NOT NULL AND project_id != :subject_project_id`
**Metric:** `(user_ppu - median_comp_ppu) / median_comp_ppu`

| Divergence | Severity |
|------------|----------|
| ±15-30% | warning |
| >±30% | alert |

**Insight Type:** `price_per_unit_divergence`

### 5.4 Cap Rate vs. Mortgage Rate Spread

**Source:** `tbl_project.cap_rate_current` (decimal, e.g. 0.0400 = 4.0%)
**Benchmark:** Latest `MORTGAGE30US` from `public.market_data`
  - Query: `SELECT value FROM public.market_data WHERE series_id = 'MORTGAGE30US' ORDER BY date DESC LIMIT 1`
  - ⚠️ Verify `market_data` schema — column names may differ. Check `public` schema directly.
**Metric:** `(cap_rate_current * 100) - mortgage_rate` (both as percentages, e.g. 4.0 - 6.8 = -2.8)

| Spread | Severity | Meaning |
|--------|----------|---------|
| < 0% (negative) | alert | Cap rate below borrowing cost |
| 0-1% | warning | Thin spread |
| 1-3% | info | Typical range |

**Insight Type:** `cap_rate_spread`

### 5.5 Portfolio Positioning (Cross-Project)

**Source:** All active projects for same user (or all active projects in platform for alpha)
**Benchmark:** Portfolio averages computed from `tbl_project` where values are non-null
**Metrics computed:**
  - `cap_rate_current` vs. portfolio mean
  - `current_vacancy_rate` vs. portfolio mean
  - `price_per_unit` vs. portfolio mean
**Query:**
```sql
SELECT AVG(cap_rate_current) as avg_cap,
       STDDEV(cap_rate_current) as std_cap,
       AVG(current_vacancy_rate) as avg_vac,
       STDDEV(current_vacancy_rate) as std_vac
FROM tbl_project
WHERE is_active = true
  AND cap_rate_current IS NOT NULL
```

| Divergence from portfolio avg | Severity |
|-------------------------------|----------|
| >1 std deviation | info |
| >2 std deviations | warning |

**Insight Type:** `portfolio_outlier`

---

## 6. FILE STRUCTURE

```
services/market_agents/market_agents/
├── base_agent.py                    (existing — no changes)
├── platform_agent.py                (NEW — PlatformAgent base class)
├── orchestrator.py                  (MODIFY — add platform agents to roster)
├── config.py                        (MODIFY — add threshold config)
├── qwen_client.py                   (NEW — lightweight Qwen HTTP client)
├── agents/
│   ├── fred_agent.py                (existing — no changes)
│   └── market_intelligence.py       (NEW — MarketIntelligenceAgent)
└── checks/
    ├── __init__.py
    ├── rent_check.py                (NEW — rent divergence comparison)
    ├── vacancy_check.py             (NEW — vacancy rate comparison)
    ├── price_check.py               (NEW — price per unit comparison)
    ├── cap_rate_check.py            (NEW — cap rate vs mortgage spread)
    └── portfolio_check.py           (NEW — cross-project outlier detection)
```

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Foundation (agent_insight table + PlatformAgent base)

1. Create migration `037_agent_insight_tables.sql`
2. Run migration
3. Create `platform_agent.py` with:
   - `run()` iterates over active projects (not metros)
   - `write_insight()` inserts into `agent_insight`
   - `log_run()` inserts into `agent_run_log`
   - `supersede_old_insights()` marks old same-type insights
4. Create `qwen_client.py`:
   - HTTP POST to local Qwen endpoint (configurable URL)
   - Structured prompt → text response
   - Timeout + fallback to template strings

**Verify:** `SELECT COUNT(*) FROM landscape.agent_insight` works. PlatformAgent can write a test insight.

### Phase 2: First Check (Rent Divergence)

1. Create `checks/rent_check.py`:
   - SQL query: project rent vs. matching rental comps
   - Threshold logic
   - Returns structured comparison result
2. Create `agents/market_intelligence.py`:
   - Inherits `PlatformAgent`
   - Runs rent check for each MF project
   - Calls Qwen for narrative (or template fallback)
   - Writes insights
3. Register in orchestrator roster

**Verify:** Run agent manually. Check `agent_insight` has rows. Check Discord digest includes market intelligence results.

### Phase 3: Remaining Checks

1. Add `vacancy_check.py`, `price_check.py`, `cap_rate_check.py`
2. Wire into `MarketIntelligenceAgent.run()`
3. Add `portfolio_check.py` (cross-project, runs after per-project checks)

**Verify:** Run full suite. Confirm insights for Chadron Terrace (project 17) match expected values.

### Phase 4: Landscaper Integration

1. Create Landscaper tool: `get_project_insights` — returns active insights for current project
2. Create Landscaper tool: `dismiss_insight` — marks insight as dismissed
3. Add insight context to Landscaper system prompt: "There are N active insights for this project"
4. Landscaper can proactively mention insights when user asks about relevant topics

**Verify:** In Landscaper chat, ask "are there any market alerts for this project?" — returns insight data.

### Phase 5: UI Surface

1. Add insight badge to project tile (count of `new` insights)
2. Add insight panel/section in project activity feed
3. Auto-set `seen` status when user views project
4. Add dismiss button per insight

**Verify:** Navigate to project with insights. Badge shows. Panel renders. Dismiss works.

### Phase 6: Scheduling

1. Register `MarketIntelligenceAgent` in orchestrator's nightly run
2. Add to Discord digest output
3. Test full overnight cycle

**Verify:** After nightly run, new insights appear. Old same-type insights are superseded.

---

## 8. QWEN CLIENT SPEC

### Endpoint

```
POST http://localhost:11434/api/generate    (Ollama default)
```

Or configurable via `QWEN_API_URL` env var.

### Request Format

```json
{
    "model": "qwen2.5:14b",
    "prompt": "<system>You are a real estate market analyst...</system>\n<user>{comparison_json}</user>",
    "stream": false,
    "options": {
        "temperature": 0.3,
        "num_predict": 200
    }
}
```

### Prompt Template

```
You are a concise real estate market analyst. Given a comparison result, write a 2-3 sentence insight for a CRE professional. Be direct. Include the key numbers. Do not hedge or add disclaimers.

Comparison:
{
    "check_type": "rent_divergence",
    "project_name": "Chadron Terrace",
    "user_value": 500,
    "benchmark_value": 620,
    "divergence_pct": -19.4,
    "comp_count": 12,
    "market": "Hawthorne, CA"
}
```

### Fallback Template (no LLM)

```python
TEMPLATES = {
    "rent_divergence": (
        "Your asking rent of ${user_value}/unit at {project_name} is "
        "{divergence_pct:.1f}% {'below' if divergence_pct < 0 else 'above'} "
        "the median of {comp_count} comparable properties in {market} "
        "(${benchmark_value}/unit)."
    ),
    # ... one per check type
}
```

---

## 9. THRESHOLDS CONFIG

Add to `config.py`:

```python
PLATFORM_AGENT_THRESHOLDS = {
    "rent_divergence": {
        "warning_pct": 10,
        "alert_pct": 20,
    },
    "vacancy_divergence": {
        "warning_pct": 3,
        "alert_pct": 5,
    },
    "price_per_unit_divergence": {
        "warning_pct": 15,
        "alert_pct": 30,
    },
    "cap_rate_spread": {
        "warning_spread": 1.0,
        "alert_spread": 0.0,
    },
    "portfolio_outlier": {
        "warning_stddev": 1.0,
        "alert_stddev": 2.0,
    },
}
```

---

## 10. DOWNSTREAM IMPACT

**Files being created:**
- `services/market_agents/market_agents/platform_agent.py`
- `services/market_agents/market_agents/qwen_client.py`
- `services/market_agents/market_agents/agents/market_intelligence.py`
- `services/market_agents/market_agents/checks/*.py`
- `migrations/037_agent_insight_tables.sql`

**Files being modified:**
- `services/market_agents/market_agents/orchestrator.py` — add to roster
- `services/market_agents/market_agents/config.py` — add thresholds

**Known consumers (Phase 4+):**
- `backend/apps/landscaper/tools/` — new insight query tools
- `src/components/` — new insight UI components
- Landscaper system prompt — insight context injection

**Post-change verification:**
1. Existing FRED agent still runs without error
2. `agent_insight` table accepts inserts with all constraint checks
3. Orchestrator runs both FRED + MarketIntelligence without conflict
4. Discord digest includes both agent types

---

## 11. SUCCESS CRITERIA

All must pass:

1. [ ] Migration creates both tables successfully
2. [ ] `PlatformAgent` base class can write and read insights
3. [ ] Rent divergence check produces correct results for Chadron Terrace (project 17)
4. [ ] Qwen generates readable narrative (or template fallback works)
5. [ ] Old insights are superseded on re-run (no duplicates)
6. [ ] Orchestrator runs both external (FRED) and platform (MarketIntelligence) agents
7. [ ] `agent_run_log` records each execution with timing and counts
8. [ ] Discord digest includes market intelligence summary
9. [ ] Landscaper can query insights via new tool (Phase 4)
10. [ ] No regressions in existing market_agents functionality

---

## 12. WHAT THIS AGENT DOES NOT DO

- Does NOT replace Landscaper chat or tools
- Does NOT fetch external data (that's FRED/Census agents)
- Does NOT make changes to project data (read-only analysis)
- Does NOT require Claude API (Qwen only, with template fallback)
- Does NOT handle document extraction or OCR
- Does NOT do portfolio-level optimization (future Portfolio Agent scope)

---

## SERVER RESTART

After completing migration and code changes:

```bash
bash restart.sh
```

---

*Spec version: 1.0 — 2026-03-18*
