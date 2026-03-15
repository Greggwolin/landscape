# Screen Export Inventory

**Date:** March 14, 2026
**Purpose:** Identify all grid/table components that should support lightweight "Export to Excel" screen-level export.

---

| # | Tab / View | Grid Component | Library | Project Type | Rows (Est.) | Export Priority |
|---|-----------|----------------|---------|-------------|-------------|-----------------|
| 1 | Property > Rent Roll | Detailed Rent Roll | HTML table (configurable columns) | MF | 113 units | HIGH |
| 2 | Property > Parcels > Parcel Detail Table | Parcel inventory grid | HTML table | Land Dev | 42 parcels | HIGH |
| 3 | Property > Parcels > Phases | Phase summary table | HTML table | Land Dev | 8 phases | MEDIUM |
| 4 | Property > Market (Land Dev) | SFD Pricing comp sales | HTML table | Land Dev | 178 comps | MEDIUM |
| 5 | Property > Market (MF) | Competitive Rental Supply | HTML table | MF | 7 properties | LOW |
| 6 | Property > Property Details | Floor Plan Matrix | HTML table | MF | 5 plans | LOW |
| 7 | Property > Acquisition | Acquisition Ledger | HTML table | Both | Variable | LOW |
| 8 | Operations > Operating Statement | Revenue + Expense P&L | HTML table (drag-to-recategorize) | MF | ~30 line items | HIGH |
| 9 | Development > Budget | Budget grid | TanStack Table | Land Dev | 50+ items | HIGH |
| 10 | Development > Sales | Areas and Phases cards | Card layout (not tabular) | Land Dev | N/A | N/A — not a grid |
| 11 | Feasibility > Cash Flow | Cash flow time series | HTML table | Land Dev | ~10 rows x 96 periods | HIGH |
| 12 | Capitalization > Debt | Loans list | HTML table | Land Dev | Variable (0 currently) | MEDIUM |
| 13 | Capitalization > Debt | Cash Flow - Leveraged | HTML table | Land Dev | ~5 rows x years | MEDIUM |
| 14 | Capitalization > Equity | Equity Contributions | HTML table | Land Dev | 2 rows | LOW |
| 15 | Capitalization > Equity | IRR Waterfall tiers | HTML table | Land Dev | 3 tiers | LOW |
| 16 | Valuation > Sales Comparison | Comparable Sales grid | HTML table | MF | 3-10 comps | MEDIUM |
| 17 | Valuation > Cost Approach | Land Value comp grid | HTML table | MF | 2-5 comps | MEDIUM |
| 18 | Valuation > Income Approach | Year 1 Pro Forma P&L | HTML table | MF | ~30 line items | HIGH |
| 19 | Valuation > Reconciliation | Reconciliation of Value | HTML table | MF | 3-4 approaches | LOW |

---

## Notes

1. **Existing Export buttons observed:**
   - Parcels > Planning Overview: "Export Report" dropdown
   - Development > Sales > Areas and Phases: "Export Report" dropdown
   - Feasibility > Cash Flow: "Export Report" dropdown
   - Capitalization > Debt: "Export Report" dropdown

2. **Priority rationale:** HIGH = frequently referenced data tables that users would commonly want in Excel (rent roll, budget, cash flow, operating statement). MEDIUM = useful but less frequent. LOW = small tables or summary views.

3. **Grid library distribution:** Most grids are plain HTML tables. Only the Budget grid uses TanStack Table. AG-Grid is used for the Rent Roll in some configurations but renders as HTML table in current build.

4. **Card-based layouts (not exportable as-is):** Development > Sales (Village/Phase cards), Capitalization > Equity (contribution summary). These would need to be restructured into tabular format for export.
