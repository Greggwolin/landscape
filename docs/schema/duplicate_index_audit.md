# Duplicate Index Audit

**Generated:** 2026-01-06
**Source:** `docs/schema/landscape_index_ownership.csv` (live DB metadata via `pg_constraint.conindid`)

## Summary

| Metric | Value |
|--------|-------|
| Total indexes in schema | 902 |
| Unique index definitions | 889 |
| Duplicate groups found | 13 |
| Indexes to drop | 11 |
| Constraints to drop | 2 |
| Constraint-owned indexes dropped | 0 |

## Safety Verification

- **Ownership detection method:** `pg_constraint.conindid` (the ONLY safe way)
- **Constraint-owned indexes directly dropped:** 0 (PASS)
- **All drops use IF EXISTS:** Yes (PASS)
- **CASCADE used:** No (PASS)

## Duplicate Index Groups

### 1. knowledge_facts

| Attribute | Value |
|-----------|-------|
| **Table** | `knowledge_facts` |
| **Index Definition** | `btree (object_entity_id)` |
| **Keeper** | `knowledge_f_object__4cb694_idx` |
| **Dropped** | `knowledge_facts_object_entity_id_ca9e8ef5` |
| **Keeper Constraint-Owned** | No |

---

### 2. knowledge_sessions

| Attribute | Value |
|-----------|-------|
| **Table** | `knowledge_sessions` |
| **Index Definition** | `btree (session_start)` |
| **Keeper** | `knowledge_s_session_5b8f09_idx` |
| **Dropped** | `knowledge_sessions_session_start_740f4f0a` |
| **Keeper Constraint-Owned** | No |

---

### 3. land_use_pricing

| Attribute | Value |
|-----------|-------|
| **Table** | `land_use_pricing` |
| **Index Definition** | `UNIQUE btree (project_id, lu_type_code, product_code)` |
| **Keeper** | `land_use_pricing_project_lu_product_key` |
| **Dropped** | `land_use_pricing_project_type_product_key` (via `DROP CONSTRAINT`) |
| **Keeper Constraint-Owned** | Yes |
| **Keeper Constraint Name** | `land_use_pricing_project_lu_product_key` |
| **Keeper Constraint Type** | `u` (UNIQUE) |
| **Drop Method** | `ALTER TABLE DROP CONSTRAINT` (auto-drops backing index) |

**Note:** Both indexes were constraint-owned (backing duplicate UNIQUE constraints on the same columns). The duplicate constraint `land_use_pricing_project_type_product_key` is dropped via `ALTER TABLE DROP CONSTRAINT`, which automatically removes its backing index.

---

### 4. landscaper_activity (created_at)

| Attribute | Value |
|-----------|-------|
| **Table** | `landscaper_activity` |
| **Index Definition** | `btree (project_id, created_at DESC)` |
| **Keeper** | `idx_landscaper_activity_created` |
| **Dropped** | `idx_landscaper_activity_project_created` |
| **Keeper Constraint-Owned** | No |

---

### 5. landscaper_activity (is_read)

| Attribute | Value |
|-----------|-------|
| **Table** | `landscaper_activity` |
| **Index Definition** | `btree (project_id, is_read)` |
| **Keeper** | `idx_landscaper_activity_read` |
| **Dropped** | `idx_landscaper_activity_project_read` |
| **Keeper Constraint-Owned** | No |

---

### 6. mkt_new_home_project

| Attribute | Value |
|-----------|-------|
| **Table** | `mkt_new_home_project` |
| **Index Definition** | `btree (source_id)` |
| **Keeper** | `idx_mkt_nhp_source` |
| **Dropped** | `mkt_new_home_project_source_id_cbf21c81` |
| **Keeper Constraint-Owned** | No |

---

### 7. mkt_permit_history

| Attribute | Value |
|-----------|-------|
| **Table** | `mkt_permit_history` |
| **Index Definition** | `btree (source_id)` |
| **Keeper** | `idx_mkt_permit_source` |
| **Dropped** | `mkt_permit_history_source_id_4d1eb402` |
| **Keeper Constraint-Owned** | No |

---

### 8. tbl_cre_lease

| Attribute | Value |
|-----------|-------|
| **Table** | `tbl_cre_lease` |
| **Index Definition** | `btree (tenant_id)` |
| **Keeper** | `idx_cre_lease_tenant` |
| **Dropped** | `idx_cre_lease_tenant_id` |
| **Keeper Constraint-Owned** | No |

---

### 9. tbl_cre_space

| Attribute | Value |
|-----------|-------|
| **Table** | `tbl_cre_space` |
| **Index Definition** | `btree (cre_property_id)` |
| **Keeper** | `idx_cre_space_property` |
| **Dropped** | `idx_cre_space_property_id` |
| **Keeper Constraint-Owned** | No |

---

### 10. tbl_debt_facility

| Attribute | Value |
|-----------|-------|
| **Table** | `tbl_debt_facility` |
| **Index Definition** | `btree (project_id)` |
| **Keeper** | `idx_debt_project` |
| **Dropped** | `idx_debt_facility_project` |
| **Keeper Constraint-Owned** | No |

---

### 11. tbl_project_assumption

| Attribute | Value |
|-----------|-------|
| **Table** | `tbl_project_assumption` |
| **Index Definition** | `UNIQUE btree (project_id, assumption_key)` |
| **Keeper** | `uq_project_assumption` |
| **Dropped** | `uq_project_assumption_key` (via `DROP CONSTRAINT`) |
| **Keeper Constraint-Owned** | Yes |
| **Keeper Constraint Name** | `uq_project_assumption` |
| **Keeper Constraint Type** | `u` (UNIQUE) |
| **Drop Method** | `ALTER TABLE DROP CONSTRAINT` (auto-drops backing index) |

**Note:** Both indexes were constraint-owned (backing duplicate UNIQUE constraints on the same columns). The duplicate constraint `uq_project_assumption_key` is dropped via `ALTER TABLE DROP CONSTRAINT`, which automatically removes its backing index.

---

### 12. tbl_sale_settlement

| Attribute | Value |
|-----------|-------|
| **Table** | `tbl_sale_settlement` |
| **Index Definition** | `btree (container_id)` |
| **Keeper** | `idx_settlement_container` |
| **Dropped** | `idx_sale_settlement_container` |
| **Keeper Constraint-Owned** | No |

---

### 13. tbl_user_preference

| Attribute | Value |
|-----------|-------|
| **Table** | `tbl_user_preference` |
| **Index Definition** | `btree (preference_key)` |
| **Keeper** | `tbl_user_pr_prefere_c180c6_idx` |
| **Dropped** | `tbl_user_preference_preference_key_328aa664` |
| **Keeper Constraint-Owned** | No |

---

## Migration File

See: `migrations/046_drop_duplicate_indexes.sql`

## Verification

After running the migration, execute the verification query in the migration file to confirm no duplicate index groups remain.
