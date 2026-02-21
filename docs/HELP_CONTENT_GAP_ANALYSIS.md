# Help Content Gap Analysis

**Date:** 2026-02-16
**Scope:** Platform knowledge content for Landscape Help Landscaper (alpha_help domain)
**Methodology:** Codebase analysis of database schema, ingestion commands, help_handler.py system prompt, folderTabConfig.ts navigation structure, and component inventory

---

## 1. Current Platform Knowledge Inventory

### 1.1 Database Tables

The platform knowledge system uses three core tables:

| Table | Purpose |
|-------|---------|
| `tbl_platform_knowledge` | Parent document records (title, publisher, domain, ingestion status) |
| `tbl_platform_knowledge_chapters` | Chapter/section metadata with topics, property types, applies_to arrays |
| `tbl_platform_knowledge_chunks` | Chunked text content with pgvector embeddings for semantic retrieval |

Supporting tables: `tbl_knowledge_source` (canonical publisher registry), `opex_benchmark` (structured IREM/BOMA/NAA data).

### 1.2 Knowledge Domains

The `PlatformKnowledge.KnowledgeDomain` enum defines these categories:

| Domain Code | Label | Current Usage |
|-------------|-------|---------------|
| `alpha_help` | Alpha Help | Platform documentation for testers -- the target of this analysis |
| `valuation` | Valuation | Reference textbooks (Appraisal of Real Estate) |
| `operating_expenses` | Operating Expenses | IREM benchmark data |
| `valuation_methodology` | Valuation Methodology | Appraisal methodology content |
| `market_data` | Market Data | Market research documents |
| `cost_estimation` | Cost Estimation | Marshall & Swift, construction cost data |
| `legal_regulatory` | Legal/Regulatory | USPAP standards |
| `development` | Development | Land development references |
| `other` | Other | Catch-all |

### 1.3 Alpha Help Content Structure

Alpha help content uses `knowledge_domain = 'alpha_help'` and `category = 'alpha_docs'` on chunks.

**Section path format:** `{property_type}/{page_name}/{content_type}/{section_title}`

Examples:
- `MF/property/alpha_help/What You Can Do`
- `LAND_DEV/budget/alpha_help/Budget Grid Overview`
- `BOTH/general/deflection/Coming Soon Features`

**Property type codes in section_path:**
- `MF` -- Multifamily / income properties
- `LAND_DEV` -- Land development
- `BOTH` -- Applies to all property types

**Content type codes in section_path:**
- `alpha_help` -- Feature descriptions, what-you-can-do lists
- `deflection` -- Coming-soon features, not-yet-available items
- `tester_notes` -- Alpha tester focus areas, known limitations
- `landscaper_context` -- What the Landscaper AI can help with per page
- `technical` -- API, database, implementation details

### 1.4 Ingestion Pipeline

Two management commands exist for content ingestion:

1. **`ingest_platform_knowledge`** -- Ingests PDF reference documents (Appraisal of Real Estate, etc.) with chapter config JSON files. Uses pdfplumber for text extraction.

2. **`ingest_platform_docs`** -- Ingests Markdown documentation files. Designed specifically for alpha help content. Parses by `##` headers, auto-detects page_name, property_type, and content_type from header/body text. Generates embeddings via OpenAI ada-002.

### 1.5 Current Chunk Estimate

Based on the user's note: approximately **175 chunks** exist in `tbl_platform_knowledge_chunks` for the `alpha_help` domain. No source Markdown files were found in the repository tree under `reference/` or `docs/` that match alpha help content specifically, suggesting the source documents may have been ingested and then removed, or ingested from a location outside the repository.

### 1.6 Retrieval Architecture

The Help Landscaper retrieves content via two paths:

1. **Help Landscaper** (`help_handler.py`): Dedicated handler with `HELP_SYSTEM_PROMPT`. Queries `knowledge_domain = 'alpha_help'` with filters on `section_path` for property type (`MF/%`, `LAND_DEV/%`) and page context (`%/{page_name}/%`). Threshold: 0.55 similarity (broadens to 0.65 on empty results).

2. **Project Landscaper** (`ai_handler.py`): In-project AI. Detects platform usage questions via `_needs_alpha_help()` and injects `alpha_help_context` into the system prompt using the same retrieval mechanism.

---

## 2. Pages WITH Platform Knowledge Content (Likely)

Based on the ~175 chunks and the auto-detection patterns in `ingest_platform_docs.py`, these pages likely have some level of content:

### 2.1 Multifamily Pages (MF)

| Page | Folder > Tab | Likely Content Level | Evidence |
|------|-------------|---------------------|----------|
| Project Home | Home > (no subtab) | Minimal | Generic dashboard description |
| Property Details | Property > Details | Some | Keyword match on "details" |
| Rent Roll | Property > Rent Roll | Some | Keyword match on "rent roll", "units" |
| Market | Property > Market | Some | Keyword match on "market" |
| Operations | Operations > (unified P&L) | Some | Keyword matches on "operating statement", "rental income", "vacancy", "opex" |
| Income Approach | Valuation > Income Approach | Some | Keyword matches on "DCF", "direct cap" |
| Sales Comparison | Valuation > Sales Comparison | Minimal | Keyword match on "sales comparison" |
| Cost Approach | Valuation > Cost Approach | Minimal | Keyword match on "cost approach" |
| Documents | Documents > (no subtab) | Some | Keyword matches on "document management", "upload" |

### 2.2 Land Development Pages (LAND_DEV)

| Page | Folder > Tab | Likely Content Level | Evidence |
|------|-------------|---------------------|----------|
| Budget | Budget > Budget | Some | Keyword matches on "budget tab", "cost categories" |
| Sales | Budget > Sales | Minimal | Keyword match on "sales" overlaps with MF sales comparison |
| Feasibility | Feasibility > Cash Flow | Some | Keyword matches on "feasibility tab", "cash flow", "IRR" |
| Land Use | Property > Land Use | Some | Keyword matches on "land use", "product types" |
| Parcels | Property > Parcels | Minimal | Keyword match on "parcels" |

### 2.3 Shared Pages (BOTH)

| Page | Folder > Tab | Likely Content Level | Evidence |
|------|-------------|---------------------|----------|
| Landscaper AI | (panel on all pages) | Some | Keyword matches on "landscaper", "ai assistant" |
| General/Overview | N/A | Some | Keyword match on "general", "overview" |
| Benchmarks | (within Operations) | Minimal | Keyword match on "benchmarks", "growth rates" |

---

## 3. Pages with NO Content or Insufficient Content

### 3.1 Confirmed Zero-Content Pages

These pages have no matching detection patterns in `ingest_platform_docs.py` and are extremely unlikely to have any alpha_help chunks:

| Page | Folder > Tab | Property Type | Priority |
|------|-------------|--------------|----------|
| **Acquisition** | Property > Acquisition | BOTH | HIGH -- core workflow step for investment/value-add |
| **Renovation** | Property > Renovation | MF (value-add only) | MEDIUM -- visible only in VALUE_ADD mode |
| **Equity** | Capital > Equity | BOTH | HIGH -- waterfall distributions, equity structure |
| **Debt** | Capital > Debt | BOTH | HIGH -- loan terms, DSCR, leverage |
| **Reports > Summary** | Reports > Summary | BOTH | MEDIUM -- generated outputs |
| **Reports > Export** | Reports > Export | BOTH | LOW -- limited to browser print currently |
| **Map** | Map > (unified) | BOTH | MEDIUM -- GIS, demographics, location intelligence |
| **Sensitivity** | Feasibility > Sensitivity | LAND_DEV | LOW -- not yet implemented |
| **Returns** | Feasibility > Returns | LAND_DEV | MEDIUM -- IRR, equity multiples |

### 3.2 Pages with Likely Insufficient Content

These pages probably have a few chunks at best (1-3 generic paragraphs) but lack the depth needed for meaningful help:

| Page | Gap Description |
|------|----------------|
| **Project Home** | Missing: KPI tile explanations, activity feed usage, project setup guidance |
| **Market** | Missing: How to read market data, what demographics mean, how benchmarks flag outliers |
| **Sales Comparison** | Missing: How to add comps, adjustment methodology, how the grid works |
| **Cost Approach** | Missing: Marshall & Swift factors, depreciation types, when to use cost approach |
| **Parcels** | Missing: How to manage parcel inventory, phasing, product assignment |
| **Sales (Land Dev)** | Missing: Absorption schedule, pricing, revenue projections |

### 3.3 Pages Missing from Detection Patterns Entirely

The `PAGE_PATTERNS` dictionary in `ingest_platform_docs.py` does not include detection patterns for:

- `acquisition` (no patterns -- would need "acquisition tab", "purchase price", "closing costs")
- `renovation` (no patterns -- would need "renovation tab", "value-add improvements", "unit renovation")
- `equity` (folded into "capitalization" -- no dedicated equity patterns)
- `debt` (folded into "capitalization" -- no dedicated debt patterns)
- `returns` (folded into "feasibility" -- no dedicated returns patterns)
- `sensitivity` (folded into "feasibility" -- no dedicated sensitivity patterns)
- `map` (has pattern -- but content about GIS features is likely minimal)

---

## 4. Content Depth Assessment

### 4.1 Content Depth Levels

| Level | Description | Example |
|-------|-------------|---------|
| **Level 0: None** | No content exists | Acquisition tab |
| **Level 1: Navigation** | "What you can do" feature lists, basic tab descriptions | Most pages likely at this level |
| **Level 2: Task** | Step-by-step "how to" instructions with specific UI element references | Target for alpha |
| **Level 3: Calculation** | Formula explanations, input-to-output data flow, worked examples | Target for income approach |
| **Level 4: Expert** | ARGUS/Excel crosswalk, edge cases, professional workflow patterns | Post-alpha goal |

### 4.2 Per-Page Depth Assessment

#### Multifamily Income Property

| Page | Current Depth | Target Depth | Gap |
|------|:---:|:---:|-----|
| Project Home | 1 | 2 | Missing: project setup walkthrough, KPI explanations |
| Property > Details | 1 | 2 | Missing: field-by-field guide, what each input does |
| Property > Acquisition | 0 | 2 | **FULL GAP** -- purchase price, closing costs, transaction costs |
| Property > Market | 1 | 2 | Missing: market data interpretation, benchmark comparisons |
| Property > Rent Roll | 1 | 3 | Missing: how rent roll feeds Operations, unit type management, lease terms |
| Property > Renovation | 0 | 2 | **FULL GAP** -- value-add scope, renovation budgets, unit renovation tracking |
| Operations | 1 | 3 | Missing: line-by-line P&L explanation, NOI calculation, how it feeds Income Approach |
| Valuation > Sales Comparison | 1 | 3 | Missing: comp entry, adjustment methodology, reconciliation of comps |
| Valuation > Cost Approach | 1 | 3 | Missing: replacement cost new, depreciation methodology, land value |
| Valuation > Income Approach | 1 | 3 | Missing: DCF inputs, Direct Cap formula, NOI basis selection, cash flow grid |
| Capital > Equity | 0 | 2 | **FULL GAP** -- equity structure, waterfall, promote tiers |
| Capital > Debt | 0 | 2 | **FULL GAP** -- loan terms, amortization, DSCR, debt sizing |
| Reports > Summary | 0 | 2 | **FULL GAP** -- report contents, how to generate |
| Reports > Export | 0 | 1 | **FULL GAP** -- browser print instructions |
| Documents | 1 | 2 | Missing: upload workflow, AI extraction flow, tag management |
| Map | 0 | 2 | **FULL GAP** -- GIS features, basemap options, location intelligence |

#### Land Development

| Page | Current Depth | Target Depth | Gap |
|------|:---:|:---:|-----|
| Project Home | 1 | 2 | Same as MF |
| Property > Acquisition | 0 | 2 | **FULL GAP** |
| Property > Market | 1 | 2 | Missing: land-specific market data |
| Property > Land Use | 1 | 2 | Missing: taxonomy explanation, product type creation |
| Property > Parcels | 0-1 | 2 | Missing: parcel inventory management, phasing assignment |
| Budget > Budget | 1 | 3 | Missing: cost category hierarchy, line item entry, phase allocation |
| Budget > Sales | 0-1 | 3 | Missing: absorption schedule, pricing tiers, revenue projections |
| Feasibility > Cash Flow | 1 | 3 | Missing: projection methodology, S-curve timing, draw schedule |
| Feasibility > Returns | 0-1 | 3 | Missing: IRR calculation, NPV, equity multiple, residual land value |
| Feasibility > Sensitivity | 0 | 1 | **FULL GAP** -- not yet implemented (known limitation) |
| Capital > Equity | 0 | 2 | **FULL GAP** |
| Capital > Debt | 0 | 2 | **FULL GAP** |
| Reports | 0 | 2 | **FULL GAP** |
| Documents | 1 | 2 | Same as MF |
| Map | 0 | 2 | **FULL GAP** |

---

## 5. Missing Topic Categories

### 5.1 Step-by-Step Task Guides (Level 2 Content)

No evidence of structured step-by-step guides exists in the current ~175 chunks. Every page needs at minimum:

| Task Category | Example Tasks Needed |
|---------------|---------------------|
| **Getting Started** | "How to create a new multifamily project", "How to set project type and analysis type" |
| **Property Setup** | "How to enter property details", "How to import a rent roll", "How to add acquisition costs" |
| **Operations Entry** | "How to enter rental income", "How to add operating expenses", "How to set vacancy rates" |
| **Valuation Workflow** | "How to add a sales comp", "How to run a DCF analysis", "How to set cap rate assumptions" |
| **Document Upload** | "How to upload an OM", "How to trigger AI extraction", "How to review extracted data" |
| **Capital Structure** | "How to enter equity terms", "How to add a loan", "How to configure waterfall distributions" |
| **Reports** | "How to view a report summary", "How to export/print a report" |

### 5.2 Calculation Explanations (Level 3 Content)

The Help system prompt mentions calculations but the chunk content likely lacks formula-level explanations with input field locations.

| Calculation | Needed Content |
|-------------|---------------|
| **NOI** | Formula: EGI - OpEx = NOI. Where each input lives. Three NOI bases (F-12 Current/Market/Stabilized) and when to use each. |
| **Direct Capitalization** | Formula: Value = NOI / Cap Rate. Where to set cap rate. How NOI basis selection affects the result. |
| **DCF** | Monthly cash flow projection. Reversion calculation. Terminal cap rate. Discount rate. Where each input is in the Assumptions panel. |
| **Cap Rate** | Definition. Market cap rate vs going-in vs terminal. Where cap rates appear across the platform. |
| **IRR** | Definition. How it is calculated. What inputs drive it (cash flows, hold period, equity). |
| **DSCR** | Formula: NOI / Debt Service. Where loan terms feed in. Minimum DSCR thresholds. |
| **Residual Land Value** | For land dev: total revenue minus total costs minus profit margin. Where each component lives. |
| **Equity Multiple** | Definition. Total distributions / total equity invested. |
| **Waterfall Distribution** | Preferred return, promote tiers, catch-up provisions. How to configure in Capital tab. |
| **Vacancy & Credit Loss** | Physical vacancy vs economic vacancy. How the rate is applied. |
| **Expense Ratio** | OpEx as % of EGI. How benchmarks compare. |

### 5.3 Data Flow Descriptions

The Help system prompt contains a brief data flow section, but the chunks likely lack detailed "where data comes from and goes to" content per page.

| Data Flow | Needed Content |
|-----------|---------------|
| **Rent Roll to Operations** | How unit-level rents aggregate to Gross Potential Rent. How vacancy applies. |
| **Operations to Income Approach** | Which NOI line feeds DCF and Direct Cap. How to select NOI basis. |
| **Market Data to Assumptions** | How benchmark data validates user inputs. What flags as an outlier. |
| **Documents to Any Tab** | AI extraction pipeline: upload, classify, extract, review, apply. Which fields get populated. |
| **Budget to Feasibility** | How cost line items feed residual land value. Phase-level cost allocation. |
| **Sales Absorption to Cash Flow** | How lot pricing and absorption schedule create revenue projections. |
| **Acquisition to Returns** | How purchase price flows to equity requirements and return metrics. |

### 5.4 ARGUS Crosswalk Content

The Help system prompt contains a brief crosswalk section, but no deep mapping content exists in chunks.

| ARGUS Feature | Landscape Equivalent | Content Needed |
|---------------|---------------------|----------------|
| ARGUS Enterprise > Tenants | Property > Rent Roll | Field-level mapping, import differences |
| ARGUS Enterprise > Revenue & Expense | Operations (unified P&L) | How revenue/expense entry differs |
| ARGUS Enterprise > Cash Flow | Valuation > Income Approach > DCF | Projection methodology comparison |
| ARGUS Enterprise > Valuation | Valuation folder (3 approaches) | How three-approach valuation maps |
| ARGUS Developer > Construction | Budget > Budget | Cost category structure comparison |
| ARGUS Developer > Appraisal | Feasibility folder | Residual land value methodology |
| ARGUS Developer > Revenue > Unit Sales | Budget > Sales | Absorption schedule comparison |
| ARGUS Developer > Area definitions | Property > Land Use | Container hierarchy vs fixed tree |

### 5.5 Excel Crosswalk Content

| Excel Pattern | Landscape Equivalent | Content Needed |
|---------------|---------------------|----------------|
| "Tabs across the bottom" model | 8 folder tabs with subtabs | How the folder structure maps |
| Cell-reference formulas | Built-in calculation engine | What formulas are handled automatically |
| Manual copy-paste from OMs | Document upload + AI extraction | How extraction replaces manual entry |
| Quick feasibility sketch | Napkin complexity mode | How to use progressive complexity |
| Sensitivity tables | Sensitivity tab (land dev) / not yet available (MF) | Current state and workarounds |
| Version control via filenames | Scenario management | How scenarios replace versioned Excel files |

### 5.6 Troubleshooting / "Why does this not work" Content

No troubleshooting content was identified. Common user questions that need answers:

| Question Pattern | Content Needed |
|-----------------|---------------|
| "Why is my NOI zero?" | Check: is rent roll populated? Is vacancy set? Are expenses entered? |
| "Why can I not see the Operations tab?" | Tab visibility depends on project type and analysis type configuration |
| "Why is the DCF showing no cash flows?" | Check: hold period set? NOI populated? Growth rates configured? |
| "Where did my extracted data go?" | Extraction populates specific fields across multiple tabs |
| "Why is cap rate not calculating?" | Check: NOI must be non-zero, cap rate input must be set |
| "How do I switch between Napkin/Standard/Detail?" | Complexity mode selector location per page |
| "Why can I not see the Renovation tab?" | Requires value-add analysis type to be enabled |
| "Why are my benchmarks not showing?" | Benchmark data requires matching property type and market |

---

## 6. Recommendations -- Priority Order

### Priority 1: Core Workflow Pages (Immediate)

These 6 content packages close the most impactful gaps for alpha testers walking through the primary MF appraisal workflow.

| # | Content Package | Page | Estimated Chunks | Depth Target |
|---|----------------|------|:---:|:---:|
| 1a | **Operations P&L Guide** | MF/operations | 8-12 | Level 3 |
| 1b | **Income Approach Guide** (DCF + Direct Cap) | MF/valuation/income | 12-18 | Level 3 |
| 1c | **Rent Roll Guide** | MF/property/rent-roll | 6-10 | Level 2-3 |
| 1d | **Sales Comparison Guide** | MF/valuation/sales-comparison | 6-10 | Level 2-3 |
| 1e | **Document Upload & Extraction Guide** | BOTH/documents | 6-8 | Level 2 |
| 1f | **Cost Approach Guide** | MF/valuation/cost | 6-8 | Level 2-3 |

**Estimated new chunks:** 44-66
**Rationale:** These are the 6 tabs an appraiser touches in every valuation engagement. They represent steps 4-10 of the 14-step alpha workflow.

### Priority 2: Capital & Acquisition (High)

| # | Content Package | Page | Estimated Chunks | Depth Target |
|---|----------------|------|:---:|:---:|
| 2a | **Acquisition Tab Guide** | BOTH/property/acquisition | 4-6 | Level 2 |
| 2b | **Equity Structure Guide** | BOTH/capital/equity | 4-6 | Level 2 |
| 2c | **Debt/Loan Terms Guide** | BOTH/capital/debt | 4-6 | Level 2 |

**Estimated new chunks:** 12-18
**Rationale:** Capital structure is a critical workflow step that currently has zero help content.

### Priority 3: Calculation Library (High)

A dedicated calculation reference that covers all formulas with input field locations.

| # | Content Package | Scope | Estimated Chunks |
|---|----------------|-------|:---:|
| 3a | **NOI Calculation** | Formula, three bases, input locations | 3-4 |
| 3b | **Cap Rate & Direct Cap** | Formula, market vs going-in vs terminal | 3-4 |
| 3c | **DCF Methodology** | Monthly projection, reversion, discount rate | 4-6 |
| 3d | **Return Metrics** | IRR, equity multiple, DSCR | 3-4 |
| 3e | **Vacancy & Credit Loss** | Physical vs economic, how applied | 2-3 |
| 3f | **Waterfall Distribution** | Preferred return, promotes, catch-up | 3-4 |

**Estimated new chunks:** 18-25
**Rationale:** Calculation questions are the most common "how does this work" questions from appraisers and analysts.

### Priority 4: Data Flow Documentation (Medium)

| # | Content Package | Scope | Estimated Chunks |
|---|----------------|-------|:---:|
| 4a | **Rent Roll to Operations Flow** | How unit data feeds revenue | 2-3 |
| 4b | **Operations to Income Approach Flow** | NOI to DCF/Direct Cap | 2-3 |
| 4c | **Extraction Pipeline Flow** | Upload to populated fields | 3-4 |
| 4d | **Market to Assumptions Flow** | Benchmark validation | 2-3 |

**Estimated new chunks:** 9-13
**Rationale:** Users frequently ask "where does this number come from" -- data flow docs answer proactively.

### Priority 5: Crosswalk Content (Medium)

| # | Content Package | Scope | Estimated Chunks |
|---|----------------|-------|:---:|
| 5a | **ARGUS Enterprise Crosswalk** | Feature-by-feature mapping | 8-12 |
| 5b | **ARGUS Developer Crosswalk** | Feature-by-feature mapping for land dev | 6-8 |
| 5c | **Excel Workflow Crosswalk** | Tab-by-tab mapping, formula replacement | 6-8 |

**Estimated new chunks:** 20-28
**Rationale:** Alpha testers likely come from ARGUS or Excel workflows. Crosswalk content reduces onboarding friction.

### Priority 6: Land Development Pages (Medium-Low)

| # | Content Package | Page | Estimated Chunks | Depth Target |
|---|----------------|------|:---:|:---:|
| 6a | **Budget Grid Guide** | LAND_DEV/budget/budget | 6-8 | Level 2-3 |
| 6b | **Sales/Absorption Guide** | LAND_DEV/budget/sales | 4-6 | Level 2 |
| 6c | **Feasibility/Cash Flow Guide** | LAND_DEV/feasibility/cashflow | 6-8 | Level 2-3 |
| 6d | **Land Use & Parcels Guide** | LAND_DEV/property/land-use | 4-6 | Level 2 |

**Estimated new chunks:** 20-28
**Rationale:** Land dev is secondary focus for alpha (MF appraiser workflow is primary), but still needs basic coverage.

### Priority 7: Remaining Pages & Troubleshooting (Low)

| # | Content Package | Page | Estimated Chunks |
|---|----------------|------|:---:|
| 7a | **Project Home / Dashboard Guide** | BOTH/home | 3-4 |
| 7b | **Map / GIS Guide** | BOTH/map | 3-4 |
| 7c | **Reports Guide** | BOTH/reports | 3-4 |
| 7d | **Troubleshooting FAQ** | BOTH/general | 6-10 |
| 7e | **Landscaper AI Usage Guide** | BOTH/general | 3-4 |

**Estimated new chunks:** 18-26

---

## 7. Summary Metrics

| Metric | Current | After All Priorities |
|--------|:---:|:---:|
| Total alpha_help chunks | ~175 | ~316-379 |
| Pages with Level 0 (no content) | 9 | 0 |
| Pages with Level 1 only | ~10 | 2-3 |
| Pages with Level 2+ | ~3-4 | ~18-20 |
| Pages with Level 3 (calculation) | 0 | 6-8 |
| Crosswalk content packages | 0 | 3 |
| Troubleshooting content | 0 | 1 package |

### Content Creation Format

All new content should be authored as Markdown files and ingested via:
```bash
python manage.py ingest_platform_docs \
    --file docs/alpha-help/{filename}.md \
    --key alpha-help-{page-name} \
    --title "{Page Name} Help Guide" \
    --force
```

Files should use `##` headers that match the `PAGE_PATTERNS` and `CONTENT_TYPE_PATTERNS` in `ingest_platform_docs.py` for accurate auto-classification. For pages not currently covered by detection patterns (acquisition, renovation, equity, debt, returns, sensitivity, map), either add new patterns to the command or use explicit section_path metadata.

### Detection Pattern Additions Needed

Add to `PAGE_PATTERNS` in `ingest_platform_docs.py`:
```python
'acquisition': ['acquisition tab', 'purchase price', 'closing costs', 'transaction costs'],
'renovation': ['renovation tab', 'value-add', 'unit renovation', 'renovation budget', 'capex'],
'equity': ['equity tab', 'equity structure', 'waterfall', 'promote', 'preferred return'],
'debt': ['debt tab', 'loan terms', 'amortization', 'dscr', 'debt service', 'leverage'],
'returns': ['returns tab', 'equity multiple', 'cash-on-cash'],
'sensitivity_analysis': ['sensitivity tab', 'sensitivity analysis', 'scenario analysis'],
```

---

*This analysis is based on codebase review only -- not live database queries. Actual chunk counts and content coverage may differ from estimates.*
