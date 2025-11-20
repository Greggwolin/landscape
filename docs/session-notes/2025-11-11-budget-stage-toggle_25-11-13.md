## 2025-11-11 — Land Dev Budget UI polish

- Added a Project Level filter tile to the Villages / Phases accordion (per-project state stored in localStorage). The tile now drives whether container-less budget items appear in the grid and shows a live badge count sourced from the current dataset.
- Grouped view gains an Add Item action on expanded category rows. The action carries the group’s stage/category path and the current container filter context into the modal so new lines drop into the right scope immediately.
- Napkin mode now exposes persistent Add/Delete icon buttons on every row. Add re-opens the modal with the row’s structural context while Delete uses the existing API behind a confirm dialog.
- BudgetItemModalV2 now uses a Stage ➜ Category workflow backed by cached stage/category data, reshuffles the top row layout, enforces the spec’d widths, and moves Standard/Detail-only fields into a CoreUI accordion. Stage changes auto-filter downstream categories while Level 3/4 picks live inside the Standard panel.
- Standard fields picked up vendor, timing method, escalation, contingency, and the timeline inputs; Detail picked up start/end dates plus funding/curve/milestone IDs and the cash-flow flag. Stage and container defaults can be injected when opening the modal so Napkin/Group actions feel contextual.
