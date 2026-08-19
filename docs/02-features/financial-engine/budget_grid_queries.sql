-- ============================================================================
-- BUDGET GRID UI - SQL QUERIES & VIEWS
-- ============================================================================
-- Purpose: SQL support for Budget Grid spreadsheet interface
-- Database: PostgreSQL (Neon)
-- Schema: Uses core_fin_* tables (NOT legacy tbl_budget_*)
-- Date: 2025-10-02
-- ============================================================================

-- ============================================================================
-- VIEW 1: Budget Items with Category Hierarchy
-- ============================================================================
-- Purpose: Flatten budget items with full category path for grid display
-- Used by: GET /api/budget/items/:projectId

CREATE OR REPLACE VIEW vw_budget_grid_items AS
WITH RECURSIVE category_path AS (
    -- Base case: top-level categories (no parent)
    SELECT 
        category_id,
        parent_id,
        code,
        scope,
        detail,
        ARRAY[detail] as path_array,
        detail as full_path,
        1 as depth
    FROM core_fin_category
    WHERE parent_id IS NULL AND is_active = true
    
    UNION ALL
    
    -- Recursive case: child categories
    SELECT 
        c.category_id,
        c.parent_id,
        c.code,
        c.scope,
        c.detail,
        cp.path_array || c.detail,
        cp.full_path || ' → ' || c.detail,
        cp.depth + 1
    FROM core_fin_category c
    INNER JOIN category_path cp ON c.parent_id = cp.category_id
    WHERE c.is_active = true
)
SELECT 
    fb.fact_id,
    fb.budget_id,
    bv.name as budget_version,
    fb.pe_level,
    fb.pe_id,
    fb.category_id,
    cp.code as cost_code,
    cp.scope,
    cp.full_path as category_path,
    cp.depth as category_depth,
    fb.uom_code,
    m.display_name as uom_display,
    fb.qty,
    fb.rate,
    fb.amount,
    COALESCE(fb.qty * fb.rate, fb.amount) as calculated_amount,
    fb.start_date,
    fb.end_date,
    EXTRACT(YEAR FROM AGE(fb.end_date, fb.start_date)) * 12 + 
    EXTRACT(MONTH FROM AGE(fb.end_date, fb.start_date)) as duration_months,
    fb.escalation_rate,
    fb.contingency_pct,
    fb.timing_method,
    fb.contract_number,
    fb.purchase_order,
    fb.is_committed,
    fb.confidence_level,
    fb.vendor_contact_id,
    c.company_name as vendor_name,
    fb.notes,
    fs.type as funding_type,
    fs.subclass as funding_subclass,
    fb.created_at,
    -- Period calculations for EstateMaster-style timing
    cp_start.period_sequence as start_period,
    cp_end.period_sequence as end_period,
    (cp_end.period_sequence - cp_start.period_sequence + 1) as span_periods
FROM core_fin_fact_budget fb
INNER JOIN core_fin_budget_version bv ON fb.budget_id = bv.budget_id
INNER JOIN category_path cp ON fb.category_id = cp.category_id
LEFT JOIN tbl_measures m ON fb.uom_code = m.measure_code
LEFT JOIN tbl_contacts c ON fb.vendor_contact_id = c.contact_id
LEFT JOIN core_fin_funding_source fs ON fb.funding_id = fs.funding_id
LEFT JOIN tbl_calculation_period cp_start 
    ON fb.start_date BETWEEN cp_start.period_start_date AND cp_start.period_end_date
LEFT JOIN tbl_calculation_period cp_end 
    ON fb.end_date BETWEEN cp_end.period_start_date AND cp_end.period_end_date
WHERE bv.status = 'active';

COMMENT ON VIEW vw_budget_grid_items IS 
'Comprehensive view for Budget Grid UI - includes category hierarchy, calculations, and period mappings';

-- ============================================================================
-- VIEW 2: Budget Variance Analysis (Original vs Current)
-- ============================================================================
-- Purpose: Compare budget versions for variance tracking
-- Used by: Grid variance column calculations

CREATE OR REPLACE VIEW vw_budget_variance AS
WITH original_budget AS (
    SELECT 
        fb.category_id,
        fb.pe_level,
        fb.pe_id,
        SUM(fb.amount) as original_amount
    FROM core_fin_fact_budget fb
    INNER JOIN core_fin_budget_version bv ON fb.budget_id = bv.budget_id
    WHERE bv.name = 'Original' AND bv.status = 'active'
    GROUP BY fb.category_id, fb.pe_level, fb.pe_id
),
current_budget AS (
    SELECT 
        fb.fact_id,
        fb.category_id,
        fb.pe_level,
        fb.pe_id,
        fb.amount as current_amount
    FROM core_fin_fact_budget fb
    INNER JOIN core_fin_budget_version bv ON fb.budget_id = bv.budget_id
    WHERE bv.name = 'Forecast' AND bv.status = 'active'
)
SELECT 
    cb.fact_id,
    cb.category_id,
    cb.pe_level,
    cb.pe_id,
    COALESCE(ob.original_amount, 0) as original_amount,
    cb.current_amount,
    (cb.current_amount - COALESCE(ob.original_amount, 0)) as variance_amount,
    CASE 
        WHEN ob.original_amount > 0 THEN 
            ROUND(((cb.current_amount - ob.original_amount) / ob.original_amount * 100)::numeric, 2)
        ELSE NULL 
    END as variance_percent,
    CASE 
        WHEN cb.current_amount < COALESCE(ob.original_amount, 0) THEN 'under'
        WHEN cb.current_amount > COALESCE(ob.original_amount, 0) THEN 'over'
        ELSE 'on_budget'
    END as variance_status
FROM current_budget cb
LEFT JOIN original_budget ob 
    ON cb.category_id = ob.category_id 
    AND cb.pe_level = ob.pe_level 
    AND cb.pe_id = ob.pe_id;

COMMENT ON VIEW vw_budget_variance IS 
'Variance tracking between Original and Forecast budgets for grid display';

-- ============================================================================
-- VIEW 3: Category Subtotals (Hierarchical Rollup)
-- ============================================================================
-- Purpose: Calculate subtotals at each category level for group rows
-- Used by: GroupRow component display logic

CREATE OR REPLACE VIEW vw_budget_category_subtotals AS
WITH RECURSIVE category_tree AS (
    -- Leaf categories (no children)
    SELECT 
        c.category_id,
        c.parent_id,
        c.scope,
        c.detail,
        c.code,
        ARRAY[c.category_id] as category_path,
        0 as level
    FROM core_fin_category c
    WHERE c.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM core_fin_category child 
        WHERE child.parent_id = c.category_id AND child.is_active = true
    )
    
    UNION ALL
    
    -- Parent categories
    SELECT 
        c.category_id,
        c.parent_id,
        c.scope,
        c.detail,
        c.code,
        c.category_id || ct.category_path,
        ct.level + 1
    FROM core_fin_category c
    INNER JOIN category_tree ct ON c.category_id = ct.parent_id
    WHERE c.is_active = true
)
SELECT 
    ct.category_id,
    ct.parent_id,
    ct.scope,
    ct.detail,
    ct.code,
    ct.level,
    COUNT(fb.fact_id) as item_count,
    SUM(COALESCE(fb.amount, fb.qty * fb.rate)) as subtotal_amount,
    SUM(COALESCE(fb.qty, 0)) as total_quantity,
    MIN(fb.start_date) as earliest_start,
    MAX(fb.end_date) as latest_end
FROM category_tree ct
LEFT JOIN core_fin_fact_budget fb ON fb.category_id = ct.category_id
LEFT JOIN core_fin_budget_version bv ON fb.budget_id = bv.budget_id 
    AND bv.status = 'active'
GROUP BY ct.category_id, ct.parent_id, ct.scope, ct.detail, ct.code, ct.level
ORDER BY ct.scope, ct.code;

COMMENT ON VIEW vw_budget_category_subtotals IS 
'Hierarchical category subtotals for expandable group rows in Budget Grid';

-- ============================================================================
-- QUERY 1: Fetch Budget Items for Grid (Main Query)
-- ============================================================================
-- Purpose: Primary data fetch for Budget Grid with all necessary joins
-- Used by: GET /api/budget/items/:projectId
-- Parameters: $1=project_id, $2=scope_filter, $3=budget_version

PREPARE fetch_budget_grid_items (INT, TEXT, TEXT) AS
SELECT 
    vbgi.*,
    vbv.original_amount,
    vbv.variance_amount,
    vbv.variance_percent,
    vbv.variance_status,
    -- Category hierarchy info for grouping
    parent_cat.detail as parent_category_name,
    parent_cat.code as parent_category_code,
    -- Timing allocation summary
    (
        SELECT COUNT(*) 
        FROM tbl_budget_timing bt 
        WHERE bt.fact_id = vbgi.fact_id
    ) as period_count,
    (
        SELECT SUM(bt.amount) 
        FROM tbl_budget_timing bt 
        WHERE bt.fact_id = vbgi.fact_id
    ) as allocated_amount
FROM vw_budget_grid_items vbgi
LEFT JOIN vw_budget_variance vbv ON vbgi.fact_id = vbv.fact_id
LEFT JOIN core_fin_category parent_cat ON parent_cat.category_id = (
    SELECT parent_id FROM core_fin_category WHERE category_id = vbgi.category_id
)
WHERE vbgi.pe_level = 'project' 
  AND vbgi.pe_id = $1::TEXT
  AND ($2 IS NULL OR vbgi.scope = $2)
  AND ($3 IS NULL OR vbgi.budget_version = $3)
ORDER BY 
    vbgi.scope,
    vbgi.category_depth,
    vbgi.cost_code,
    vbgi.fact_id;

-- ============================================================================
-- QUERY 2: Fetch Category Hierarchy for Cost Code Selector
-- ============================================================================
-- Purpose: Populate cost code dropdown with hierarchical structure
-- Used by: GET /api/budget/categories

PREPARE fetch_category_hierarchy (TEXT, BOOLEAN) AS
WITH RECURSIVE category_tree AS (
    SELECT 
        c.category_id,
        c.parent_id,
        c.code,
        c.scope,
        c.detail,
        c.kind,
        c.is_active,
        0 as depth,
        ARRAY[c.code] as path_codes,
        c.detail as display_label
    FROM core_fin_category c
    WHERE c.parent_id IS NULL
    
    UNION ALL
    
    SELECT 
        c.category_id,
        c.parent_id,
        c.code,
        c.scope,
        c.detail,
        c.kind,
        c.is_active,
        ct.depth + 1,
        ct.path_codes || c.code,
        ct.display_label || ' → ' || c.detail
    FROM core_fin_category c
    INNER JOIN category_tree ct ON c.parent_id = ct.category_id
)
SELECT 
    category_id,
    parent_id,
    code,
    scope,
    detail,
    kind,
    depth,
    array_to_string(path_codes, '.') as code_path,
    display_label
FROM category_tree
WHERE ($1 IS NULL OR scope = $1)
  AND ($2 IS FALSE OR is_active = true)
ORDER BY scope, depth, code;

-- ============================================================================
-- QUERY 3: Recently Used Cost Codes (User-Specific)
-- ============================================================================
-- Purpose: Show recently used cost codes at top of dropdown
-- Used by: DropdownCell component

PREPARE fetch_recent_cost_codes (INT, INT) AS
SELECT DISTINCT
    c.category_id,
    c.code,
    c.scope,
    c.detail,
    COUNT(*) as usage_count,
    MAX(fb.created_at) as last_used
FROM core_fin_fact_budget fb
INNER JOIN core_fin_category c ON fb.category_id = c.category_id
WHERE fb.pe_level = 'project' 
  AND fb.pe_id = $1::TEXT
  AND c.is_active = true
GROUP BY c.category_id, c.code, c.scope, c.detail
ORDER BY last_used DESC
LIMIT $2;

-- ============================================================================
-- QUERY 4: Insert New Budget Line Item
-- ============================================================================
-- Purpose: Create new budget fact with validation
-- Used by: POST /api/budget/items

PREPARE insert_budget_item (
    BIGINT,      -- $1: budget_id
    TEXT,        -- $2: pe_level
    TEXT,        -- $3: pe_id
    BIGINT,      -- $4: category_id
    TEXT,        -- $5: uom_code
    NUMERIC,     -- $6: qty
    NUMERIC,     -- $7: rate
    NUMERIC,     -- $8: amount
    DATE,        -- $9: start_date
    DATE,        -- $10: end_date
    NUMERIC,     -- $11: escalation_rate
    NUMERIC,     -- $12: contingency_pct
    TEXT,        -- $13: timing_method
    TEXT         -- $14: notes
) AS
INSERT INTO core_fin_fact_budget (
    budget_id,
    pe_level,
    pe_id,
    category_id,
    uom_code,
    qty,
    rate,
    amount,
    start_date,
    end_date,
    escalation_rate,
    contingency_pct,
    timing_method,
    notes,
    created_at
) VALUES (
    $1,
    $2::pe_hierarchy_level,
    $3,
    $4,
    COALESCE($5, 'EA'),
    $6,
    $7,
    COALESCE($8, $6 * $7),  -- Auto-calculate amount if not provided
    $9,
    $10,
    COALESCE($11, 0),
    COALESCE($12, 0),
    COALESCE($13, 'distributed'),
    $14,
    NOW()
) RETURNING *;

-- ============================================================================
-- QUERY 5: Update Budget Line Item (Partial)
-- ============================================================================
-- Purpose: Update specific fields, recalculate amount if qty/rate changed
-- Used by: PUT /api/budget/items/:factId

CREATE OR REPLACE FUNCTION update_budget_item(
    p_fact_id BIGINT,
    p_category_id BIGINT DEFAULT NULL,
    p_qty NUMERIC DEFAULT NULL,
    p_rate NUMERIC DEFAULT NULL,
    p_amount NUMERIC DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_escalation_rate NUMERIC DEFAULT NULL,
    p_contingency_pct NUMERIC DEFAULT NULL,
    p_timing_method TEXT DEFAULT NULL,
    p_contract_number TEXT DEFAULT NULL,
    p_purchase_order TEXT DEFAULT NULL,
    p_confidence_level TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS TABLE (
    fact_id BIGINT,
    category_id BIGINT,
    qty NUMERIC,
    rate NUMERIC,
    amount NUMERIC,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    v_current_qty NUMERIC;
    v_current_rate NUMERIC;
    v_new_amount NUMERIC;
BEGIN
    -- Get current values
    SELECT fb.qty, fb.rate INTO v_current_qty, v_current_rate
    FROM core_fin_fact_budget fb
    WHERE fb.fact_id = p_fact_id;
    
    -- Calculate new amount based on what changed
    IF p_qty IS NOT NULL OR p_rate IS NOT NULL THEN
        v_new_amount := COALESCE(p_qty, v_current_qty) * COALESCE(p_rate, v_current_rate);
    ELSE
        v_new_amount := p_amount;
    END IF;
    
    -- Update with calculated values
    RETURN QUERY
    UPDATE core_fin_fact_budget fb
    SET 
        category_id = COALESCE(p_category_id, fb.category_id),
        qty = COALESCE(p_qty, fb.qty),
        rate = COALESCE(p_rate, fb.rate),
        amount = COALESCE(v_new_amount, fb.amount),
        start_date = COALESCE(p_start_date, fb.start_date),
        end_date = COALESCE(p_end_date, fb.end_date),
        escalation_rate = COALESCE(p_escalation_rate, fb.escalation_rate),
        contingency_pct = COALESCE(p_contingency_pct, fb.contingency_pct),
        timing_method = COALESCE(p_timing_method, fb.timing_method),
        contract_number = COALESCE(p_contract_number, fb.contract_number),
        purchase_order = COALESCE(p_purchase_order, fb.purchase_order),
        confidence_level = COALESCE(p_confidence_level, fb.confidence_level),
        notes = COALESCE(p_notes, fb.notes),
        updated_at = NOW()
    WHERE fb.fact_id = p_fact_id
    RETURNING 
        fb.fact_id,
        fb.category_id,
        fb.qty,
        fb.rate,
        fb.amount,
        NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_budget_item IS 
'Partial update with automatic amount recalculation when qty or rate changes';

-- ============================================================================
-- QUERY 6: Delete Budget Line Item (Validation)
-- ============================================================================
-- Purpose: Soft delete with business rule validation
-- Used by: DELETE /api/budget/items/:factId

CREATE OR REPLACE FUNCTION delete_budget_item(
    p_fact_id BIGINT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_has_actuals BOOLEAN;
    v_is_committed BOOLEAN;
BEGIN
    -- Check business rules
    SELECT 
        EXISTS(SELECT 1 FROM tbl_budget_timing WHERE fact_id = p_fact_id),
        is_committed
    INTO v_has_actuals, v_is_committed
    FROM core_fin_fact_budget
    WHERE fact_id = p_fact_id;
    
    -- Validation: Cannot delete if committed or has actuals
    IF v_is_committed THEN
        RETURN QUERY SELECT false, 'Cannot delete committed budget item';
        RETURN;
    END IF;
    
    IF v_has_actuals THEN
        RETURN QUERY SELECT false, 'Cannot delete budget item with actual transactions';
        RETURN;
    END IF;
    
    -- Safe to delete
    DELETE FROM core_fin_fact_budget WHERE fact_id = p_fact_id;
    
    RETURN QUERY SELECT true, 'Budget item deleted successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_budget_item IS 
'Safe delete with business rule validation for committed items';

-- ============================================================================
-- QUERY 7: Fetch Calculation Periods for Project
-- ============================================================================
-- Purpose: Get period definitions for timing dropdowns
-- Used by: Start Period / Span selectors

PREPARE fetch_calculation_periods (BIGINT) AS
SELECT 
    period_id,
    period_sequence,
    period_start_date,
    period_end_date,
    period_type,
    TO_CHAR(period_start_date, 'Mon YYYY') as period_label
FROM tbl_calculation_period
WHERE project_id = $1
ORDER BY period_sequence;

-- ============================================================================
-- QUERY 8: Fetch Units of Measure
-- ============================================================================
-- Purpose: Populate UOM dropdown
-- Used by: DropdownCell for UOM selection

PREPARE fetch_uom_codes AS
SELECT 
    measure_code,
    display_name,
    measure_type,
    is_active
FROM tbl_measures
WHERE is_active = true
ORDER BY 
    CASE measure_type
        WHEN 'area' THEN 1
        WHEN 'linear' THEN 2
        WHEN 'volume' THEN 3
        WHEN 'count' THEN 4
        WHEN 'time' THEN 5
        ELSE 6
    END,
    display_name;

-- ============================================================================
-- QUERY 9: Fetch Budget Versions for Project
-- ============================================================================
-- Purpose: Get available budget versions for version selector
-- Used by: VersionSelector dropdown

PREPARE fetch_budget_versions (BIGINT) AS
SELECT 
    budget_id,
    name,
    as_of,
    status,
    created_at
FROM core_fin_budget_version
WHERE budget_id IN (
    SELECT DISTINCT budget_id 
    FROM core_fin_fact_budget 
    WHERE pe_level = 'project' AND pe_id = $1::TEXT
)
ORDER BY 
    CASE name
        WHEN 'Original' THEN 1
        WHEN 'Revised' THEN 2
        WHEN 'Forecast' THEN 3
        ELSE 4
    END,
    created_at DESC;

-- ============================================================================
-- QUERY 10: Validate Budget Item Before Save
-- ============================================================================
-- Purpose: Client-side + server-side validation
-- Used by: Pre-save validation in API

CREATE OR REPLACE FUNCTION validate_budget_item(
    p_category_id BIGINT,
    p_qty NUMERIC,
    p_rate NUMERIC,
    p_amount NUMERIC,
    p_start_date DATE,
    p_end_date DATE,
    p_escalation_rate NUMERIC,
    p_contingency_pct NUMERIC,
    p_project_id BIGINT
) RETURNS TABLE (
    is_valid BOOLEAN,
    error_code TEXT,
    error_message TEXT
) AS $$
DECLARE
    v_max_period INT;
    v_category_exists BOOLEAN;
BEGIN
    -- Check 1: Category exists and is active
    SELECT EXISTS(
        SELECT 1 FROM core_fin_category 
        WHERE category_id = p_category_id AND is_active = true
    ) INTO v_category_exists;
    
    IF NOT v_category_exists THEN
        RETURN QUERY SELECT false, 'INVALID_CATEGORY', 'Cost code does not exist or is inactive';
        RETURN;
    END IF;
    
    -- Check 2: Amount consistency (if qty/rate provided, amount must match)
    IF p_qty IS NOT NULL AND p_rate IS NOT NULL THEN
        IF ABS((p_qty * p_rate) - COALESCE(p_amount, p_qty * p_rate)) > 0.01 THEN
            RETURN QUERY SELECT false, 'AMOUNT_MISMATCH', 
                'Amount must equal Quantity × Rate (±$0.01)';
            RETURN;
        END IF;
    END IF;
    
    -- Check 3: Quantity must be positive
    IF p_qty IS NOT NULL AND p_qty <= 0 THEN
        RETURN QUERY SELECT false, 'INVALID_QTY', 'Quantity must be greater than 0';
        RETURN;
    END IF;
    
    -- Check 4: Rate must be positive
    IF p_rate IS NOT NULL AND p_rate <= 0 THEN
        RETURN QUERY SELECT false, 'INVALID_RATE', 'Rate must be greater than 0';
        RETURN;
    END IF;
    
    -- Check 5: Date range validity
    IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
        IF p_end_date < p_start_date THEN
            RETURN QUERY SELECT false, 'INVALID_DATE_RANGE', 
                'End date must be after start date';
            RETURN;
        END IF;
        
        -- Check 6: Dates within project bounds
        SELECT MAX(period_sequence) INTO v_max_period
        FROM tbl_calculation_period
        WHERE project_id = p_project_id;
        
        IF NOT EXISTS (
            SELECT 1 FROM tbl_calculation_period
            WHERE project_id = p_project_id
            AND p_start_date BETWEEN period_start_date AND period_end_date
        ) THEN
            RETURN QUERY SELECT false, 'START_OUT_OF_BOUNDS', 
                'Start date is outside project timeline';
            RETURN;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM tbl_calculation_period
            WHERE project_id = p_project_id
            AND p_end_date BETWEEN period_start_date AND period_end_date
        ) THEN
            RETURN QUERY SELECT false, 'END_OUT_OF_BOUNDS', 
                'End date is outside project timeline';
            RETURN;
        END IF;
    END IF;
    
    -- Check 7: Escalation rate bounds (0-100%)
    IF p_escalation_rate IS NOT NULL AND (p_escalation_rate < 0 OR p_escalation_rate > 100) THEN
        RETURN QUERY SELECT false, 'INVALID_ESCALATION', 
            'Escalation rate must be between 0% and 100%';
        RETURN;
    END IF;
    
    -- Check 8: Contingency bounds (0-50%)
    IF p_contingency_pct IS NOT NULL AND (p_contingency_pct < 0 OR p_contingency_pct > 50) THEN
        RETURN QUERY SELECT false, 'INVALID_CONTINGENCY', 
            'Contingency must be between 0% and 50%';
        RETURN;
    END IF;
    
    -- All checks passed
    RETURN QUERY SELECT true, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_budget_item IS 
'Comprehensive validation for budget items before insert/update';

-- ============================================================================
-- HELPER: Create Indexes for Performance
-- ============================================================================
-- Purpose: Optimize query performance for Budget Grid

CREATE INDEX IF NOT EXISTS idx_fact_budget_pe 
    ON core_fin_fact_budget(pe_level, pe_id, category_id);

CREATE INDEX IF NOT EXISTS idx_fact_budget_category 
    ON core_fin_fact_budget(category_id, budget_id);

CREATE INDEX IF NOT EXISTS idx_fact_budget_dates 
    ON core_fin_fact_budget(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_category_parent 
    ON core_fin_category(parent_id, scope, is_active);

CREATE INDEX IF NOT EXISTS idx_budget_timing_fact 
    ON tbl_budget_timing(fact_id, period_id);

-- ============================================================================
-- HELPER: Trigger for Automatic Amount Calculation
-- ============================================================================
-- Purpose: Auto-calculate amount when qty or rate changes

CREATE OR REPLACE FUNCTION trg_calculate_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- If qty and rate are provided, calculate amount
    IF NEW.qty IS NOT NULL AND NEW.rate IS NOT NULL THEN
        NEW.amount := NEW.qty * NEW.rate;
    END IF;
    
    -- Ensure at least amount or (qty + rate) is provided
    IF NEW.amount IS NULL AND (NEW.qty IS NULL OR NEW.rate IS NULL) THEN
        RAISE EXCEPTION 'Must provide either amount OR (quantity + rate)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_budget_calculate_amount
    BEFORE INSERT OR UPDATE ON core_fin_fact_budget
    FOR EACH ROW
    EXECUTE FUNCTION trg_calculate_amount();

COMMENT ON TRIGGER trg_budget_calculate_amount ON core_fin_fact_budget IS
'Automatically calculate amount = qty × rate when both are provided';

-- ============================================================================
-- END OF BUDGET GRID QUERIES
-- ============================================================================
