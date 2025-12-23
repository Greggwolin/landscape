# Landscape Partial Feature Gap Report
**Generated:** 2025-12-09  
**Codebase Version:** b49b40ab74a7c0b1d8c4f400a6c62dca7e6ea8c3

Scope: Only pages/tabs marked “Partial” in the main status report. Focused on what’s missing or incomplete.

## Summary Table
| Area / Page | What’s Missing / Incomplete |
|-------------|-----------------------------|
| Navigation & Layout | Mode toggle is route-only (no shared state/guard); mobile responsiveness unreliable on several forms/pages. |
| Project Management | Settings/config UIs uneven; no confirmed project delete flow. |
| Napkin Mode | Property tab not fully validated; Landscaper panel UX uncertain; no explicit cross-mode state parity/offline strategy. |
| Standard: Home/Overview | Content mixes real/mocked data; lacks clear completeness signals. |
| Standard: Sales | Exports/history absent; bulk parcel ops and historical tracking pending. |
| Standard: Valuation | Calculation engines locked/pending; tabs mostly UI without wired computation/export. |
| Market Intelligence | Dashboard UX thin; Zonda/HBACA ingestion not surfaced in UI; demographic/comp displays unclear. |
| GIS/Mapping | County data coverage unknown; no advanced spatial analysis tooling. |
| AI/Landscaper | Chat UX not confirmed end-to-end; assumption suggestions not fully surfaced; project-from-chat missing (tracked as “Missing” in main report). |
| Financial Features | Variance UI flicker; no versioning/actuals; cashflow/IRR/NPV engines absent; reporting/export gaps. |
| Document Management | Linking/relationship UX limited; richer previews absent. |

## Details by Area

### Navigation & Layout (Partial)
- Mode toggle: route-based only; no global state enforcement or guard between Napkin/Standard.
- Responsive gaps: known mobile layout issues on Dashboard, Land Use, Parcel Detail (from dev-status notes).

### Project Management (Partial)
- Settings/config: granularity/settings endpoints exist but UI coverage is inconsistent.
- Deletion: no visible delete flow to remove projects.

### Napkin Mode (Partial)
- Property tab: components present but not fully verified against live data.
- Landscaper panel: referenced; end-to-end UX unclear.
- State parity: no explicit sync/offline strategy between Napkin and Standard modes.

### Standard Tabs
- Home/Overview (Partial): sections mix real/mocked content; lacks finalized data wiring and completeness indicators.
- Sales (Partial): exports/history not implemented; bulk parcel operations and historical sales tracking outstanding.
- Valuation (Partial): computation engines locked/pending; calculation/export not wired.

### Market Intelligence (Partial)
- UI surfaces: dashboard thin; ingested Zonda/HBACA data not exposed in app.
- Demographic/comp displays: unclear or incomplete; likely mocked/omitted.

### GIS/Mapping (Partial)
- County data: coverage unknown; needs verification.
- Spatial analysis: advanced tooling (buffers, overlaps, scoring) not exposed.

### AI/Landscaper (Partial)
- Chat: no confirmed end-to-end flow; may be stubbed.
- Assumption suggestions: benchmarks AI endpoint exists, but limited UI surfacing.
- Project from chat: not implemented (tracked as missing in main report but impacts completeness here).

### Financial Features (Partial aspects)
- Variance: UI flicker on hover (dev-status issue); needs stabilization.
- Versioning/actuals: absent; users can’t track versions or actuals.
- Cashflow/IRR/NPV: engines absent; valuation/finance tabs blocked.
- Reporting/export: no full reporting/exports from financial views.

### Document Management (Partial aspects)
- Linking/relationships: limited UI for linking documents to entities.
- Previews: richer preview/annotation not present.

## Immediate Next Steps to Move to “Working”
1) Stabilize mode toggle and mobile layouts (Dash/Land Use/Parcel detail).  
2) Wire Sales exports/history and bulk parcel ops; surface Zonda/HBACA data in a basic dashboard.  
3) Unlock Valuation with minimal calculation service or clearly hide it; fix variance flicker.  
4) Implement project delete flow and normalize settings/config UI.  
5) Add minimal Landscaper chat flow (send/receive) and surface benchmark suggestions in UI.  
6) Add document linking UI and basic previews.  
7) Verify GIS county coverage; add a simple spatial utility (e.g., parcel overlap check) or hide claims.  
