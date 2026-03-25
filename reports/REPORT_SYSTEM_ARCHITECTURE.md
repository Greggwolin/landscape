# Report System Architecture

**Date:** March 24, 2026
**Purpose:** Architecture spec for the DB-driven report system, bridging JW22 design with QT report specs and existing Django/React infrastructure.
**Status:** Design complete — ready for CC prompt series

---

## 1.0 WHAT EXISTS TODAY

### 1.1 Django Backend (`backend/apps/reports/`)

| Component | Status | Notes |
|-----------|--------|-------|
| `ReportTemplate` model | Working | CRUD, tab assignment, sections, output format |
| `ReportViewSet` | Working | Calculation endpoints (income, expenses, NOI, cash flow) |
| `ReportTemplateViewSet` | Working | Full CRUD + toggle_active + for-tab + generate |
| `LoanBudgetPDFReport` generator | Complete | Professional styling, 3 tables, ReportLab |
| `PropertySummaryReport` generator | Partial | Structure exists, placeholder content |
| `CashFlowReport` generator | Partial | Structure exists, placeholder content |
| `RentRollReport` generator | Partial | Structure exists, placeholder content |
| `MultifamilyCalculator` | Working | GSR, vacancy, EGI, OpEx, NOI, cash flow |
| `MetricsCalculator` | Working | Cap rate, GRM |

### 1.2 React Frontend

| Component | Status | Notes |
|-----------|--------|-------|
| `ReportsTab.tsx` | Stub | 3 CCCards: Audit (Rent Schedule only), Debt (LoanBudget), Summaries (coming soon) |
| `useReports.ts` | Working | React Query hooks for all template CRUD + generate |
| `RentScheduleReport.tsx` | Working | Functional rent roll grid |
| `LoanBudgetReport.tsx` | Working | 3 tables + export buttons |
| `PropertySummaryView.tsx` | Broken | Hardcoded to project 17, wrong env var |
| `ReportConfiguratorPanel.tsx` | Working | Admin CRUD for templates |
| `ReportTemplateCard.tsx` | Working | Card display for templates |
| `ReportTemplateEditorModal.tsx` | Working | Create/edit modal |

### 1.3 What's Missing

1. **Property-type awareness** — No `property_types` field on ReportTemplate
2. **Report definitions** — No catalog of "what reports exist" separate from "how to render them"
3. **Report categories** — No grouping (Executive, Cash Flow, Budget, etc.)
4. **Report browser UI** — No catalog/picker, just hardcoded CCCards
5. **Land Dev calculators** — MF calculator exists, nothing for LAND
6. **16 more generators** — Only 4 of 20 reports have any generator code
7. **Property-type routing** — ReportsTab shows same content for all project types
8. **Report history** — No tracking of generated reports

---

## 2.0 DATABASE CHANGES

### 2.1 New Table: `tbl_report_definition`

The report *catalog* — defines what reports exist and which project types can see them. Separate from `report_templates` which defines *how* to render.

```sql
CREATE TABLE landscape.tbl_report_definition (
  id BIGSERIAL PRIMARY KEY,
  report_code VARCHAR(50) UNIQUE NOT NULL,       -- 'RPT_01', 'RPT_02', etc.
  report_name VARCHAR(200) NOT NULL,              -- 'Sources & Uses'
  report_category VARCHAR(50) NOT NULL,           -- 'capital_structure', 'operations', etc.
  property_types TEXT[] NOT NULL DEFAULT '{}',     -- '{LAND,MF,OFF,RET,IND,HTL,MXU}'
  report_tier VARCHAR(20) NOT NULL DEFAULT 'essential', -- 'essential', 'advanced', 'premium'
  description TEXT,
  argus_equivalent VARCHAR(200),                  -- ARGUS report name for reference
  spec_file VARCHAR(100),                         -- 'RPT_01_SOURCES_AND_USES.md'
  data_readiness VARCHAR(20) DEFAULT 'not_ready', -- 'ready', 'partial', 'not_ready'
  generator_class VARCHAR(100),                   -- 'SourcesAndUsesReport'
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 Extend Existing `report_templates` Table

Add property-type awareness to existing model:

```sql
ALTER TABLE landscape.report_templates
  ADD COLUMN IF NOT EXISTS property_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS report_definition_id BIGINT REFERENCES landscape.tbl_report_definition(id),
  ADD COLUMN IF NOT EXISTS report_category VARCHAR(50);
```

### 2.3 New Table: `tbl_report_history`

Track generated reports per project/user:

```sql
CREATE TABLE landscape.tbl_report_history (
  id BIGSERIAL PRIMARY KEY,
  report_definition_id BIGINT REFERENCES landscape.tbl_report_definition(id),
  project_id BIGINT,
  parameters JSONB DEFAULT '{}',
  generated_at TIMESTAMP DEFAULT NOW(),
  export_format VARCHAR(20) DEFAULT 'html',       -- 'html', 'pdf', 'excel'
  file_path TEXT,
  generation_time_ms INTEGER
);
```

### 2.4 Seed Data: 20 Report Definitions

```sql
INSERT INTO landscape.tbl_report_definition (report_code, report_name, report_category, property_types, sort_order, argus_equivalent, spec_file, data_readiness) VALUES
-- Universal reports
('RPT_01', 'Sources & Uses',           'capital_structure', '{LAND,MF,OFF,RET,IND,HTL,MXU}', 10, 'Sources and Uses', 'RPT_01_SOURCES_AND_USES.md', 'partial'),
('RPT_02', 'Debt Summary',             'capital_structure', '{LAND,MF,OFF,RET,IND,HTL,MXU}', 20, 'Debt Service Audit', 'RPT_02_DEBT_SUMMARY.md', 'not_ready'),
('RPT_03', 'Loan Budget',              'capital_structure', '{LAND,MF,OFF,RET,IND,HTL,MXU}', 30, NULL, 'RPT_03_LOAN_BUDGET.md', 'partial'),
('RPT_04', 'Equity Waterfall',         'capital_structure', '{LAND,MF,OFF,RET,IND,HTL,MXU}', 40, 'Equity Distribution Waterfall', 'RPT_04_EQUITY_WATERFALL.md', 'partial'),
('RPT_05', 'Assumptions Summary',      'underwriting',      '{LAND,MF,OFF,RET,IND,HTL,MXU}', 50, 'Assumptions', 'RPT_05_ASSUMPTIONS_SUMMARY.md', 'not_ready'),
('RPT_06', 'Project Summary',          'executive',         '{LAND,MF,OFF,RET,IND,HTL,MXU}', 60, 'Executive Summary', 'RPT_06_PROJECT_SUMMARY.md', 'partial'),

-- MF / Income Property reports
('RPT_07', 'Rent Roll',                'property',          '{MF,OFF,RET,IND,HTL}',          70, 'Rent Roll', 'RPT_07_RENT_ROLL.md', 'ready'),
('RPT_08', 'Unit Mix',                 'property',          '{MF,HTL}',                       80, 'Area Analysis', 'RPT_08_UNIT_MIX.md', 'ready'),
('RPT_09', 'Operating Statement',      'operations',        '{MF,OFF,RET,IND,HTL}',          90, 'Income Statement', 'RPT_09_OPERATING_STATEMENT.md', 'ready'),
('RPT_10', 'Direct Capitalization',    'valuation',         '{MF,OFF,RET,IND,HTL}',         100, 'Capitalization Valuation', 'RPT_10_DIRECT_CAP.md', 'ready'),
('RPT_11', 'Sales Comparison',         'valuation',         '{MF,OFF,RET,IND,HTL,LAND}',    110, 'Comparable Properties', 'RPT_11_SALES_COMPARISON.md', 'ready'),
('RPT_12', 'Leveraged Cash Flow',      'cash_flow',         '{MF,OFF,RET,IND,HTL}',         120, 'Cash Flow', 'RPT_12_LEVERAGED_CF.md', 'partial'),
('RPT_13', 'DCF Returns',              'valuation',         '{MF,OFF,RET,IND,HTL}',         130, 'Detailed Valuation', 'RPT_13_DCF_RETURNS.md', 'partial'),

-- Land Development reports
('RPT_14', 'Parcel Table',             'property',          '{LAND}',                        140, NULL, 'RPT_14_PARCEL_TABLE.md', 'ready'),
('RPT_15', 'Budget Cost Summary',      'budget',            '{LAND}',                        150, 'Budget Comparison', 'RPT_15_BUDGET_COST_SUMMARY.md', 'ready'),
('RPT_16', 'Sales Schedule',           'revenue',           '{LAND}',                        160, 'Absorption Schedule', 'RPT_16_SALES_SCHEDULE.md', 'partial'),
('RPT_17', 'Cash Flow — Monthly',      'cash_flow',         '{LAND}',                        170, 'Project Cash Flow', 'RPT_17_CASHFLOW_MONTHLY.md', 'partial'),
('RPT_18', 'Cash Flow — Annual',       'cash_flow',         '{LAND}',                        180, 'Stage Cash Flow', 'RPT_18_CASHFLOW_ANNUAL.md', 'partial'),
('RPT_19', 'Cash Flow — By Phase',     'cash_flow',         '{LAND}',                        190, 'Phase Cash Flow', 'RPT_19_CASHFLOW_BY_PHASE.md', 'partial'),
('RPT_20', 'Budget vs. Actual',        'budget',            '{LAND,MF,OFF,RET,IND,HTL,MXU}', 200, 'Budget Comparison', 'RPT_20_BUDGET_VS_ACTUAL.md', 'not_ready');
```

---

## 3.0 REPORT CATEGORIES

| Category Key | Display Name | Icon (CoreUI) | Reports |
|---|---|---|---|
| `executive` | Executive | `cil-chart-pie` | RPT_06 |
| `capital_structure` | Capital Structure | `cil-building` | RPT_01, RPT_02, RPT_03, RPT_04 |
| `underwriting` | Underwriting | `cil-settings` | RPT_05 |
| `property` | Property | `cil-home` | RPT_07, RPT_08, RPT_14 |
| `operations` | Operations | `cil-spreadsheet` | RPT_09 |
| `valuation` | Valuation | `cil-calculator` | RPT_10, RPT_11, RPT_13 |
| `cash_flow` | Cash Flow | `cil-chart-line` | RPT_12, RPT_17, RPT_18, RPT_19 |
| `budget` | Budget | `cil-dollar` | RPT_15, RPT_20 |
| `revenue` | Revenue | `cil-cash` | RPT_16 |

---

## 4.0 PROPERTY-TYPE ROUTING

### 4.1 Report Visibility by Project Type

| Report | LAND | MF | OFF | RET | IND | HTL | MXU |
|--------|------|----|-----|-----|-----|-----|-----|
| RPT_01 Sources & Uses | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| RPT_02 Debt Summary | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| RPT_03 Loan Budget | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| RPT_04 Equity Waterfall | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| RPT_05 Assumptions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| RPT_06 Project Summary | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| RPT_07 Rent Roll | | ✓ | ✓ | ✓ | ✓ | ✓ | |
| RPT_08 Unit Mix | | ✓ | | | | ✓ | |
| RPT_09 Operating Statement | | ✓ | ✓ | ✓ | ✓ | ✓ | |
| RPT_10 Direct Cap | | ✓ | ✓ | ✓ | ✓ | ✓ | |
| RPT_11 Sales Comparison | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| RPT_12 Leveraged CF | | ✓ | ✓ | ✓ | ✓ | ✓ | |
| RPT_13 DCF Returns | | ✓ | ✓ | ✓ | ✓ | ✓ | |
| RPT_14 Parcel Table | ✓ | | | | | | |
| RPT_15 Budget Cost Summary | ✓ | | | | | | |
| RPT_16 Sales Schedule | ✓ | | | | | | |
| RPT_17 CF Monthly | ✓ | | | | | | |
| RPT_18 CF Annual | ✓ | | | | | | |
| RPT_19 CF By Phase | ✓ | | | | | | |
| RPT_20 Budget vs Actual | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 4.2 Effective Report Count by Type

| Project Type | Universal | Type-Specific | Total |
|---|---|---|---|
| LAND | 6 | 7 (RPT_11 + RPT_14–19) | 13 |
| MF | 6 | 8 (RPT_07–13, RPT_20) | 14 |
| OFF/RET/IND | 6 | 6 (RPT_07, 09–13) | 12 |
| HTL | 6 | 7 (RPT_07–13) | 13 |
| MXU | 6 | 1 (RPT_20) | 7 |

---

## 5.0 REACT COMPONENT ARCHITECTURE

### 5.1 New Component Tree

```
ReportsTab.tsx (REWRITE)
├── ReportBrowser.tsx (NEW — catalog grid with category grouping)
│   ├── ReportCategorySection.tsx (NEW — collapsible category group)
│   │   └── ReportCard.tsx (NEW — individual report tile)
│   └── ReportFilterBar.tsx (NEW — category/status filters)
├── ReportViewer.tsx (NEW — renders selected report)
│   ├── ReportHeader.tsx (NEW — title, params, export buttons)
│   ├── ReportContent.tsx (NEW — HTML table rendering)
│   └── ReportExportBar.tsx (NEW — PDF/Excel/Print actions)
└── ReportParameterForm.tsx (NEW — date range, container filter, etc.)
```

### 5.2 Layout

Two-panel layout within the Reports folder:

```
┌──────────────────────────────────────────────────────────────────┐
│ Reports                                              [Filter ▼] │
├───────────────────────┬──────────────────────────────────────────┤
│ Report Catalog        │ Report Viewer                            │
│ (left, 320px)         │ (right, fluid)                           │
│                       │                                          │
│ ▼ Executive           │ ┌──────────────────────────────────────┐ │
│   □ Project Summary   │ │ Project Summary                      │ │
│                       │ │ Peoria Meadows (Land Dev)             │ │
│ ▼ Capital Structure   │ │                                      │ │
│   □ Sources & Uses    │ │ [PDF] [Excel] [Print]                │ │
│   □ Debt Summary      │ │                                      │ │
│   □ Loan Budget       │ │ ┌────────────────────────────────┐   │ │
│   □ Equity Waterfall  │ │ │  Report content renders here   │   │ │
│                       │ │ │  (HTML tables, charts, etc.)   │   │ │
│ ▼ Property            │ │ └────────────────────────────────┘   │ │
│   □ Parcel Table      │ └──────────────────────────────────────┘ │
│                       │                                          │
│ ▼ Budget              │                                          │
│   □ Budget Cost Summ  │                                          │
│   □ Budget vs Actual  │                                          │
│                       │                                          │
│ ▼ Revenue             │                                          │
│   □ Sales Schedule    │                                          │
│                       │                                          │
│ ▼ Cash Flow           │                                          │
│   □ CF — Monthly      │                                          │
│   □ CF — Annual       │                                          │
│   □ CF — By Phase     │                                          │
└───────────────────────┴──────────────────────────────────────────┘
```

### 5.3 New Hooks

```typescript
// Fetch report definitions filtered by project type
useReportDefinitions(projectTypeCode: string): ReportDefinition[]

// Generate report data (HTML preview)
useReportPreview(reportCode: string, projectId: number, params?: ReportParams): ReportData

// Generate report export (PDF/Excel blob)
useReportExport(reportCode: string, projectId: number, format: 'pdf' | 'excel'): Blob
```

---

## 6.0 API EXTENSIONS

### 6.1 New Django Endpoints

```
GET  /api/reports/definitions/
     ?property_type=LAND
     &category=cash_flow
     &is_active=true
     → Returns report catalog filtered by project type

GET  /api/reports/definitions/{report_code}/
     → Single report definition with metadata

GET  /api/reports/preview/{report_code}/{project_id}/
     ?start_date=2025-01-01
     &end_date=2025-12-31
     &container_ids=1,2,3
     → Returns JSON report data for HTML rendering

POST /api/reports/export/{report_code}/{project_id}/
     Body: { format: 'pdf', parameters: {...} }
     → Returns PDF or Excel blob

GET  /api/reports/history/{project_id}/
     → Returns list of previously generated reports
```

### 6.2 New Django Model: `ReportDefinition`

```python
class ReportDefinition(models.Model):
    report_code = models.CharField(max_length=50, unique=True)
    report_name = models.CharField(max_length=200)
    report_category = models.CharField(max_length=50)
    property_types = ArrayField(models.CharField(max_length=10), default=list)
    report_tier = models.CharField(max_length=20, default='essential')
    description = models.TextField(blank=True)
    argus_equivalent = models.CharField(max_length=200, blank=True)
    spec_file = models.CharField(max_length=100, blank=True)
    data_readiness = models.CharField(max_length=20, default='not_ready')
    generator_class = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'tbl_report_definition'
        ordering = ['sort_order']
```

---

## 7.0 CC PROMPT SERIES

| Prompt | Scope | Dependencies |
|--------|-------|-------------|
| CC-RPT-01 | DB migration + Django models + seed data | None |
| CC-RPT-02 | Django API endpoints (definitions, preview, export, history) | CC-RPT-01 |
| CC-RPT-03 | Report browser UI + property-type routing (ReportsTab rewrite) | CC-RPT-01, CC-RPT-02 |
| CC-RPT-04 | MF report generators (RPT_07–13 + RPT_01–06 MF variants) | CC-RPT-02 |
| CC-RPT-05 | Land Dev report generators (RPT_14–19 + RPT_01–06 LAND variants) | CC-RPT-02 |

### 7.1 Execution Order

CC-RPT-01 → CC-RPT-02 → CC-RPT-03 (can run in parallel with 04/05) → CC-RPT-04 + CC-RPT-05 (can run in parallel)

---

## 8.0 EXPORT STRATEGY

### 8.1 Phase 1 (Alpha): HTML Preview + PDF

All 20 reports render as HTML tables in the ReportViewer. PDF export via ReportLab (existing infrastructure).

### 8.2 Phase 2: Excel Export

Use openpyxl (already in Django ecosystem) for Excel export with formatting preserved. Leverage SCREEN_EXPORT_INVENTORY.md for grid-level exports.

### 8.3 Phase 3: Print Packages

Bundle multiple reports into single PDF. Drill-down navigation (ARGUS-style hyperlinks). AI-generated narrative sections.

---

## 9.0 DOWNSTREAM IMPACT

### 9.1 Files Modified

| File | Change | Risk |
|------|--------|------|
| `ReportsTab.tsx` | Full rewrite | HIGH — existing Loan Budget/Rent Schedule must still work |
| `useReports.ts` | Extend with new hooks | MEDIUM — existing hooks must not break |
| `backend/apps/reports/models.py` | Add ReportDefinition model | LOW — additive only |
| `backend/apps/reports/views.py` | Add new viewsets | LOW — additive |
| `backend/apps/reports/urls.py` | Add new routes | LOW — additive |
| `folderTabConfig.ts` | May need sub-tabs for Reports | MEDIUM — affects navigation |

### 9.2 Preserved Behavior

The following MUST continue to work after changes:
1. LoanBudgetReport PDF generation (fully functional today)
2. RentScheduleReport grid rendering
3. Report template CRUD via admin panel
4. `useReportTemplatesForTab` hook (used by Export buttons on other tabs)

---

*Architecture spec v1.0 — March 24, 2026*
