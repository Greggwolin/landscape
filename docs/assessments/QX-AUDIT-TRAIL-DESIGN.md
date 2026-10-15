# QX — The Deal Ledger: audit trail and provenance for every figure

**SUPERSEDED 2026-10-14 (same day) by `QX-CALCULATION-AUDIT-DESIGN.md` — Gregg's audit is of calculations, not changes. The change ledger becomes a later layer (§3.6 there). The schema audit in §2 below remains valid and is referenced from the new paper.**

**Status:** design, 2026-10-14. Not built. Plain-English companion: `QX-Audit-Trail-Design-2026-10-14.html` (same folder).
**Author:** Cowork, chat QX. **Owner of the decisions in §7:** Gregg.
**Supersedes:** nothing; the 2026-08 "evidence" columns on the budget and the Landscaper mutation log stay and are absorbed (§3).

---

## 1. What this is

One append-only record, per project, of every change to any value that feeds the model, with: what changed (table, record, field), old → new, who (user, or Landscaper on whose confirmation), when, why (free text or the chat message that caused it), and where from (document + page/cell, extraction run, formula, manual entry, or another party's version). Every figure on every screen, artifact and report can open its chain. Reports and exports pin a ledger position, so a number handed to a lender can be reproduced later exactly as it was shown.

Why it is the novelty: the free tools and the general assistants can calculate; none of them can say *where this number came from, who changed it, and what it was before*, across every party on the deal. That is the claim the positioning memo rests on (docs/assessments/SaaS_Model_and_Landscape_Positioning_2026-10-14.html) and the gap the walk-through found (item 3).

## 2. Schema audit (§17.7 — read before designing)

Production, `land_v2`, branch `br-empty-bird-afja3edo`, queried 2026-10-14 ~16:20 Phoenix.

| What exists | State | Keep / absorb |
|---|---|---|
| `landscape.mutation_audit_log` (18 cols: mutation_type, table_name, field_name, record_id, old_value, new_value, action ∈ {proposed, confirmed, rejected, failed}, reason, source_message_id, source_documents, initiated_by, confirmed_by, source_type ∈ {user_manual, override_toggle}, created_at) | 206 rows, last 2026-09-30 | **Absorb.** This is already a ledger row for Landscaper-made changes. It becomes one `source_kind` of the ledger. |
| `core_fin_fact_budget.value_source`, `confidence_level`, `confidence_code`, `document_count` | columns exist; all null on project 9 ("No evidence source is recorded on any budget line yet") | **Absorb.** Provenance becomes a ledger entry, not a column the writer may forget. The columns remain as a denormalised cache of the latest ledger entry. |
| `extraction_commit_snapshot` (scope, snapshot_data, changes_applied, is_active, rolled_back_at, committed_by, doc_id) | 17 rows | **Absorb.** A commit is a batch of ledger entries with `source_kind = extraction` and `doc_id`; its rollback is a reversing batch. |
| `core_fin_budget_version` (name, as_of, status) | 1 row | **Keep**; a version becomes a named ledger position (§3.4). |
| `tbl_assumption_history` (22 cols incl. source_type, source_reference, confidence_score, original_value, embedding) | 0 rows | **Retire into the ledger**; it was the same idea, never written to. |
| `tbl_assumption_snapshot` / `tbl_scenario_log` | 0 / ? rows | **Keep** for scenario what-ifs (a what-if is not a change to the record and does not enter the ledger). |
| `tbl_artifact_version`, `tbl_report_history`, `tbl_narrative_version` | exist | **Keep**; each gains a `ledger_seq` pin (§3.4). |
| Direct screen edits (parcel table double-click, budget grid, assumptions forms, pricing register, loans) | **no record at all** beyond `updated_at` on 230 of 378 tables; `updated_by` on only 21; one audit trigger in the schema | **This is the hole.** The screens write straight to the tables. |
| `pending_mutations` (24 cols) | live | Keep; proposals are not ledger rows until confirmed (the confirmation is). |

Plain-English summary: Landscaper's own changes are already logged, document extractions are logged as batches, and the budget has empty slots for a source. Everything a person types into a screen is unlogged, and nothing joins the three logs together or lets a number on a report point back at them.

## 3. Design

### 3.1 One table

`landscape.ledger` (append-only; no UPDATE/DELETE grants to the app role; a correction is a new row that points at the row it corrects).

| column | type | notes |
|---|---|---|
| `seq` | bigserial PK | the ledger position; monotonic per database, which is what reports pin |
| `project_id` | bigint FK | |
| `batch_id` | uuid | rows written by one action share it (an extraction commit, a Landscaper confirmation that touched six lines, a paste of a pricing table) |
| `table_name`, `record_id`, `field_name` | text | what changed; `record_id` text to cover uuid and bigint keys |
| `old_value`, `new_value` | jsonb | typed, not stringified |
| `actor_kind` | enum: `user`, `landscaper`, `extraction`, `system`, `party` | |
| `actor_id` | text | user id; for `party`, the counterparty version id (§3.5) |
| `confirmed_by` | text null | user who confirmed a Landscaper proposal |
| `source_kind` | enum: `manual`, `document`, `chat`, `extraction`, `formula`, `import`, `rollback`, `version_apply` | |
| `source_ref` | jsonb | `{doc_id, page, bbox|cell}` for documents; `{thread_id, message_id}` for chat; `{run_id}` for extraction; `{seq}` for rollback/version |
| `reason` | text null | the free-text "why", or the chat sentence that caused it |
| `confidence` | numeric null | from extraction; null for a human entry |
| `corrects_seq` | bigint null | this row corrects an earlier one (never edit the earlier one) |
| `created_at` | timestamptz default now() | |

Indexes: `(project_id, seq)`, `(project_id, table_name, record_id, field_name, seq desc)`, `(batch_id)`.

### 3.2 How rows get written — the choke point

Not triggers on 378 tables and not per-screen code. One write path:

- All application writes to the model tables already go through either the Django REST views (screens), the Landscaper tool executor (`ALLOWED_UPDATES`), or the extraction committer. Each of these gets one call: `ledger.record(project_id, batch, [changes], actor, source)`.
- The REST views are the gap today. A DRF mixin on the ~17 writable viewsets (parcels, divisions, budget, pricing, absorption, loans, assumptions, operating lines, rent roll, sales) captures the pre-image in `perform_update`/`perform_create`/`perform_destroy` and writes the diff. Pre-image = the row as read inside the same transaction, so old_value is exact.
- Raw SQL writers (management commands, the project cloner, scripts) call `ledger.record` explicitly or run under a `ledger_batch(actor='system', reason=...)` context manager that records their diffs from a row snapshot. A write path that bypasses both is a defect; a nightly check lists rows whose `updated_at` moved with no ledger row in the same minute (§6).
- `mutation_audit_log` keeps being written by the Landscaper path during transition, and a view maps it into the ledger shape; once the ledger has every confirmed mutation, the old table is read-only history.

### 3.3 The chain behind a figure

A figure on a screen is a (table, record, field). A *derived* figure (an IRR, a subtotal, a cash-flow cell) is a function of many of them. The service `ledger.chain(project_id, ref)` returns:

1. For a stored field: its ledger rows newest-first, each with actor, source, reason, old → new, and (for a document source) the page or cell it came from.
2. For a derived figure: the list of stored fields it depends on, each with its *latest* ledger row, plus the formula name and the engine version. The dependency list is already known to the engines that compute these figures (the cash-flow service, `calculate_project_metrics`, the waterfall); each exposes `inputs()` for the figure it just produced. Where an engine cannot yet enumerate inputs, the chain says so rather than guessing (§6, no invented provenance).

This is what the "Evidence" toggle on the budget, the "where does this number come from" question to Landscaper, and the click on any figure all call.

### 3.4 Pins: versions, reports and exports

- A **named version** is a row in a `ledger_version(project_id, name, seq, created_by, note)` table (generalising `core_fin_budget_version` to the project). "Lender package, Oct 14" = "the model as of seq 48,210". Reconstructing the model at a seq = replaying the ledger backwards from the current state (old_value), which is cheap because the ledger carries old values.
- Every report, export and printed artifact stamps `as_of_seq` in its header and its stored history row. Two people holding two printouts can tell whether they are the same model.
- A what-if (scenario) runs against a seq and overrides; it never writes the ledger. "Apply this scenario" writes a batch with `source_kind = version_apply`.

### 3.5 Parties (the Meyers story)

A party is a named participant on the project with a role (owner, JV partner, lender, appraiser) and its own **working version**: a branch of overrides over the shared ledger, stored as ledger rows with `actor_kind = party` in a party-scoped batch that the shared model does not see until merged. The shared model shows, per field, "yours / theirs / agreed" when a party's working value differs. A merge is a batch written by the owner with `reason` and both prior values in `source_ref`. The point is one record that every party can read and no party can silently alter: the ledger is the referee.

This is the piece that needs product decisions before build (§7.3) and is the last slice, not the first.

### 3.6 What the user sees (plain-English companion has the pictures)

1. **On any figure:** a small `ⓘ` on hover; click opens a side sheet "Where this number comes from": the chain, newest first, with the document page thumbnail where there is one.
2. **Budget / pricing / parcels Evidence toggle:** no longer empty; each line shows its source chip (Doc · p.12 / Entered by Gregg · Oct 2 / Landscaper · confirmed Oct 3 / Formula) and clicking the chip opens the sheet.
3. **Project home → Activity:** the ledger as a feed: "Oct 14 · Gregg · Parcels · 1.101 lot size 50×125 → 40×120 · 'per revised tentative map'". Filter by actor, table, date, document.
4. **Report header:** "Model as of #48,210 · 2026-10-14 16:05 · 3 changes since the Lender package". A button "pin this as a version".
5. **Landscaper answers** carry the seq they were computed from ("as of #48,210"), and "what changed since the lender package?" is answerable from the ledger alone.

## 4. Build sequence (each slice ships on its own; Gregg runs each locally first, §4.10)

| # | Slice | What Gregg sees | Risk |
|---|---|---|---|
| 1 | Ledger table + `ledger.record` + the Landscaper path writes to it (alongside the old log) | Nothing yet; verification is a DB query | Low |
| 2 | DRF mixin on the writable viewsets; pre-image capture | Project home Activity feed appears, populated by his own edits | Medium (touches every writable screen; §17.3 zones) |
| 3 | Extraction commits write batches; `value_source` columns become a cache of the latest row | Budget Evidence toggle stops saying "no evidence" on newly extracted lines | Medium |
| 4 | `ledger.chain` for stored fields + the `ⓘ` sheet on parcel, budget, pricing, assumption figures | "Where does this come from" works on every entered number | Medium |
| 5 | Report/artifact `as_of_seq` pins + named versions + "changes since" | Reports carry the stamp; "pin as version" | Low |
| 6 | Derived-figure chains from the engines' `inputs()` | `ⓘ` on IRR, NPV, cash-flow cells | High (six IRR implementations; see project_irr_duplication) |
| 7 | Parties and working versions | Yours / theirs / agreed | High; decisions in §7.3 first |

Slices 1–4 are the demo-worthy unit: after them, every number Gregg types in a demo has a chain, and the Peoria budget's "no evidence" line is replaced by "Entered by Gregg, Nov 19 2025" for the existing rows (back-filled from `created_at` as one `source_kind = import` batch, marked as such, never as a document).

## 5. Downstream impact (§17)

- Writable viewsets: parcels/divisions, budget (`core_fin_fact_budget`, HIGH-RISK), pricing, absorption, loans, assumptions, operating expenses (`statement_discriminator`), rent roll, sales. The mixin adds one read + one insert per write inside the same transaction; a failed ledger write must fail the business write (never a silent partial).
- Landscaper tools: the executor already writes `mutation_audit_log`; it gains the ledger call. `ALLOWED_UPDATES` untouched.
- Extraction committer: `extraction_commit_snapshot` keeps its rollback; rollback becomes a reversing batch as well.
- Reports: header stamp only; no numeric change.
- Performance: one insert per field change; the budget grid's bulk save of 24 lines = 24 rows in one batch. Fine.
- Schema-only preview DBs (project_preview_env_no_data): the migration must apply cleanly on an empty schema.

## 6. What keeps it honest

- Append-only is enforced by grants, not convention.
- No provenance is ever inferred: a row with no source is `manual` with the user id, and a back-filled row is `import` with the back-fill date. "Document p.12" appears only when the extraction run recorded that page.
- Nightly check: any row in a ledgered table whose `updated_at` is newer than its latest ledger row by more than a minute is listed as a bypass, with the table and record. Reported in the daily brief until zero.
- A derived figure whose engine cannot list its inputs says "inputs not enumerated by this engine" rather than showing a partial chain as complete.

## 7. Decisions for Gregg (plain-English companion asks these the same way)

7.1 Scope of slices 1–4: 1a every writable screen in the land lane only (parcels, budget, pricing, absorption, loans, assumptions) · 1b every writable screen in the app.
7.2 Back-fill: 2a mark every existing value "imported before the ledger, date = created_at" · 2b leave existing values with no chain until next touched.
7.3 Parties (slice 7), held until 1–4 ship: who can create a party; whether a party sees the shared model live or a pinned version; whether a lender's version can be edited by the lender at all or only commented.
7.4 Retention: 4a forever · 4b forever for pinned versions, 24 months for unpinned detail.

## 8. Not in this design

Row-level security between parties (depends on 7.3); signatures / notarisation of a version (could sit on top: hash of the state at a seq); undo buttons on screens (the ledger makes them possible; they are a separate slice); showing the chain for market data (that has its own revision table in `public.market_data_revision` and can join later).
