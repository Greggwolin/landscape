# Comp Ingestion via Existing Workbench — Feature Spec

> **Status:** Draft — Ready for implementation
> **Created:** 2026-03-19
> **Depends on:** Unified Intake Modal (complete), Knowledge Search dual-source (complete), Ingestion Workbench (complete)

---

## Overview

Extend the existing Ingestion Workbench to recognize and map comparable data (sales comps, rental comps, land comps) alongside its existing field extraction categories (property info, rent roll, operating expenses, etc.). No new modal or workbench — comps are just another tile/category in the field registry.

## What Changes

### 1. Field Registry — add comp field definitions

The extraction field registry already defines mappable fields for property info, rent roll, T-12 opex, etc. Add three new field groups:

- **Sales Comparable fields** → `tbl_sales_comparables`: property_name, address, city, state, zip, sale_date, sale_price, price_per_unit, price_per_sf, year_built, units, building_sf, cap_rate, grm, notes
- **Rental Comparable fields** → `tbl_rental_comparable`: (check schema for columns)
- **Land Comparable fields** → `tbl_land_comparables`: (check schema for columns)

Each comp is a multi-field record (one comp = one row with N fields), similar to how rent roll extraction handles one unit = one row.

### 2. Extraction prompt — recognize comp data

The LLM extraction prompt already looks for property info, rent rolls, opex, etc. Add comp detection:

- If document contains tabular data with addresses + sale prices + dates → classify as sales comps
- If document contains rental rate data with property names + rents + unit counts → classify as rental comps
- If document contains land sale data with acreage + price per acre/SF → classify as land comps

CoStar exports, broker comp sheets, and market reports are the primary sources.

### 3. Workbench tile tabs — add Comparables tab

The Workbench already has property-type-aware tile tabs (Project / Property / Operations / Valuation / All). Comp fields go under the **Valuation** tab. For documents containing ONLY comp data, the Valuation tab should be auto-selected.

### 4. Commit path — write to comp tables

When user commits comp fields, the commit handler needs to:
- Detect that these are comp-type fields (target table is `tbl_sales_comparables`, `tbl_rental_comparable`, or `tbl_land_comparables`)
- INSERT one row per comp (not UPDATE a single project record)
- Normalize cap rates to decimal (values > 1 → divide by 100)
- Set `project_id` on each inserted row

### 5. Auto-trigger from Project Knowledge uploads

When a document uploaded via "Project Knowledge" intent contains comp-shaped data:
- RAG pipeline processes it normally (chunks + embeddings)
- Landscaper skims chunks for comp patterns (address + price + cap rate)
- If detected: open Ingestion Workbench with the comp fields pre-staged
- If not detected: normal Project Knowledge flow (metadata modal only)

### 6. Auto-trigger from Landscaper knowledge search

When Landscaper calls `query_platform_knowledge` and finds comp data, and the user says "add them":
- Open Ingestion Workbench with the comp data pre-staged as fields
- User reviews → commits → rows inserted into comp table

## Target Tables

| Comp Type | Table | Valuation Method | Property Types |
|-----------|-------|-----------------|----------------|
| Sales Comp | `tbl_sales_comparables` | Sales Comparison Approach | MF, OFF, RET, IND |
| Rental Comp | `tbl_rental_comparable` | Income Approach | MF, OFF, RET |
| Land Comp | `tbl_land_comparables` | Cost Approach (land value) | All |

## Cap Rate Normalization

All cap rates stored as decimal (0.052 not 5.2). The Workbench field review should auto-detect and convert values > 1 before staging.

## What Doesn't Change

- Workbench layout (split-panel: Landscaper chat left, field review right)
- Field status model (accepted/pending/conflict/empty)
- Commit/abandon flow
- Landscaper integration inside the Workbench
- The Unified Intake Modal flow

## Implementation Checklist

1. [ ] Add sales comp fields to extraction field registry
2. [ ] Add rental comp fields to extraction field registry
3. [ ] Add land comp fields to extraction field registry
4. [ ] Update extraction prompt to detect comp-shaped data
5. [ ] Add Valuation/Comparables grouping to Workbench tile tabs
6. [ ] Update commit handler to INSERT comp rows (vs UPDATE project fields)
7. [ ] Cap rate normalization in staging
8. [ ] Auto-trigger Workbench from Project Knowledge upload when comps detected
9. [ ] Auto-trigger Workbench from Landscaper "add comps" flow
10. [ ] Test with CoStar xlsx, broker comp sheet, OM with embedded comps
