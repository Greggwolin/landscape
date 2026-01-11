# Table Authoritativeness Audit – Operating Expenses (Project 42)

## Findings
- **UI – Operations tab (READ)**: `src/app/api/projects/[projectId]/operating-expenses/hierarchy/route.ts:62-96` reads `core_unit_cost_category` and left-joins `landscape.tbl_operating_expenses` to build the hierarchy payload; consumption via `src/app/components/OpExHierarchy.tsx:89-105` and `src/app/projects/[projectId]/components/tabs/OperationsTab.tsx:165-229` fetches this endpoint and maps account_number→expense types. No references to `tbl_operating_expense` (singular) in the UI path.
- **API – CRUD (READ/WRITE)**: `src/app/api/projects/[projectId]/opex/route.ts:6-132` selects/inserts/updates `landscape.tbl_operating_expenses`; `src/app/api/projects/[projectId]/operating-expenses/[accountId]/route.ts:120-226` updates per-category rows in `tbl_operating_expenses` and recalculates totals; `src/app/api/extractions/[id]/commit/route.ts:66-71` (TODO) notes intended commit target `tbl_operating_expenses`.
- **Calc engine (READ)**: `backend/apps/reports/calculators/multifamily_calculator.py:197-209` queries `landscape.tbl_operating_expenses` joined to `tbl_opex_accounts` and escalates amounts for NOI; no scenario or column-awareness beyond year escalations.
- **Ingestion / extraction (WRITE)**: `backend/apps/knowledge/services/extraction_writer.py:278-307` upserts to `landscape.tbl_operating_expense` (singular) keyed by (project_id, expense_category); extraction prompt target set to `tbl_operating_expense` in `backend/apps/knowledge/services/extraction_service.py:346-358`. `backend/apps/landscaper/tool_executor.py:720-809` bulk/individual upserts write to `tbl_operating_expenses` using label→account/category mapping. `backend/apps/knowledge/services/project_context.py:421-454` reads from `tbl_operating_expense` for summaries (stale schema—references category_id that is not present).
- **Migrations / schema**: `migrations/006_lease_management.sql:120-155` creates `tbl_operating_expenses`; `migrations/018_land_dev_opex_calculations.sql` adds calculation_basis/unit_amount/is_auto_calculated; `migrations/042_cost_category_unification.sql` moves OpEx hierarchy into `core_unit_cost_category` and marks `tbl_opex_accounts` deprecated (API now relies on category_id). The singular `tbl_operating_expense` comes from the DB schema doc (row-based extractor target) and is not part of the newer hierarchy.
- **Other references**: Assumption config `src/config/assumptions/basket3-expenses.ts:8` names `tbl_operating_expense`; extraction mapping seeds (`backend/apps/landscaper/management/commands/seed_extraction_mappings.py` around lines 978-1386) target the singular table, reinforcing that automated ingestion currently prefers `tbl_operating_expense`.

## DB evidence (Project 42)
Counts:
```
tbl_operating_expense,15
tbl_operating_expenses,10
```

Sample rows (key fields, top 20 ordered by newest):
```
table,expense_category,expense_type,amount/annual_amount,account_id,category_id,created_at
tbl_operating_expense,miscellaneous,,15830,,,"2025-12-23T16:42:23Z"
tbl_operating_expense,utilities_gas,,62299,,,"2025-12-23T16:42:21Z"
tbl_operating_expense,professional_fees,,15830,,,"2025-12-23T16:42:20Z"
tbl_operating_expense,manager_rent_credit,,25200,,,"2025-12-23T16:42:20Z"
tbl_operating_expense,repairs_maintenance,,53400,,,"2025-12-23T16:42:13Z"
tbl_operating_expense,contract_services,,39432,,,"2025-12-23T16:42:13Z"
tbl_operating_expense,turnover_costs,,32246,,,"2025-12-23T16:42:13Z"
tbl_operating_expense,management_fee,,79777,,,"2025-12-23T16:42:12Z"
tbl_operating_expense,payroll,,125001,,,"2025-12-23T16:42:12Z"
tbl_operating_expense,utilities_electric,,62299,,,"2025-12-23T16:42:12Z"
tbl_operating_expense,utilities_water,,122406,,,"2025-12-23T16:42:12Z"
tbl_operating_expense,utilities_trash,,21779,,,"2025-12-23T16:42:12Z"
tbl_operating_expense,property_insurance,,89000,,,"2025-12-23T16:42:11Z"
tbl_operating_expense,real_estate_taxes,,264373,,,"2025-12-23T16:42:11Z"
tbl_operating_expense,direct_assessments,,2573,,,"2025-12-23T16:42:11Z"
tbl_operating_expenses,taxes,TAXES,2573,18,79,"2025-12-21T17:57:30Z"
tbl_operating_expenses,taxes,TAXES,264373,17,78,"2025-12-21T17:57:30Z"
tbl_operating_expenses,insurance,INSURANCE,115379,7,66,"2025-12-21T17:57:30Z"
tbl_operating_expenses,other,OTHER,31979,9,68,"2025-12-21T17:57:30Z"
tbl_operating_expenses,utilities,UTILITIES,122406,8,67,"2025-12-21T17:57:30Z"
tbl_operating_expenses,utilities,UTILITIES,82079,10,69,"2025-12-21T17:57:29Z"
tbl_operating_expenses,management,MANAGEMENT,204600,14,73,"2025-12-21T17:57:29Z"
tbl_operating_expenses,management,MANAGEMENT,31235,15,74,"2025-12-21T17:57:29Z"
tbl_operating_expenses,maintenance,REPAIRS,39432,13,72,"2025-12-21T17:57:29Z"
tbl_operating_expenses,maintenance,REPAIRS,186791,12,71,"2025-12-21T17:57:29Z"
```
- Neither table stores scenario/as_of_date; duplicates exist in `tbl_operating_expenses` (two utilities, two management, two maintenance, two taxes) driven by separate account_ids/category_ids. The singular table has unique categories enforced by `(project_id, expense_category)` constraint.

## Recommendation
- **Authoritative today**: UI + Operations tab API + calc engine all read `tbl_operating_expenses` (with category_id/account_id hierarchy). Automated extraction/ingestion writes target `tbl_operating_expense` (singular), creating a split.
- **Risks of immediate consolidation**: moving ingestion to the plural table without mapping category_name→category_id/account_id will lose data fidelity and may break the unique constraint differences; dropping/mirroring data prematurely could double-count in the calc engine or orphan UI rows. Project_context and other summaries that still read the singular table would go empty unless migrated.
- **Recommended canonical table**: `tbl_operating_expenses` should be the system of record because it is used by the Operations tab read-path and the NOI calculator and already aligns with the category hierarchy (`core_unit_cost_category`, account_id/category_id). The singular table lacks hierarchy keys and is only fed by extraction.
- **Next step (no code changes yet)**: design a migration/adapter that maps extraction outputs into `tbl_operating_expenses` by resolving category_name→category_id/account_id (using `OPEX_ACCOUNT_MAPPING` or `core_unit_cost_category.account_number`); backfill existing `tbl_operating_expense` rows for project 42 (and others) into the plural table, then retire singular reads/writes (project_context summary, extraction writer targets, extraction prompts) to the plural table so UI/calc and ingestion share one source.
