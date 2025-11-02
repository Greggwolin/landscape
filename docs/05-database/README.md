# Database Documentation

Complete database schema documentation, migrations, and reference materials for the Landscape Pro-Forma platform.

---

## Quick Links

### 📊 Table Inventory
**[TABLE_INVENTORY.md](TABLE_INVENTORY.md)** - Complete inventory of all 158 database tables organized by functional area

### 📖 Schema Reference
**[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Technical schema specification for the financial engine

### 🔄 Migration History
**[MIGRATION-SUMMARY.md](MIGRATION-SUMMARY.md)** - Complete history of database migrations and consolidations

### 🔍 Schema Dump
**[db-schema.md](db-schema.md)** - Auto-generated schema dump (may be outdated)

---

## Database Overview

**Database Name:** land_v2
**Database Provider:** Neon (PostgreSQL)
**Primary Schema:** landscape
**Active Tables:** 151
**Deprecated Tables:** 7 (marked for removal after migration)
**Total Tables:** 158

---

## Table Categories

The database is organized into 25 functional areas:

### Commercial Real Estate Analytics (~90 tables)
- CRE-specific analysis (36 tables)
- Multifamily properties (4 tables)
- Lease management (8 tables)
- Revenue streams (4 tables)
- Operating expenses (3 tables)
- Financial engine core (15 tables)
- Capital structure (11 tables)
- Cash flow & metrics (4 tables)
- Reserves & escalations (5 tables)
- Market data (2 tables)

### Community Development (~42 tables)
- Project & container management (8 tables)
- Land use & zoning (11 tables)
- Development phasing & lots (6 tables)
- GIS & boundaries (9 tables)
- Approvals & entitlements (2 tables)
- Planning documents (2 tables)
- Contacts (1 table)
- Dependencies & measures (3 tables)

### Document Management (~13 tables)
- Core document storage (5 tables)
- Document attributes (2 tables)
- AI extraction & processing (6 tables)

### System & AI (~7 tables)
- AI processing (2 tables)
- Core system (5 tables)

---

## Key Features

### ARGUS-Equivalent Capabilities
The database supports complete commercial real estate analysis at parity with ARGUS Developer and ARGUS Enterprise:
- Lease management with escalations and recoveries
- Multi-tenant rent rolls
- Operating expense tracking and recovery
- TI/LC modeling
- DCF analysis and returns (IRR, NPV, equity multiples)
- Debt service coverage (DSCR)
- Waterfall distributions

### Community Development
Full support for master-planned community development:
- Parcel and lot-level tracking
- Multi-phase development schedules
- Land use planning and zoning compliance
- Entitlement tracking
- GIS integration with spatial boundaries

### Universal Financial Engine
Star schema-based financial modeling framework:
- Multi-entity budgeting (project/area/phase/parcel/lot)
- Budget versioning and comparison
- S-curve cost distribution
- Growth rate modeling
- Flexible UOM (unit of measure) system

### Document Intelligence
AI-powered document management:
- Full-text extraction and search
- Structured data extraction
- Assertion tracking with provenance
- Smart folders and filters

---

## Recent Changes

**November 2, 2025:** Migration 013 - Project Type Code Standardization
- **Column Rename**: `property_type_code` → `project_type_code` in `landscape.tbl_project`
- **Standardized Codes**: 7 official project type codes (LAND, MF, OFF, RET, IND, HTL, MXU)
- **Database Constraint**: CHECK constraint ensures only valid codes are used
- **Default Value**: Changed from `MPC` to `LAND`
- **Frontend Updates**: 21 files updated to use new field name
- **Django Backend**: Models and serializers updated
- **Migration File**: `backend/apps/projects/migrations/0009_rename_property_type_code.py`

**October 21, 2025:** Deprecated legacy hierarchy tables
- Marked `tbl_area`, `tbl_phase`, `tbl_lot` as DEPRECATED
- Added database comments for deprecation status
- Container system migration in progress (PlanningWizard complete)

**October 14, 2025:** Migration 008 - Multifamily Property Tracking
- Added 4 tables for unit-level tracking
- Added 5 views for occupancy reporting

**October 13, 2025:** Multiple migrations
- Migration 007: Budget timing columns
- Migration 006: Lease management system
- Migration 002/002a: Dependencies, revenue & finance

**October 2, 2025:** Budget system consolidation
- Migrated legacy `tbl_budget_*` to `core_fin_*`
- Deprecated 2 budget tables + 2 backup tables

See [MIGRATION-SUMMARY.md](MIGRATION-SUMMARY.md) for complete history.

---

## Schema Naming Conventions

| Prefix | Purpose | Examples |
|--------|---------|----------|
| `tbl_*` | Primary business entities | tbl_project, tbl_lease, tbl_parcel |
| `core_*` | Framework/platform tables | core_fin_category, core_doc |
| `dms_*` | Document management | dms_templates, dms_assertion |
| `gis_*` | Geographic/spatial | gis_project_boundary, gis_plan_parcel |
| `lu_*` | Lookup/reference data | lu_type, lu_subtype, lu_family |

---

## Getting Started

### For Developers
1. Review [TABLE_INVENTORY.md](TABLE_INVENTORY.md) for table organization
2. Consult [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for technical details
3. Check [MIGRATION-SUMMARY.md](MIGRATION-SUMMARY.md) for recent changes

### For Architects
1. Start with [TABLE_INVENTORY.md](TABLE_INVENTORY.md) for overall structure
2. Review table relationships in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
3. Understand migration strategy in [MIGRATION-SUMMARY.md](MIGRATION-SUMMARY.md)

### For Product Managers
1. Review [TABLE_INVENTORY.md](TABLE_INVENTORY.md) for feature coverage
2. Check functional area counts to understand system capabilities
3. See deprecation notes for legacy system cleanup

---

## Database Metrics

| Metric | Count |
|--------|-------|
| Active Tables | 151 |
| Deprecated Tables | 7 |
| Total Tables | 158 |
| Total Columns | ~2,400+ |
| Foreign Keys | 100+ |
| Indexes | 200+ |
| Views | 12+ |
| Migrations Executed | 13 |

---

## Support & Resources

### Documentation
- [Main Documentation Index](../README.md)
- [Migration 013 History](../08-migration-history/013-project-type-code-standardization.md)
- [CHANGELOG](../../CHANGELOG.md)

### Database Access
- Production: Neon (ep-spring-mountain-af3hdne2-pooler)
- Connection details: See `.env` file
- Migrations: `backend/apps/projects/migrations/` folder

### Common Tasks
- **View all tables:** See [TABLE_INVENTORY.md](TABLE_INVENTORY.md)
- **Run migration:** Check [MIGRATION-SUMMARY.md](MIGRATION-SUMMARY.md)
- **Understand schema:** Read [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- **Check recent changes:** Review [MIGRATION-SUMMARY.md](MIGRATION-SUMMARY.md)

---

**Last Updated:** November 2, 2025
**Maintained By:** Engineering Team

[← Back to Documentation Home](../README.md)
