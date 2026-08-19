-- ============================================================================
-- Migration 045: Project-scoped land use selections
-- Description: Stores which land use types and products are active per project.
--              Used by the Land Use tab's 3-column palette picker.
-- ============================================================================

BEGIN;

-- Project land use type selections (one row per project + type)
CREATE TABLE IF NOT EXISTS landscape.project_land_use (
    project_land_use_id  SERIAL PRIMARY KEY,
    project_id           INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
    family_id            INTEGER NOT NULL REFERENCES landscape.lu_family(family_id),
    type_id              INTEGER NOT NULL REFERENCES landscape.lu_type(type_id),
    is_active            BOOLEAN NOT NULL DEFAULT true,
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, type_id)
);

-- Product selections within a project land use type
CREATE TABLE IF NOT EXISTS landscape.project_land_use_product (
    project_land_use_product_id  SERIAL PRIMARY KEY,
    project_land_use_id          INTEGER NOT NULL REFERENCES landscape.project_land_use(project_land_use_id) ON DELETE CASCADE,
    product_id                   INTEGER NOT NULL REFERENCES landscape.res_lot_product(product_id),
    is_active                    BOOLEAN NOT NULL DEFAULT true,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_land_use_id, product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_land_use_project
    ON landscape.project_land_use(project_id);
CREATE INDEX IF NOT EXISTS idx_project_land_use_family
    ON landscape.project_land_use(family_id);
CREATE INDEX IF NOT EXISTS idx_plu_product_plu_id
    ON landscape.project_land_use_product(project_land_use_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION landscape.update_project_land_use_ts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_land_use_updated ON landscape.project_land_use;
CREATE TRIGGER trg_project_land_use_updated
    BEFORE UPDATE ON landscape.project_land_use
    FOR EACH ROW EXECUTE FUNCTION landscape.update_project_land_use_ts();

COMMENT ON TABLE landscape.project_land_use IS 'Project-scoped land use type selections';
COMMENT ON TABLE landscape.project_land_use_product IS 'Product selections within a project land use type';

COMMIT;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP TRIGGER IF EXISTS trg_project_land_use_updated ON landscape.project_land_use;
-- DROP FUNCTION IF EXISTS landscape.update_project_land_use_ts();
-- DROP TABLE IF EXISTS landscape.project_land_use_product;
-- DROP TABLE IF EXISTS landscape.project_land_use;
