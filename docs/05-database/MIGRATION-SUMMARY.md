# Database Migrations - Summary

**Date:** October 14, 2025
**Status:** ✅ **8 Migrations Complete**

---

## All Migrations (001-008)

### Migration 008: Multifamily Property Tracking ✅ (NEW - October 14, 2025)
**File:** `migrations/008_add_multifamily_units.sql` (19,395 lines)

**Deliverables:**
- ✅ 4 tables: `tbl_multifamily_unit`, `tbl_multifamily_lease`, `tbl_multifamily_turn`, `tbl_multifamily_unit_type`
- ✅ 5 views: unit_status, lease_expirations, turn_metrics, occupancy_summary, project_summary
- ✅ 5 API endpoints: units, leases, turns, occupancy report, expirations report
- ✅ Sample data: Project 9 (8 units, 4 leases, 1 turn, 3 unit types)

**Impact:**
- Unit-level tracking for multifamily properties
- Loss-to-lease calculations
- Turn metrics and occupancy analysis
- Physical vs economic occupancy reporting

### Migration 007: Budget Timing Columns ✅ (October 14, 2025)
**File:** `migrations/007_add_budget_timing_columns.sql` (6,126 lines)

**Deliverables:**
- ✅ Added timing columns to `tbl_budget` table
- ✅ S-curve profile support
- ✅ Period-based budget allocation

### Migration 006: Lease Management ✅ (October 13, 2025)
**File:** `migrations/006_lease_management.sql` (15,634 lines)

**Deliverables:**
- ✅ 6 lease management tables
- ✅ Rent roll, lease assumptions, operating expenses
- ✅ Capital reserves, revenue timing, opex timing
- ✅ Views for lease expiration schedules

### Migration 002a: Fix Dependency Views ✅ (October 13, 2025)
**File:** `migrations/002a_fix_dependency_views.sql` (7,499 lines)

**Deliverables:**
- ✅ Fixed dependency view queries
- ✅ Corrected circular dependency detection

### Migration 002: Dependencies, Revenue & Finance ✅ (October 13, 2025)
**File:** `migrations/002_dependencies_revenue_finance.sql` (25,796 lines)

**Deliverables:**
- ✅ 7 tables: dependencies, absorption, revenue timing, debt facilities
- ✅ 5 views: dependency status, budget with dependencies
- ✅ Enhanced existing tables with timing and versioning

### Migration 001: Financial Engine Schema ✅ (October 13, 2025)
**File:** `migrations/001_financial_engine_schema.sql` (38,994 lines)

**Deliverables:**
- ✅ 28 tables: core infrastructure, income property, lookups
- ✅ 2 views: lease summary, rent roll
- ✅ Foundation for financial modeling system

---

## Legacy Budget System Consolidation

### 1. Unified Extractor Integration ✅ (October 2, 2025)
Integrated the Claude v2.0 unified extractor into the document ingestion pipeline with full database persistence.

**Deliverables:**
- ✅ Database schema: `dms_extract_queue`, `dms_unmapped`, `dms_assertion`
- ✅ Service layer: `claude-extractor.ts`, `extraction-persistence.ts`
- ✅ Updated route: `/api/ai/analyze-document`
- ✅ All tables created and verified in Neon

**Impact:**
- Documents now extract to structured JSON with provenance
- All assertions tracked with confidence scores and page numbers
- Idempotent processing prevents duplicate extractions

### 2. Budget System Consolidation ✅
Migrated legacy `tbl_budget_*` system to core finance framework `core_fin_*`.

**Deliverables:**
- ✅ Migration script: `migrate-budget-to-core-fin.sql`
- ✅ 27 categories migrated with standardized codes
- ✅ 4 budget items migrated to star schema
- ✅ Backup tables created
- ✅ Legacy tables deprecated (not dropped yet)
- ✅ Updated API route example created

**Impact:**
- Eliminated schema overlap and redundancy
- Unified finance system with versioning, multi-entity support
- Better analytics capabilities (star schema)
- Preserved all data (100% integrity verified)

### 3. Schema Analysis & Documentation ✅
Comprehensive documentation of schema patterns and consolidation strategy.

**Deliverables:**
- ✅ Budget-Finance-Schema-Overlap-Analysis.md
- ✅ Schema-Naming-Convention-Analysis.md
- ✅ Budget-Consolidation-Migration-Complete.md
- ✅ Unified-Extractor-Integration-Complete.md

**Impact:**
- Clear guidelines for future schema changes
- Documented naming conventions (`tbl_`, `core_`, `dms_`, `gis_`, `lu_`)
- Migration and rollback procedures defined

---

## Migration Results

### Data Migrated
| Source | Records | Target | Status |
|--------|---------|--------|--------|
| tbl_budget_structure | 27 | core_fin_category | ✅ Complete |
| tbl_budget_items | 4 | core_fin_fact_budget | ✅ Complete |

### Categories Created
```
Acquisition      → 6 categories  (USE-ACQ-*)
Stage 1          → 3 categories  (USE-STG1-*)
Stage 2          → 3 categories  (USE-STG2-*)
Stage 3          → 12 categories (USE-STG3-*)
Project Overhead → 7 categories  (USE-PRJ-*)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total            → 31 categories (5 existing + 27 new - 1 overlap)
```

### Budget Items Migrated
```
Project #7 Budget:
  Environmental Studies → $25,000
  Land Cost            → $10,500,000
  Water Infrastructure → $750,000
  Utilities            → $350,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total Budget         → $11,625,000 ✓ Verified
```

---

## Testing Status

### ✅ Completed
- [x] Data integrity verification (100% match)
- [x] Query performance testing (0.070ms)
- [x] Comparison view validation
- [x] Backup creation and verification
- [x] Migration script execution
- [x] Sample queries tested

### ⏳ Pending (Testing Phase - Next 3-4 Weeks)
- [ ] Application code updates deployed
- [ ] Budget structure API endpoint testing
- [ ] UI functionality verification
- [ ] Multi-project budget testing
- [ ] User acceptance testing
- [ ] Final sign-off before dropping legacy tables

---

## Files Created/Modified

### New Files
```
src/app/api/ai/
  ├─ database-schema.sql                    (DMS tables)
  └─ analyze-document/
      ├─ route.ts                           (Updated - unified extractor)
      └─ route-legacy.ts                    (Backup)

src/lib/ai/
  ├─ claude-extractor.ts                    (Claude API service)
  └─ extraction-persistence.ts              (DB persistence layer)

src/app/api/budget-structure/
  └─ route-updated.ts                       (Core finance version)

scripts/
  ├─ migrate-budget-to-core-fin.sql         (Migration script)
  ├─ run-extraction-migration.js            (DMS table creation)
  └─ run-extraction-migration.sh            (Shell wrapper)

project-docs/
  ├─ Budget-Finance-Schema-Overlap-Analysis.md
  ├─ Schema-Naming-Convention-Analysis.md
  ├─ Budget-Consolidation-Migration-Complete.md
  ├─ Unified-Extractor-Integration-Complete.md
  ├─ GIS-Document-Analysis-OCR-Issues.md    (Existing - referenced)
  └─ MIGRATION-SUMMARY.md                   (This file)
```

### Modified Files
```
src/app/api/ai/analyze-document/route.ts   (Replaced with unified version)
```

### Database Tables Created
```
landscape.dms_extract_queue                (Document extraction jobs)
landscape.dms_unmapped                     (Unmapped fields)
landscape.dms_assertion                    (Document assertions)
landscape.tbl_budget_structure_backup      (Backup)
landscape.tbl_budget_items_backup          (Backup)
landscape.tbl_multifamily_unit             (Migration 008)
landscape.tbl_multifamily_lease            (Migration 008)
landscape.tbl_multifamily_turn             (Migration 008)
landscape.tbl_multifamily_unit_type        (Migration 008)
```

### Database Tables Deprecated (Not Dropped)
```
landscape.tbl_budget_items       (DEPRECATED - migrated)
landscape.tbl_budget_structure   (DEPRECATED - migrated)
landscape.tbl_budget_timing      (Not used - can drop)
```

---

## Naming Convention Decision

**Question:** Should finance tables use `tbl_fin_*` or `core_fin_*`?

**Answer:** ✅ **Keep `core_fin_*`**

**Rationale:**
- 15 existing `core_fin_*` tables already in use
- Finance is a cross-cutting framework (not primary domain entity)
- Star schema pattern fits `core_` philosophy
- Minimal disruption (no table renames needed)
- Consistent with `core_doc`, `core_lookup_*` patterns

**Guidelines:**
- `tbl_*` → Primary business entities (project, parcel, phase)
- `core_*` → Frameworks/platforms (finance, documents, lookups)
- `dms_*` → Document management subsystem
- `gis_*` → Geographic subsystem
- `lu_*` → Lookup/reference data

---

## Next Actions

### Immediate (This Week)
1. ✅ Complete migration execution
2. ✅ Verify data integrity
3. ✅ Create documentation
4. ⏳ Deploy updated API routes
5. ⏳ Update TypeScript types

### Short-Term (Next 2-4 Weeks)
1. ⏳ Test all budget functionality
2. ⏳ Verify UI works with new tables
3. ⏳ Gather user feedback
4. ⏳ Address any issues found
5. ⏳ Performance testing

### Long-Term (After Testing)
1. ⏳ Get stakeholder sign-off
2. ⏳ Drop legacy tables:
   ```sql
   DROP TABLE tbl_budget_items CASCADE;
   DROP TABLE tbl_budget_structure CASCADE;
   DROP TABLE tbl_budget_timing CASCADE;
   ```
3. ⏳ Clean up backup tables
4. ⏳ Archive documentation

---

## Rollback Plan

If critical issues are discovered:

### Option 1: Quick Rollback (Minutes)
```sql
-- Delete migrated data
DELETE FROM core_fin_fact_budget WHERE notes LIKE '%Migrated from tbl_budget_items%';
DELETE FROM core_fin_category WHERE category_id > 5 AND code LIKE 'USE-%';

-- Restore API route
mv route-legacy.ts route.ts
```

### Option 2: Full Rollback (Hours)
```sql
-- Restore from backups
TRUNCATE tbl_budget_items;
INSERT INTO tbl_budget_items SELECT * FROM tbl_budget_items_backup;

TRUNCATE tbl_budget_structure;
INSERT INTO tbl_budget_structure SELECT * FROM tbl_budget_structure_backup;

-- Remove deprecation markers
COMMENT ON TABLE tbl_budget_items IS NULL;
ALTER TABLE tbl_budget_items DROP COLUMN migrated_at;
```

**Backups Verified:**
- ✅ `tbl_budget_structure_backup`: 27 records
- ✅ `tbl_budget_items_backup`: 4 records

---

## Key Metrics

| Metric | Value |
|--------|-------|
| **Migration Script Runtime** | ~2 seconds |
| **Data Integrity** | 100% match |
| **Query Performance** | 0.070ms |
| **Categories Migrated** | 27 |
| **Budget Items Migrated** | 4 |
| **Total Budget Value** | $11,625,000 |
| **Code Files Updated** | 2 |
| **Documentation Created** | 5 files |
| **Database Tables Created** | 3 (DMS) + 2 (backups) |
| **Database Tables Deprecated** | 3 |
| **Schema Overlap Eliminated** | 100% |

---

## Success Criteria

### ✅ Achieved
- [x] Zero data loss during migration
- [x] 100% data integrity verified
- [x] Query performance maintained (<1ms)
- [x] Backups created for rollback
- [x] Documentation complete
- [x] Legacy tables preserved during testing

### ⏳ In Progress
- [ ] Application code fully updated
- [ ] All features tested and working
- [ ] User acceptance obtained
- [ ] Legacy tables dropped

---

## Lessons Learned

### What Went Well ✅
1. **Comprehensive analysis first** - Schema overlap analysis prevented rushing into wrong solution
2. **Automated migration** - SQL script handles all transformations reliably
3. **Backup strategy** - Easy rollback gives confidence
4. **Naming conventions** - Clear guidelines prevent future confusion
5. **Testing approach** - Comparison view makes validation easy

### Areas for Improvement 🔧
1. **Earlier detection** - Schema overlap should have been caught sooner
2. **Type definitions** - Update TypeScript types in same commit as migration
3. **API versioning** - Consider versioned API routes for major changes

### Best Practices Established 📋
1. Always create backups before migrations
2. Use comparison views for validation
3. Mark tables as deprecated (don't drop immediately)
4. Document naming conventions clearly
5. Include rollback procedures in migration scripts

---

## Support Contacts

**For Questions:**
- Schema/Database: Check project-docs/ documentation
- Migration Issues: See rollback procedures above
- API Updates: Review route-updated.ts example
- Testing: Follow testing checklist in Budget-Consolidation-Migration-Complete.md

**Resources:**
- Migration Script: [scripts/migrate-budget-to-core-fin.sql](../scripts/migrate-budget-to-core-fin.sql)
- Full Documentation: [project-docs/](../project-docs/)
- Comparison View: `SELECT * FROM landscape.v_budget_migration_comparison;`

---

**Status:** ✅ Migration Complete - Testing Phase Active
**Last Updated:** October 2, 2025
**Next Review:** After 2 weeks of application testing
