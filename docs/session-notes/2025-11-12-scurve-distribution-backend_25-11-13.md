## 2025-11-12 — S-Curve Distribution Backend

- Delivered the full ARGUS-style S-curve backend: new `core_fin_curve_profile` table with five seeded presets, `curve_steepness` on `core_fin_fact_budget`, and indexes so distribution math can read/write efficiently.
- Built `src/lib/financial-engine/scurve-allocation.ts` to fetch profiles, apply the 0‑100 steepness modifier, interpolate cumulative percentages, reconcile rounding, and persist allocations to `tbl_budget_timing` inside a transaction.
- Added API routes: `POST /api/budget/allocate`, `GET /api/budget/curve-profiles`, and `GET /api/budget/:factId/allocations`, plus guardrails for missing periods/amounts and cascade-friendly lookups based on project/curve metadata.
- Covered the new math with Jest unit tests and added `scripts/test-scurve-allocation.ts` for manual smoke tests; the engine now gracefully falls back to builtin curves when Neon isn’t available (test mode).
- Touched up `012_multifamily_assumptions.up.sql` so `tbl_debt_draw_schedule.debt_facility_id` is added if missing before creating an index, preventing migration failures on legacy schemas.
