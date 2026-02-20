# Cap Rate 4% Diagnosis — Project 17 (Chadron Terrace)

## Where the 4% lives
- Table: `landscape.tbl_project`
- Column: `cap_rate_current`
- Value: `0.0400` (4.00%)
- How it got there: explicitly set in `backend/migrations/014_project_location_metadata.sql` via an `UPDATE` for `project_id = 17` (`cap_rate_current = 0.0400`).

## Where the 5.5% lives
- Table: `landscape.tbl_income_approach`
- Column: `selected_cap_rate`
- Value: `0.0550` (5.50%) for `project_id = 17`.

## KPI Tile Source
- Component: `src/app/projects/[projectId]/components/tabs/ProjectTab.tsx` ("Current Cap" tile uses `project.cap_rate_current`).
- API: `GET /api/projects/[projectId]/details` in `src/app/api/projects/[projectId]/details/route.ts`.
- Reads from: `landscape.tbl_project.cap_rate_current` (and `cap_rate_proforma` for Proforma Cap).

## Landscaper Tool Source
- Tool: `OM_FIELD_MAPPING` / `normalize_om_label` in `backend/apps/landscaper/tool_executor.py`.
- Reads from: `tbl_project.cap_rate_going_in` for "cap rate" / "current cap rate" (column not present in `tbl_project`), `tbl_project.cap_rate_proforma` for pro forma, `tbl_project.exit_cap_rate` for exit.

## Recommendation
If the Income Approach is the single source of truth, the KPI tile should read from `tbl_income_approach.selected_cap_rate`. De-populate or remove project-level cap fields (`tbl_project.cap_rate_current`, `tbl_project.cap_rate_proforma`) to avoid drift, or ensure they are programmatically synchronized from Income Approach. Align Landscaper mappings to actual schema and/or to `tbl_income_approach.selected_cap_rate`.
