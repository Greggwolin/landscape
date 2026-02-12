from django.db import migrations


FORWARD_SQL = """
-- ============================================================================
-- Step 1: Add new taxonomy dimensions on tbl_project
-- ============================================================================
ALTER TABLE landscape.tbl_project
    ADD COLUMN IF NOT EXISTS analysis_perspective VARCHAR(50);

ALTER TABLE landscape.tbl_project
    ADD COLUMN IF NOT EXISTS analysis_purpose VARCHAR(50);

ALTER TABLE landscape.tbl_project
    ADD COLUMN IF NOT EXISTS value_add_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE landscape.tbl_project
    ALTER COLUMN value_add_enabled SET DEFAULT FALSE;

COMMENT ON COLUMN landscape.tbl_project.analysis_perspective IS
    'Financial framework: INVESTMENT (buy/hold) or DEVELOPMENT (build/sell). Drives tile visibility.';
COMMENT ON COLUMN landscape.tbl_project.analysis_purpose IS
    'Why analyzing: VALUATION (market value opinion) or UNDERWRITING (deal decision). Toggleable on the fly.';
COMMENT ON COLUMN landscape.tbl_project.value_add_enabled IS
    'When true, enables CapEx/renovation inputs within Investment perspective. Replaces VALUE_ADD as analysis_type.';

-- ============================================================================
-- Step 2: Backfill project data into new dimensions
-- ============================================================================
UPDATE landscape.tbl_project
SET
    analysis_perspective = 'DEVELOPMENT',
    analysis_purpose = 'UNDERWRITING'
WHERE analysis_type = 'DEVELOPMENT';

UPDATE landscape.tbl_project
SET
    analysis_perspective = 'INVESTMENT',
    analysis_purpose = 'UNDERWRITING'
WHERE analysis_type = 'INVESTMENT';

UPDATE landscape.tbl_project
SET
    analysis_perspective = 'INVESTMENT',
    analysis_purpose = 'VALUATION'
WHERE analysis_type = 'VALUATION';

UPDATE landscape.tbl_project
SET
    analysis_perspective = 'INVESTMENT',
    analysis_purpose = 'UNDERWRITING',
    value_add_enabled = TRUE
WHERE analysis_type = 'VALUE_ADD';

UPDATE landscape.tbl_project
SET
    analysis_perspective = 'DEVELOPMENT',
    analysis_purpose = 'UNDERWRITING'
WHERE analysis_type = 'FEASIBILITY';

UPDATE landscape.tbl_project
SET
    analysis_perspective = COALESCE(analysis_perspective, 'INVESTMENT'),
    analysis_purpose = COALESCE(analysis_purpose, 'UNDERWRITING')
WHERE analysis_perspective IS NULL
   OR analysis_purpose IS NULL;

UPDATE landscape.tbl_project
SET value_add_enabled = FALSE
WHERE value_add_enabled IS NULL;

ALTER TABLE landscape.tbl_project
    ALTER COLUMN analysis_perspective SET NOT NULL;
ALTER TABLE landscape.tbl_project
    ALTER COLUMN analysis_purpose SET NOT NULL;
ALTER TABLE landscape.tbl_project
    ALTER COLUMN value_add_enabled SET NOT NULL;

ALTER TABLE landscape.tbl_project
    DROP CONSTRAINT IF EXISTS chk_analysis_perspective;
ALTER TABLE landscape.tbl_project
    ADD CONSTRAINT chk_analysis_perspective
    CHECK (
        analysis_perspective IN ('INVESTMENT', 'DEVELOPMENT')
    );

ALTER TABLE landscape.tbl_project
    DROP CONSTRAINT IF EXISTS chk_analysis_purpose;
ALTER TABLE landscape.tbl_project
    ADD CONSTRAINT chk_analysis_purpose
    CHECK (
        analysis_purpose IN ('VALUATION', 'UNDERWRITING')
    );

-- ============================================================================
-- Step 3: Rekey tbl_analysis_type_config with composite dimensions
-- Keep legacy 5 rows for compatibility; add new 4 synthetic rows.
-- ============================================================================
ALTER TABLE landscape.tbl_analysis_type_config
    ADD COLUMN IF NOT EXISTS analysis_perspective VARCHAR(50);

ALTER TABLE landscape.tbl_analysis_type_config
    ADD COLUMN IF NOT EXISTS analysis_purpose VARCHAR(50);

ALTER TABLE landscape.tbl_analysis_type_config
    DROP COLUMN IF EXISTS tile_hbu;

-- Legacy rows remain for compatibility but do not participate in composite key.
UPDATE landscape.tbl_analysis_type_config
SET
    analysis_perspective = NULL,
    analysis_purpose = NULL
WHERE analysis_type IN ('VALUATION', 'INVESTMENT', 'VALUE_ADD', 'DEVELOPMENT', 'FEASIBILITY');

-- INVESTMENT_VALUATION
UPDATE landscape.tbl_analysis_type_config
SET
    analysis_perspective = 'INVESTMENT',
    analysis_purpose = 'VALUATION',
    tile_valuation = TRUE,
    tile_capitalization = FALSE,
    tile_returns = FALSE,
    tile_development_budget = FALSE,
    requires_capital_stack = FALSE,
    requires_comparable_sales = TRUE,
    requires_income_approach = TRUE,
    requires_cost_approach = TRUE,
    available_reports = '["appraisal_report", "restricted_appraisal", "value_letter"]'::jsonb,
    landscaper_context = 'Focus on USPAP compliance, three approaches to value, reconciliation narrative, market value opinion. Guide user through comparable sales selection, income capitalization, and cost approach as applicable.',
    updated_at = NOW()
WHERE analysis_type = 'INVESTMENT_VALUATION';

INSERT INTO landscape.tbl_analysis_type_config (
    analysis_type,
    analysis_perspective,
    analysis_purpose,
    tile_valuation,
    tile_capitalization,
    tile_returns,
    tile_development_budget,
    requires_capital_stack,
    requires_comparable_sales,
    requires_income_approach,
    requires_cost_approach,
    available_reports,
    landscaper_context,
    created_at,
    updated_at
)
SELECT
    'INVESTMENT_VALUATION',
    'INVESTMENT',
    'VALUATION',
    TRUE, FALSE, FALSE, FALSE,
    FALSE, TRUE, TRUE, TRUE,
    '["appraisal_report", "restricted_appraisal", "value_letter"]'::jsonb,
    'Focus on USPAP compliance, three approaches to value, reconciliation narrative, market value opinion. Guide user through comparable sales selection, income capitalization, and cost approach as applicable.',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM landscape.tbl_analysis_type_config
    WHERE analysis_type = 'INVESTMENT_VALUATION'
);

-- INVESTMENT_UNDERWRITING
UPDATE landscape.tbl_analysis_type_config
SET
    analysis_perspective = 'INVESTMENT',
    analysis_purpose = 'UNDERWRITING',
    tile_valuation = TRUE,
    tile_capitalization = TRUE,
    tile_returns = TRUE,
    tile_development_budget = FALSE,
    requires_capital_stack = TRUE,
    requires_comparable_sales = FALSE,
    requires_income_approach = TRUE,
    requires_cost_approach = FALSE,
    available_reports = '["investment_memo", "offering_memo", "due_diligence_report"]'::jsonb,
    landscaper_context = 'Focus on IRR, cash-on-cash returns, equity multiple, debt coverage ratios. Help size debt, structure equity waterfall, and model hold period scenarios. Provide pricing guidance for acquisition underwriting. Emphasize sensitivity analysis and risk factors.',
    updated_at = NOW()
WHERE analysis_type = 'INVESTMENT_UNDERWRITING';

INSERT INTO landscape.tbl_analysis_type_config (
    analysis_type,
    analysis_perspective,
    analysis_purpose,
    tile_valuation,
    tile_capitalization,
    tile_returns,
    tile_development_budget,
    requires_capital_stack,
    requires_comparable_sales,
    requires_income_approach,
    requires_cost_approach,
    available_reports,
    landscaper_context,
    created_at,
    updated_at
)
SELECT
    'INVESTMENT_UNDERWRITING',
    'INVESTMENT',
    'UNDERWRITING',
    TRUE, TRUE, TRUE, FALSE,
    TRUE, FALSE, TRUE, FALSE,
    '["investment_memo", "offering_memo", "due_diligence_report"]'::jsonb,
    'Focus on IRR, cash-on-cash returns, equity multiple, debt coverage ratios. Help size debt, structure equity waterfall, and model hold period scenarios. Provide pricing guidance for acquisition underwriting. Emphasize sensitivity analysis and risk factors.',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM landscape.tbl_analysis_type_config
    WHERE analysis_type = 'INVESTMENT_UNDERWRITING'
);

-- DEVELOPMENT_VALUATION
UPDATE landscape.tbl_analysis_type_config
SET
    analysis_perspective = 'DEVELOPMENT',
    analysis_purpose = 'VALUATION',
    tile_valuation = TRUE,
    tile_capitalization = FALSE,
    tile_returns = FALSE,
    tile_development_budget = TRUE,
    requires_capital_stack = FALSE,
    requires_comparable_sales = FALSE,
    requires_income_approach = TRUE,
    requires_cost_approach = TRUE,
    available_reports = '["appraisal_report", "development_feasibility", "value_letter"]'::jsonb,
    landscaper_context = 'Focus on development valuation: residual land value, development profit analysis, and highest-and-best-use for development alternatives. Apply USPAP standards. Model absorption schedule and phased delivery. Calculate cost approach with entrepreneurial profit.',
    updated_at = NOW()
WHERE analysis_type = 'DEVELOPMENT_VALUATION';

INSERT INTO landscape.tbl_analysis_type_config (
    analysis_type,
    analysis_perspective,
    analysis_purpose,
    tile_valuation,
    tile_capitalization,
    tile_returns,
    tile_development_budget,
    requires_capital_stack,
    requires_comparable_sales,
    requires_income_approach,
    requires_cost_approach,
    available_reports,
    landscaper_context,
    created_at,
    updated_at
)
SELECT
    'DEVELOPMENT_VALUATION',
    'DEVELOPMENT',
    'VALUATION',
    TRUE, FALSE, FALSE, TRUE,
    FALSE, FALSE, TRUE, TRUE,
    '["appraisal_report", "development_feasibility", "value_letter"]'::jsonb,
    'Focus on development valuation: residual land value, development profit analysis, and highest-and-best-use for development alternatives. Apply USPAP standards. Model absorption schedule and phased delivery. Calculate cost approach with entrepreneurial profit.',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM landscape.tbl_analysis_type_config
    WHERE analysis_type = 'DEVELOPMENT_VALUATION'
);

-- DEVELOPMENT_UNDERWRITING
UPDATE landscape.tbl_analysis_type_config
SET
    analysis_perspective = 'DEVELOPMENT',
    analysis_purpose = 'UNDERWRITING',
    tile_valuation = TRUE,
    tile_capitalization = TRUE,
    tile_returns = TRUE,
    tile_development_budget = TRUE,
    requires_capital_stack = TRUE,
    requires_comparable_sales = FALSE,
    requires_income_approach = TRUE,
    requires_cost_approach = TRUE,
    available_reports = '["development_pro_forma", "construction_budget", "draw_schedule", "investor_presentation"]'::jsonb,
    landscaper_context = 'Focus on development budget, hard/soft costs, construction timeline, and phasing. Calculate residual land value, development profit margin, and construction period returns. Model absorption schedule and lease-up. Track construction loan draws and interest carry.',
    updated_at = NOW()
WHERE analysis_type = 'DEVELOPMENT_UNDERWRITING';

INSERT INTO landscape.tbl_analysis_type_config (
    analysis_type,
    analysis_perspective,
    analysis_purpose,
    tile_valuation,
    tile_capitalization,
    tile_returns,
    tile_development_budget,
    requires_capital_stack,
    requires_comparable_sales,
    requires_income_approach,
    requires_cost_approach,
    available_reports,
    landscaper_context,
    created_at,
    updated_at
)
SELECT
    'DEVELOPMENT_UNDERWRITING',
    'DEVELOPMENT',
    'UNDERWRITING',
    TRUE, TRUE, TRUE, TRUE,
    TRUE, FALSE, TRUE, TRUE,
    '["development_pro_forma", "construction_budget", "draw_schedule", "investor_presentation"]'::jsonb,
    'Focus on development budget, hard/soft costs, construction timeline, and phasing. Calculate residual land value, development profit margin, and construction period returns. Model absorption schedule and lease-up. Track construction loan draws and interest carry.',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM landscape.tbl_analysis_type_config
    WHERE analysis_type = 'DEVELOPMENT_UNDERWRITING'
);

ALTER TABLE landscape.tbl_analysis_type_config
    DROP CONSTRAINT IF EXISTS tbl_analysis_type_config_analysis_type_key;

ALTER TABLE landscape.tbl_analysis_type_config
    DROP CONSTRAINT IF EXISTS uq_analysis_config_perspective_purpose;
ALTER TABLE landscape.tbl_analysis_type_config
    ADD CONSTRAINT uq_analysis_config_perspective_purpose
    UNIQUE (analysis_perspective, analysis_purpose);

ALTER TABLE landscape.tbl_analysis_type_config
    DROP CONSTRAINT IF EXISTS chk_config_perspective;
ALTER TABLE landscape.tbl_analysis_type_config
    ADD CONSTRAINT chk_config_perspective
    CHECK (
        analysis_perspective IS NULL
        OR analysis_perspective IN ('INVESTMENT', 'DEVELOPMENT')
    );

ALTER TABLE landscape.tbl_analysis_type_config
    DROP CONSTRAINT IF EXISTS chk_config_purpose;
ALTER TABLE landscape.tbl_analysis_type_config
    ADD CONSTRAINT chk_config_purpose
    CHECK (
        analysis_purpose IS NULL
        OR analysis_purpose IN ('VALUATION', 'UNDERWRITING')
    );

DROP INDEX IF EXISTS landscape.idx_analysis_type_config_type;
CREATE INDEX IF NOT EXISTS idx_analysis_config_perspective_purpose
    ON landscape.tbl_analysis_type_config (analysis_perspective, analysis_purpose);

-- ============================================================================
-- Step 4: Relax deprecated analysis_type constraint on tbl_project
-- ============================================================================
ALTER TABLE landscape.tbl_project
    DROP CONSTRAINT IF EXISTS tbl_project_analysis_type_check;
ALTER TABLE landscape.tbl_project
    ADD CONSTRAINT tbl_project_analysis_type_check
    CHECK (
        analysis_type IS NULL
        OR LENGTH(TRIM(analysis_type)) > 0
    );

COMMENT ON COLUMN landscape.tbl_project.analysis_type IS
    'DEPRECATED - use analysis_perspective + analysis_purpose instead. Retained for backward compatibility during migration.';
"""


REVERSE_SQL = """
-- ============================================================================
-- Reverse Step A: Restore tbl_analysis_type_config legacy shape
-- ============================================================================
DROP INDEX IF EXISTS landscape.idx_analysis_config_perspective_purpose;

ALTER TABLE landscape.tbl_analysis_type_config
    DROP CONSTRAINT IF EXISTS uq_analysis_config_perspective_purpose;
ALTER TABLE landscape.tbl_analysis_type_config
    DROP CONSTRAINT IF EXISTS chk_config_perspective;
ALTER TABLE landscape.tbl_analysis_type_config
    DROP CONSTRAINT IF EXISTS chk_config_purpose;

DELETE FROM landscape.tbl_analysis_type_config
WHERE analysis_type IN (
    'INVESTMENT_VALUATION',
    'INVESTMENT_UNDERWRITING',
    'DEVELOPMENT_VALUATION',
    'DEVELOPMENT_UNDERWRITING'
);

ALTER TABLE landscape.tbl_analysis_type_config
    ADD COLUMN IF NOT EXISTS tile_hbu BOOLEAN;

UPDATE landscape.tbl_analysis_type_config
SET tile_hbu = CASE analysis_type
    WHEN 'DEVELOPMENT' THEN TRUE
    WHEN 'FEASIBILITY' THEN TRUE
    WHEN 'INVESTMENT' THEN FALSE
    WHEN 'VALUATION' THEN TRUE
    WHEN 'VALUE_ADD' THEN FALSE
    ELSE COALESCE(tile_hbu, FALSE)
END;

ALTER TABLE landscape.tbl_analysis_type_config
    DROP COLUMN IF EXISTS analysis_perspective;
ALTER TABLE landscape.tbl_analysis_type_config
    DROP COLUMN IF EXISTS analysis_purpose;

ALTER TABLE landscape.tbl_analysis_type_config
    DROP CONSTRAINT IF EXISTS tbl_analysis_type_config_analysis_type_key;
ALTER TABLE landscape.tbl_analysis_type_config
    ADD CONSTRAINT tbl_analysis_type_config_analysis_type_key
    UNIQUE (analysis_type);

CREATE INDEX IF NOT EXISTS idx_analysis_type_config_type
    ON landscape.tbl_analysis_type_config (analysis_type);

-- ============================================================================
-- Reverse Step B: Restore strict tbl_project.analysis_type check
-- ============================================================================
ALTER TABLE landscape.tbl_project
    DROP CONSTRAINT IF EXISTS tbl_project_analysis_type_check;
ALTER TABLE landscape.tbl_project
    ADD CONSTRAINT tbl_project_analysis_type_check
    CHECK (
        analysis_type IS NULL
        OR analysis_type IN ('VALUATION', 'INVESTMENT', 'VALUE_ADD', 'DEVELOPMENT', 'FEASIBILITY')
    );

ALTER TABLE landscape.tbl_project
    DROP CONSTRAINT IF EXISTS chk_analysis_perspective;
ALTER TABLE landscape.tbl_project
    DROP CONSTRAINT IF EXISTS chk_analysis_purpose;

ALTER TABLE landscape.tbl_project
    DROP COLUMN IF EXISTS analysis_perspective;
ALTER TABLE landscape.tbl_project
    DROP COLUMN IF EXISTS analysis_purpose;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'landscape'
          AND table_name = 'tbl_project'
          AND column_name = 'value_add_enabled'
    ) THEN
        ALTER TABLE landscape.tbl_project
            ALTER COLUMN value_add_enabled DROP NOT NULL;
    END IF;
END
$$;

COMMENT ON COLUMN landscape.tbl_project.analysis_type IS NULL;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0004_add_rbac_fields"),
    ]

    operations = [
        migrations.RunSQL(sql=FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
