# Phase 0 Discovery Findings — Market Intelligence Agent

**Date:** 2026-03-13
**Session:** PL1
**Status:** ✅ Discovery Complete — Ready for Implementation

---

## Executive Summary

✅ **Platform intelligence data EXISTS and is substantial** - 51 sales comps, 453 rental comps, 25 competitive projects  
✅ **User project assumption data is well-structured** - cap rates, NOI, rent data stored on `tbl_project`  
✅ **Geography linking is available** - projects have `msa_id`, `market`, `city`, `state` fields  
⚠️ **No external FRED/economic data yet** - only building permit data exists in `market_activity`  
✅ **Ready to build comparisons using internal platform data**

---

## Available Platform Intelligence Data

### 1. Sales Comparables (`tbl_sales_comparables`)
- **Count:** 51 comparables
- **Date range:** Jan 2024 - Jan 2025 (recent data!)
- **Property types:** 2 types (mostly land)
- **Cities covered:** 6 cities (Hawthorne, Lawndale, CA focus)
- **Key fields:**
  - `sale_price`, `price_per_unit`, `price_per_sf`
  - `cap_rate`, `grm` (Gross Rent Multiplier)
  - `units`, `building_sf`, `year_built`
  - `city`, `state`, `distance_from_subject`

**Sample data:**
```
ID: 132 | Land Comp 5 | Hawthorne, CA | Sale: 2025-01-01
Price: $5,000,000 | $1,742,403/unit | 2.87 units
```

### 2. Rental Comparables (`tbl_rental_comparable`)
- **Count:** 453 comparables  
- **Key fields:**
  - `property_name`, `address`, `latitude`, `longitude`
  - `distance_miles`, `year_built`, `total_units`
  - `unit_type`, `bedrooms`, `bathrooms`, `avg_sqft`
  - `asking_rent`, `effective_rent`

### 3. Cap Rate Comps (`tbl_cap_rate_comps`)
- **Count:** 0 (empty table, but schema exists)
- **Schema:** `sale_price`, `noi`, `implied_cap_rate`, `sale_date`

### 4. Competitive Projects (`market_competitive_projects`)
- **Count:** 25 projects
- **Schema includes:** `project_name`, `city`, `state`, `units`, `year_built`, `asking_rent_avg`, `occupancy_rate`

---

## User Project Assumption Data

### Projects Table (`tbl_project`)
**Active projects:** 31 (Land Development: 14, Multifamily: 13, Retail: 2)

**Geography fields:**
- `msa_id` (integer) - links to MSA  
- `market` (text) - e.g., "Los Angeles County", "Phoenix"
- `city`, `state`, `zip_code`

**Assumption fields on project:**
- `cap_rate_current`, `cap_rate_proforma` (decimal)
- `current_noi`, `proforma_noi` (decimal)
- `current_vacancy_rate`, `proforma_vacancy_rate` (decimal)
- `current_opex`, `proforma_opex` (decimal)
- `asking_price`, `price_per_unit`, `price_per_sf` (decimal)

**Sample project:**
```
Project ID: 17 | Chadron Terrace | Multifamily
Location: Hawthorne, CA | MSA: 2 (Los Angeles County)
Cap Rate: 4.0% (current) / 6.54% (proforma)
NOI: $1,900,016 (current) / $3,104,983 (proforma)
```

### Additional Assumptions (`tbl_project_assumption`)
Key-value assumption storage:
- `physical_vacancy_pct`, `bad_debt_pct`, `cap_rate_going_in`
- `capex_per_unit`, `loss_to_lease_pct`

---

## Comparisons We Can Build (Phase 1)

### For Multifamily Projects

**1. Rent Analysis**
- Compare user's asking rent (from project fields) against rental comps in same MSA/city
- Divergence metric: `(user_rent - median_comp_rent) / median_comp_rent`
- Threshold: ±10% = warning, ±20% = alert

**2. Vacancy Rate Analysis**
- Compare user's `current_vacancy_rate` or `proforma_vacancy_rate` against competitive project occupancy
- Calculate: `vacancy = 1 - occupancy`
- Threshold: ±3% = warning, ±5% = alert

**3. Price Per Unit Analysis (for acquisitions)**
- Compare user's `price_per_unit` against recent sales comps in same market
- Filter comps by: distance < 5 miles, sale_date within 12 months
- Threshold: ±15% = warning, ±30% = alert

### For Land Development Projects

**4. Land Price Benchmarking**
- Compare user's `acquisition_price` or `price_per_sf` against land sales comps
- Filter: same city/market, sale within 18 months
- Threshold: ±20% = warning, ±40% = alert

### Cross-Project Intelligence

**5. Portfolio Cap Rate Positioning**
- Compare project's cap rate against user's OTHER projects (portfolio average)
- Insight: "Your cap rate (4.0%) is 1.5% below your portfolio average (5.5%)"
- No external market data needed - pure internal comparison

---

## Implementation Decision

**✅ PROCEED with Option C (Internal + Platform Comparisons)**

Build the agent using:
1. **Internal comparables** (sales comps, rental comps from ingested documents)
2. **Competitive project data** (already tracked in platform)
3. **Cross-project intelligence** (compare against user's own portfolio)

**DO NOT wait for FRED data** - the platform already has rich market intelligence from user-uploaded documents. This is more valuable and specific to real estate than macro-economic indicators.

---

## Table Creation Required

### `landscape.agent_insight`
```sql
CREATE TABLE landscape.agent_insight (
  id SERIAL PRIMARY KEY,
  agent_type VARCHAR(50) NOT NULL,
  project_id INTEGER REFERENCES landscape.tbl_project(project_id),
  user_id INTEGER,
  insight_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  payload JSONB,
  status VARCHAR(20) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_insight_project ON landscape.agent_insight(project_id);
CREATE INDEX idx_agent_insight_user ON landscape.agent_insight(user_id);
CREATE INDEX idx_agent_insight_status ON landscape.agent_insight(status);
```

### `landscape.agent_run_log`
```sql
CREATE TABLE landscape.agent_run_log (
  id SERIAL PRIMARY KEY,
  agent_type VARCHAR(50) NOT NULL,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER,
  projects_scanned INTEGER DEFAULT 0,
  insights_generated INTEGER DEFAULT 0,
  error TEXT
);
```

---

## Next Steps

1. ✅ Phase 0 complete - data sources identified and validated
2. ⏭️ **Phase 1:** Create `services/platform_agents/` structure
3. ⏭️ **Phase 2:** Implement comparison logic for rent, vacancy, price/unit
4. ⏭️ **Phase 3:** Write agent_runner.py and market_intelligence.py
5. ⏭️ **Phase 4:** Test with real project data
6. ⏭️ **Phase 5:** Schedule for nightly execution

---

## Notes

- Cap rate comps table exists but is empty - skip cap rate comparison for now
- Focus on **rent** and **price/unit** comparisons where we have 453 and 51 comps respectively
- Geography matching: use `city` + `state` for now, can enhance with distance/radius later
- User projects have `msa_id` but comps don't - match on city/state instead
