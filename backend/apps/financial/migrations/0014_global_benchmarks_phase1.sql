-- Migration: Global Benchmarks Library - Phase 1
-- Date: 2025-11-03
-- Session: OQ24
-- Description: Creates core benchmark infrastructure for Growth Rates, Unit Costs, and Transaction Costs

-- =============================================================================
-- MASTER BENCHMARK REGISTRY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_global_benchmark_registry (
    benchmark_id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,

    -- Categorization
    category VARCHAR(50) NOT NULL,
        -- 'growth_rate', 'transaction_cost', 'unit_cost', 'absorption',
        -- 'contingency', 'market_timing', 'land_use_pricing', 'commission',
        -- 'op_cost', 'income', 'capital_stack', 'debt_standard'
    subcategory VARCHAR(100), -- e.g., 'grading', 'paving' under 'unit_cost'
    benchmark_name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Geographic scope
    market_geography VARCHAR(100), -- 'Phoenix', 'Tucson', NULL = universal

    -- Property type applicability (for op_cost, income benchmarks)
    property_type VARCHAR(50),
        -- 'multifamily', 'retail', 'office', 'industrial', 'mixed_use', 'land', NULL = universal

    -- Source tracking
    source_type VARCHAR(50) NOT NULL,
        -- 'user_input', 'document_extraction', 'project_data', 'system_default'
    source_document_id BIGINT REFERENCES landscape.core_doc(doc_id),
    source_project_id BIGINT REFERENCES landscape.tbl_project(project_id),
    extraction_date DATE,

    -- Quality metrics
    confidence_level VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
    usage_count INTEGER DEFAULT 0, -- How many times applied to projects

    -- Temporal tracking
    as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
    cpi_index_value NUMERIC(10,4), -- CPI at time of benchmark

    -- Context metadata (flexible JSONB)
    context_metadata JSONB,
        -- Examples:
        -- {"quantity": "150K SF", "soil_type": "clay", "season": "summer"}
        -- {"deal_size": "$10M+", "buyer_type": "institutional"}
        -- {"property_class": "Class A", "location": "CBD"}

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_global BOOLEAN DEFAULT false, -- Available across all projects

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,

    -- Constraints
    CONSTRAINT valid_category CHECK (
        category IN (
            'growth_rate', 'transaction_cost', 'unit_cost', 'absorption',
            'contingency', 'market_timing', 'land_use_pricing', 'commission',
            'op_cost', 'income', 'capital_stack', 'debt_standard'
        )
    ),
    CONSTRAINT valid_confidence CHECK (
        confidence_level IN ('high', 'medium', 'low')
    ),
    CONSTRAINT valid_source_type CHECK (
        source_type IN ('user_input', 'document_extraction', 'project_data', 'system_default')
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_benchmark_registry_user ON landscape.tbl_global_benchmark_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_registry_category ON landscape.tbl_global_benchmark_registry(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_benchmark_registry_geography ON landscape.tbl_global_benchmark_registry(market_geography);
CREATE INDEX IF NOT EXISTS idx_benchmark_registry_property_type ON landscape.tbl_global_benchmark_registry(property_type);
CREATE INDEX IF NOT EXISTS idx_benchmark_registry_active ON landscape.tbl_global_benchmark_registry(is_active);
CREATE INDEX IF NOT EXISTS idx_benchmark_registry_as_of_date ON landscape.tbl_global_benchmark_registry(as_of_date);

COMMENT ON TABLE landscape.tbl_global_benchmark_registry IS
'Master registry for all user-defined benchmarks. Links to category-specific detail tables.';

-- =============================================================================
-- UNIT COST BENCHMARKS (Phase 1)
-- =============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_benchmark_unit_cost (
    unit_cost_id BIGSERIAL PRIMARY KEY,
    benchmark_id BIGINT NOT NULL REFERENCES landscape.tbl_global_benchmark_registry(benchmark_id) ON DELETE CASCADE,

    -- Value and unit
    value NUMERIC(12,2) NOT NULL,
    uom_code VARCHAR(20) NOT NULL, -- '$/SF', '$/FF', '$/LOT', '$/ACRE', '$/CY'
    uom_alt_code VARCHAR(20), -- Alternative basis (e.g., '$/UNIT', '%_COST')

    -- Range/confidence bounds
    low_value NUMERIC(12,2),
    high_value NUMERIC(12,2),

    -- Applicability filters
    cost_phase VARCHAR(50), -- 'planning', 'site_work', 'utilities', 'paving', 'landscaping'
    work_type VARCHAR(100), -- 'grading', 'underground_utilities', 'asphalt_paving'

    -- Created/updated
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_cost_benchmark ON landscape.tbl_benchmark_unit_cost(benchmark_id);
CREATE INDEX IF NOT EXISTS idx_unit_cost_phase ON landscape.tbl_benchmark_unit_cost(cost_phase);
CREATE INDEX IF NOT EXISTS idx_unit_cost_work_type ON landscape.tbl_benchmark_unit_cost(work_type);

COMMENT ON TABLE landscape.tbl_benchmark_unit_cost IS
'Detail table for construction/development unit cost benchmarks';

-- =============================================================================
-- TRANSACTION COST BENCHMARKS (Phase 1)
-- =============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_benchmark_transaction_cost (
    transaction_cost_id BIGSERIAL PRIMARY KEY,
    benchmark_id BIGINT NOT NULL REFERENCES landscape.tbl_global_benchmark_registry(benchmark_id) ON DELETE CASCADE,

    -- Cost specification
    cost_type VARCHAR(50) NOT NULL,
        -- 'closing_costs', 'title_insurance', 'legal', 'due_diligence', 'broker_fee'

    -- Value basis
    value NUMERIC(8,4), -- Percentage or flat amount
    value_type VARCHAR(20) NOT NULL, -- 'percentage', 'flat_fee', 'per_unit'
    basis VARCHAR(50), -- 'purchase_price', 'sale_price', 'loan_amount'

    -- Range by deal size
    deal_size_min NUMERIC(12,2),
    deal_size_max NUMERIC(12,2),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_value_type CHECK (
        value_type IN ('percentage', 'flat_fee', 'per_unit')
    )
);

CREATE INDEX IF NOT EXISTS idx_transaction_cost_benchmark ON landscape.tbl_benchmark_transaction_cost(benchmark_id);
CREATE INDEX IF NOT EXISTS idx_transaction_cost_type ON landscape.tbl_benchmark_transaction_cost(cost_type);

COMMENT ON TABLE landscape.tbl_benchmark_transaction_cost IS
'Transaction cost benchmarks (closing, title, legal, etc.) scaled by deal size';

-- =============================================================================
-- AI SUGGESTION QUEUE (Phase 1)
-- =============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_benchmark_ai_suggestions (
    suggestion_id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,

    -- Source document
    document_id BIGINT NOT NULL REFERENCES landscape.core_doc(doc_id),
    project_id BIGINT REFERENCES landscape.tbl_project(project_id),
    extraction_date TIMESTAMP DEFAULT NOW(),

    -- Suggested benchmark
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(100),
    suggested_name VARCHAR(200) NOT NULL,
    suggested_value NUMERIC(12,4) NOT NULL,
    suggested_uom VARCHAR(20),
    market_geography VARCHAR(100),
    property_type VARCHAR(50),

    -- AI confidence and context
    confidence_score NUMERIC(3,2), -- 0.00 to 1.00
    extraction_context JSONB,
        -- {"quantity": "150K SF", "soil_type": "clay", "page": 14, "line_item": "Grading"}

    -- Comparison to existing benchmarks
    existing_benchmark_id BIGINT REFERENCES landscape.tbl_global_benchmark_registry(benchmark_id),
    variance_percentage NUMERIC(6,2), -- % difference from existing
    inflation_adjusted_comparison JSONB,
        -- {
        --   "existing_value": 2.50,
        --   "existing_date": "2023-03-15",
        --   "cpi_factor": 1.082,
        --   "inflation_adjusted": 2.71,
        --   "suggested_value": 2.85,
        --   "real_premium_pct": 5.2
        -- }

    -- User interaction
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'modified'
    user_response JSONB,
        -- {"action": "approved", "notes": "Clay soil premium makes sense"}
        -- {"action": "variant", "variant_name": "Grading - Clay Soil"}
        -- {"action": "rejected", "reason": "One-off small quantity"}
    reviewed_at TIMESTAMP,
    reviewed_by TEXT,

    -- Result
    created_benchmark_id BIGINT REFERENCES landscape.tbl_global_benchmark_registry(benchmark_id),

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_suggestion_status CHECK (
        status IN ('pending', 'approved', 'rejected', 'modified')
    ),
    CONSTRAINT valid_category_suggestion CHECK (
        category IN (
            'growth_rate', 'transaction_cost', 'unit_cost', 'absorption',
            'contingency', 'market_timing', 'land_use_pricing', 'commission',
            'op_cost', 'income', 'capital_stack', 'debt_standard'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestion_user ON landscape.tbl_benchmark_ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_status ON landscape.tbl_benchmark_ai_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_document ON landscape.tbl_benchmark_ai_suggestions(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_category ON landscape.tbl_benchmark_ai_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_extraction_date ON landscape.tbl_benchmark_ai_suggestions(extraction_date);

COMMENT ON TABLE landscape.tbl_benchmark_ai_suggestions IS
'Queue of AI-extracted benchmarks pending user review and approval';

-- =============================================================================
-- LINK EXISTING TABLES TO BENCHMARK REGISTRY
-- =============================================================================

-- Add benchmark_id and geography to growth rate sets
DO $$
BEGIN
    -- Add benchmark_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'landscape'
        AND table_name = 'core_fin_growth_rate_sets'
        AND column_name = 'benchmark_id'
    ) THEN
        ALTER TABLE landscape.core_fin_growth_rate_sets
        ADD COLUMN benchmark_id BIGINT REFERENCES landscape.tbl_global_benchmark_registry(benchmark_id);
    END IF;

    -- Add market_geography column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'landscape'
        AND table_name = 'core_fin_growth_rate_sets'
        AND column_name = 'market_geography'
    ) THEN
        ALTER TABLE landscape.core_fin_growth_rate_sets
        ADD COLUMN market_geography VARCHAR(100);
    END IF;

    -- Add is_global column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'landscape'
        AND table_name = 'core_fin_growth_rate_sets'
        AND column_name = 'is_global'
    ) THEN
        ALTER TABLE landscape.core_fin_growth_rate_sets
        ADD COLUMN is_global BOOLEAN DEFAULT false;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_growth_rate_benchmark ON landscape.core_fin_growth_rate_sets(benchmark_id);
CREATE INDEX IF NOT EXISTS idx_growth_rate_geography ON landscape.core_fin_growth_rate_sets(market_geography);

-- Add benchmark_id and geography to land use pricing
DO $$
BEGIN
    -- Add benchmark_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'landscape'
        AND table_name = 'land_use_pricing'
        AND column_name = 'benchmark_id'
    ) THEN
        ALTER TABLE landscape.land_use_pricing
        ADD COLUMN benchmark_id BIGINT REFERENCES landscape.tbl_global_benchmark_registry(benchmark_id);
    END IF;

    -- Add market_geography column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'landscape'
        AND table_name = 'land_use_pricing'
        AND column_name = 'market_geography'
    ) THEN
        ALTER TABLE landscape.land_use_pricing
        ADD COLUMN market_geography VARCHAR(100);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_land_use_pricing_benchmark ON landscape.land_use_pricing(benchmark_id);
CREATE INDEX IF NOT EXISTS idx_land_use_pricing_geography ON landscape.land_use_pricing(market_geography);

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

COMMENT ON SCHEMA landscape IS 'Landscape Application Schema - Global Benchmarks Phase 1 Migration Applied';
