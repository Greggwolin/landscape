# P2 Landscaper Tools — Test Report

**Date:** 2026-02-28
**Method:** Direct `execute_tool()` via debug endpoint (`POST /api/landscaper/debug/test-tool/`)
**Projects tested:** 17 (Chadron Terrace, MF), 9 (Peoria Meadows, LAND)

---

## 1. Findings by Severity

### CRITICAL — propose_only broken for 6 of 7 write tools

Six P2 tables are **missing from `MUTABLE_FIELDS`** in `mutation_service.py`, causing every `propose_only=true` call to return `"Table X is not mutable by Landscaper"`. Since the AI handler always calls tools with `propose_only=True`, these tools **silently fail in production chat**.

| Table | Tool affected |
|---|---|
| `tbl_value_add_assumptions` | `update_value_add_assumptions` |
| `tbl_cost_approach` | `update_cost_approach` |
| `tbl_multifamily_turn` | `create_unit_turn` |
| `tbl_lot` | `create_lot`, `update_lot` |
| `tbl_lot_type` | `update_lot_type` |
| `tbl_sale_phases` | `update_sale_phase` |

Only `tbl_lease_assumptions` is registered in `MUTABLE_FIELDS` and works correctly with propose_only.

**File:** `backend/apps/landscaper/services/mutation_service.py` lines 38–160
**Fix:** Add entries for each missing table with their whitelisted columns.

---

### HIGH — `update_lease_assumptions` INSERT fails on NOT NULL `market_rent_psf_annual`

When inserting a new lease assumption, the tool uses `COALESCE` defaults of `0` for most columns but does **not** default `market_rent_psf_annual`, which has a NOT NULL constraint. If the AI omits this field (e.g., only sends `base_rent_psf`), the INSERT crashes.

**Error:** `null value in column "market_rent_psf_annual" violates not-null constraint`
**File:** `tool_executor.py`, `update_lease_assumptions` handler
**Fix:** Add `COALESCE(%s, 0)` for `market_rent_psf_annual` in the INSERT statement, or make the tool schema mark it as required.

---

### HIGH — `create_unit_turn` allows `total_make_ready_cost` (generated column)

`MULTIFAMILY_TURN_COLUMNS` includes `total_make_ready_cost`, which is a **GENERATED ALWAYS AS** column in PostgreSQL. Any INSERT or UPDATE that includes this field throws:

**Error:** `cannot insert a non-DEFAULT value into column "total_make_ready_cost"`
**File:** `tool_executor.py` line 2096
**Fix:** Remove `total_make_ready_cost` from `MULTIFAMILY_TURN_COLUMNS`.

---

### HIGH — `create_unit_turn` allows invalid `turn_status` values

The tool schema doesn't enforce the DB check constraint `chk_turn_status`. Valid values are `VACANT`, `MAKE_READY`, `READY`, `LEASED` only. Passing any other string (e.g., `completed`, `Completed`) crashes.

**Error:** `violates check constraint "chk_turn_status"`
**File:** `tool_executor.py` + `tool_schemas.py`
**Fix:** Add `enum` constraint to `turn_status` in the tool schema, or validate before INSERT.

---

### HIGH — `update_lease_assumptions` doesn't validate `space_type` enum

The DB constraint `tbl_lease_assumptions_space_type_check` requires one of: `OFFICE`, `RETAIL`, `INDUSTRIAL`, `MEDICAL`, `FLEX`, `OTHER` (uppercase). The tool passes any string through, crashing on invalid values.

**Error:** `violates check constraint "tbl_lease_assumptions_space_type_check"`
**File:** `tool_executor.py` + `tool_schemas.py`
**Fix:** Add `enum` constraint to `space_type` in the tool schema, or upper-case and validate before INSERT.

---

### MEDIUM — `update_sale_phase` column naming mismatch

The `tbl_sale_phases` columns use `default_` prefix (e.g., `default_commission_pct`, `default_closing_cost_per_unit`, `default_onsite_cost_pct`). The AI will likely try `commission_pct` and get `"No valid fields to update"`. The tool schema should document/alias the correct column names.

**File:** `tool_executor.py` line 2122–2125, `tool_schemas.py`
**Fix:** Either add aliases in the handler or rename schema properties to match DB columns.

---

### LOW — Test data residue

Test data was created during validation and needs cleanup:

| Table | Project | Records |
|---|---|---|
| `tbl_lease_assumptions` | 17 | id=7, space_type=OFFICE |
| `tbl_multifamily_turn` | 17 | id=5, unit_id=260 |
| `tbl_cost_approach` | 17 | id=3 (updated land_area_sf/land_value_per_sf) |
| `tbl_lot` | 9 | 1 lot created |
| `tbl_lot_type` | global | 1 lot type created |
| `tbl_sale_phases` | 9 | P9-1.1 commission updated; 1 new phase created |
| `pending_mutations` | 17 | 1 pending (RETAIL lease, expires 01:04 UTC) |

**Fix:** Run cleanup SQL to remove test records.

---

## 2. Pass / Fail Checklist

| # | Tool | Read | Write (execute) | Write (propose) | Negative paths | Persistence |
|---|---|---|---|---|---|---|
| 1 | `get_lease_assumptions` | ✅ PASS | — | — | — | — |
| 2 | `update_lease_assumptions` | — | ⚠️ CONDITIONAL | ✅ PASS | ✅ PASS | ✅ PASS |
| 3 | `get_value_add_assumptions` | ✅ PASS | — | — | — | — |
| 4 | `update_value_add_assumptions` | — | ✅ PASS | ❌ FAIL | — | ✅ PASS |
| 5 | `get_unit_turns` | ✅ PASS | — | — | — | — |
| 6 | `create_unit_turn` | — | ⚠️ CONDITIONAL | ❌ FAIL | ✅ PASS | ✅ PASS |
| 7 | `get_cost_approach` | ✅ PASS | — | — | — | — |
| 8 | `update_cost_approach` | — | ✅ PASS | ❌ FAIL | — | ✅ PASS |
| 9 | `get_lots` | ✅ PASS | — | — | — | — |
| 10 | `create_lot` | — | ✅ PASS | ❌ FAIL | ✅ PASS | ✅ PASS |
| 11 | `update_lot` | — | ✅ PASS | ❌ FAIL | ✅ PASS | ✅ PASS |
| 12 | `get_lot_types` | ✅ PASS | — | — | — | — |
| 13 | `update_lot_type` | — | ✅ PASS | ❌ FAIL | — | ✅ PASS |
| 14 | `get_sale_phases` | ✅ PASS | — | — | — | — |
| 15 | `update_sale_phase` | — | ✅ PASS | ❌ FAIL | ✅ PASS | ✅ PASS |

**Legend:**
- ✅ PASS — works correctly
- ⚠️ CONDITIONAL — works only with correct input values; crashes on valid-looking but schema-invalid inputs
- ❌ FAIL — broken (`"Table X is not mutable by Landscaper"`)

**Summary: 8 of 15 tools fully pass. 7 write tools fail propose_only mode. All 8 read tools pass. All writes persist correctly when executed directly.**

---

## 3. Reproduction Steps

### Reproduce propose_only failure (any of the 6 missing tables):
```bash
curl -X POST http://localhost:8000/api/landscaper/debug/test-tool/ \
  -H 'Content-Type: application/json' \
  -d '{"tool_name":"update_cost_approach","tool_input":{"land_area_sf":100000},"project_id":17,"propose_only":true}'
# Returns: {"success": false, "error": "Table tbl_cost_approach is not mutable by Landscaper"}
```

### Reproduce lease NOT NULL crash:
```bash
curl -X POST http://localhost:8000/api/landscaper/debug/test-tool/ \
  -H 'Content-Type: application/json' \
  -d '{"tool_name":"update_lease_assumptions","tool_input":{"space_type":"OFFICE","effective_date":"2026-01-01","base_rent_psf":25},"project_id":17,"propose_only":false}'
# Returns: null value in column "market_rent_psf_annual" violates not-null constraint
```

### Reproduce generated column crash:
```bash
curl -X POST http://localhost:8000/api/landscaper/debug/test-tool/ \
  -H 'Content-Type: application/json' \
  -d '{"tool_name":"create_unit_turn","tool_input":{"unit_id":260,"move_out_date":"2026-06-01","total_make_ready_cost":8500},"project_id":17,"propose_only":false}'
# Returns: cannot insert a non-DEFAULT value into column "total_make_ready_cost"
```

---

## 4. Suggested Fixes

### Fix 1: Register P2 tables in MUTABLE_FIELDS (Critical)

In `backend/apps/landscaper/services/mutation_service.py`, add after existing entries (~line 160):

```python
"tbl_value_add_assumptions": [
    "renovation_cost_per_unit", "rent_premium_pct", "renovation_timeline_months",
    "vacancy_during_renovation_pct", "capex_reserve_per_unit", "notes",
],
"tbl_cost_approach": [
    "land_valuation_method", "land_area_sf", "land_value_per_sf", "total_land_value",
    "cost_method", "building_area_sf", "cost_per_sf", "base_replacement_cost",
    "entrepreneurial_incentive_pct", "total_replacement_cost",
    "physical_curable", "physical_incurable_short", "physical_incurable_long",
    "functional_curable", "functional_incurable", "external_obsolescence",
    "total_depreciation", "depreciated_improvements", "indicated_value",
],
"tbl_multifamily_turn": [
    "unit_id", "move_out_date", "make_ready_complete_date", "next_move_in_date",
    "total_vacant_days", "cleaning_cost", "painting_cost", "carpet_flooring_cost",
    "appliance_cost", "other_cost", "turn_status", "notes",
],
"tbl_lot": [
    "parcel_id", "lot_number", "lot_block", "lot_width", "lot_depth",
    "lot_area", "base_price", "premium_amount", "premium_reason",
    "lot_status", "notes",
],
"tbl_lot_type": [
    "producttype_name", "typical_lot_width", "typical_lot_depth",
],
"tbl_sale_phases": [
    "phase_code", "phase_name", "default_sale_date",
    "default_commission_pct", "default_closing_cost_per_unit", "default_onsite_cost_pct",
],
```

### Fix 2: Remove generated column from whitelist

In `tool_executor.py` line 2092, remove `total_make_ready_cost` from `MULTIFAMILY_TURN_COLUMNS`.

### Fix 3: Add enum validation to tool schemas

In `tool_schemas.py`, add `enum` constraints for `space_type` and `turn_status`:

```json
"space_type": {"type": "string", "enum": ["OFFICE", "RETAIL", "INDUSTRIAL", "MEDICAL", "FLEX", "OTHER"]}
"turn_status": {"type": "string", "enum": ["VACANT", "MAKE_READY", "READY", "LEASED"]}
```

### Fix 4: Default market_rent_psf_annual in INSERT

In the `update_lease_assumptions` handler, change the INSERT to use `COALESCE(%s, 0)` for `market_rent_psf_annual`.

---

## Debug Endpoint Cleanup

Remove after testing:
- `backend/apps/landscaper/views_debug.py` (entire file)
- `backend/apps/landscaper/urls.py` — remove the import and path entry for `debug_test_tool`
