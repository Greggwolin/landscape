-- Migration 014: Capitalization Tab Sample Data for Project 11
-- Date: 2025-10-23
-- Session: JW22
-- Purpose: Insert sample debt, equity, waterfall, and draw schedule data for multifamily prototype

BEGIN;

-- 1. Insert sample debt facility for Project 11
-- Construction loan with typical multifamily terms
INSERT INTO landscape.tbl_debt_facility (
    project_id,
    facility_name,
    facility_type,
    lender_name,
    commitment_amount,
    interest_rate,
    interest_calculation,
    payment_frequency,
    commitment_date,
    maturity_date,
    origination_fee_pct,
    unused_fee_pct,
    draw_trigger_type,
    interest_payment_method,
    covenants,
    notes
) VALUES (
    11,
    'Construction Loan',
    'CONSTRUCTION',
    'Regional Bank Capital',
    10500000.00,           -- $10.5M loan
    0.0575,                 -- 5.75% interest rate (stored as decimal)
    'SIMPLE',
    'MONTHLY',
    '2025-01-01',
    '2026-12-31',
    0.0100,                 -- 1% origination fee
    0.0050,                 -- 0.5% unused fee
    'COST_INCURRED',
    'accrued_simple',
    '{
        "ltv_pct": 70,
        "dscr": 1.25,
        "loan_covenant_dscr_min": 1.20,
        "loan_covenant_ltv_max": 75
    }'::jsonb,
    'Primary construction financing for multifamily development'
)
ON CONFLICT DO NOTHING;

-- Get the facility_id we just created (or existing one)
DO $$
DECLARE
    v_facility_id BIGINT;
    v_equity_structure_id BIGINT;
    v_period_ids BIGINT[];
    v_period_count INT;
BEGIN
    -- Check if calculation periods exist for Project 11
    SELECT COUNT(*) INTO v_period_count
    FROM landscape.tbl_calculation_period
    WHERE project_id = 11;

    -- If no periods exist, create basic monthly periods for 24 months
    IF v_period_count < 12 THEN
        FOR i IN 1..24 LOOP
            INSERT INTO landscape.tbl_calculation_period (
                project_id,
                period_sequence,
                period_type,
                period_start_date,
                period_end_date,
                period_status
            ) VALUES (
                11,
                i,
                'MONTHLY',
                DATE '2025-01-01' + ((i-1) || ' months')::INTERVAL,
                DATE '2025-01-01' + (i || ' months')::INTERVAL - INTERVAL '1 day',
                'OPEN'
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Get first 12 period IDs for Project 11
    SELECT ARRAY_AGG(period_id ORDER BY period_sequence)
    INTO v_period_ids
    FROM (
        SELECT period_id, period_sequence
        FROM landscape.tbl_calculation_period
        WHERE project_id = 11
        ORDER BY period_sequence
        LIMIT 12
    ) sub;

    -- Get facility_id
    SELECT facility_id INTO v_facility_id
    FROM landscape.tbl_debt_facility
    WHERE project_id = 11 AND facility_name = 'Construction Loan'
    LIMIT 1;

    -- 2. Insert equity structure for Project 11
    INSERT INTO landscape.tbl_equity_structure (
        project_id,
        lp_ownership_pct,
        gp_ownership_pct,
        preferred_return_pct,
        gp_promote_after_pref,
        catch_up_pct,
        irr_target_pct,
        distribution_frequency
    ) VALUES (
        11,
        90.00,              -- LP owns 90%
        10.00,              -- GP owns 10%
        8.000,              -- 8% preferred return
        20.00,              -- 20% GP promote after pref
        50.00,              -- 50% GP catch-up
        15.000,             -- 15% IRR target
        'Quarterly'
    )
    ON CONFLICT DO NOTHING;

    -- Get equity_structure_id
    SELECT equity_structure_id INTO v_equity_structure_id
    FROM landscape.tbl_equity_structure
    WHERE project_id = 11
    LIMIT 1;

    -- 3. Insert equity partners (LP and GP)
    INSERT INTO landscape.tbl_equity_partner (
        project_id,
        partner_name,
        partner_class,
        ownership_pct,
        committed_capital,
        preferred_return_pct,
        promote_pct,
        hurdle_irr_pct,
        notes
    ) VALUES
    (
        11,
        'Limited Partner',
        'LP',
        0.9000,             -- 90% ownership (stored as decimal 0-1)
        4500000.00,         -- $4.5M equity contribution
        0.08000,            -- 8% preferred return
        NULL,               -- LPs don't have promote
        0.15000,            -- 15% IRR target
        'Institutional investor LP'
    ),
    (
        11,
        'General Partner',
        'GP',
        0.1000,             -- 10% ownership
        0.00,               -- GP contributes no capital (promote-based)
        0.08000,            -- 8% preferred return
        0.2000,             -- 20% promote after pref
        0.15000,            -- 15% IRR hurdle
        'Sponsor/Developer GP with 20% promote'
    )
    ON CONFLICT DO NOTHING;

    -- 4. Insert waterfall tiers
    -- These define how distributions flow between LP and GP
    INSERT INTO landscape.tbl_waterfall_tier (
        equity_structure_id,
        tier_number,
        tier_description,
        hurdle_type,
        hurdle_rate,
        lp_split_pct,
        gp_split_pct,
        has_catch_up,
        catch_up_pct
    ) VALUES
    (
        v_equity_structure_id,
        1,
        'Return of Capital',
        NULL,               -- No hurdle for capital return
        NULL,
        90.00,              -- 90% to LP
        10.00,              -- 10% to GP
        false,
        NULL
    ),
    (
        v_equity_structure_id,
        2,
        'Preferred Return (8%)',
        'IRR',
        8.000,              -- 8% IRR threshold
        90.00,              -- 90% to LP
        10.00,              -- 10% to GP
        false,
        NULL
    ),
    (
        v_equity_structure_id,
        3,
        'GP Catch-Up',
        'IRR',
        10.000,             -- 10% IRR threshold
        50.00,              -- 50% to LP
        50.00,              -- 50% to GP (catch-up mechanism)
        true,
        50.00
    ),
    (
        v_equity_structure_id,
        4,
        'Promote (80/20 Split)',
        'IRR',
        15.000,             -- 15% IRR threshold
        80.00,              -- 80% to LP
        20.00,              -- 20% to GP (promote)
        false,
        NULL
    )
    ON CONFLICT DO NOTHING;

    -- 5. Insert draw schedule
    -- Typical construction draw schedule over 18 months
    -- Using period_ids from calculation periods
    INSERT INTO landscape.tbl_debt_draw_schedule (
        facility_id,
        period_id,
        draw_amount,
        cumulative_drawn,
        draw_request_date,
        draw_funded_date,
        draw_status,
        notes
    ) VALUES
    (
        v_facility_id,
        v_period_ids[1],    -- Month 1
        2000000.00,         -- $2M acquisition
        2000000.00,
        '2025-01-15',
        '2025-01-15',
        'FUNDED',
        'Property acquisition and closing costs'
    ),
    (
        v_facility_id,
        v_period_ids[3],    -- Month 3
        1500000.00,         -- $1.5M renovations
        3500000.00,
        '2025-03-15',
        '2025-03-20',
        'FUNDED',
        'Unit renovations - Buildings A & B'
    ),
    (
        v_facility_id,
        v_period_ids[6],    -- Month 6
        1000000.00,         -- $1M lease-up
        4500000.00,
        '2025-06-15',
        NULL,
        'REQUESTED',
        'Leasing costs and working capital'
    ),
    (
        v_facility_id,
        v_period_ids[9],    -- Month 9
        2000000.00,         -- $2M remaining renovations
        6500000.00,
        '2025-09-15',
        NULL,
        'PROJECTED',
        'Building C renovations'
    ),
    (
        v_facility_id,
        v_period_ids[12],   -- Month 12
        1500000.00,         -- $1.5M final phase
        8000000.00,
        '2025-12-15',
        NULL,
        'PROJECTED',
        'Final unit upgrades and common areas'
    )
    ON CONFLICT (facility_id, period_id) DO NOTHING;

END $$;

-- 6. Verify data inserted
DO $$
DECLARE
    debt_count INT;
    equity_count INT;
    waterfall_count INT;
    draw_count INT;
BEGIN
    SELECT COUNT(*) INTO debt_count FROM landscape.tbl_debt_facility WHERE project_id = 11;
    SELECT COUNT(*) INTO equity_count FROM landscape.tbl_equity_partner WHERE project_id = 11;
    SELECT COUNT(*) INTO waterfall_count
    FROM landscape.tbl_waterfall_tier wt
    JOIN landscape.tbl_equity_structure es ON wt.equity_structure_id = es.equity_structure_id
    WHERE es.project_id = 11;
    SELECT COUNT(*) INTO draw_count
    FROM landscape.tbl_debt_draw_schedule ds
    JOIN landscape.tbl_debt_facility df ON ds.facility_id = df.facility_id
    WHERE df.project_id = 11;

    RAISE NOTICE 'Migration 014 Complete:';
    RAISE NOTICE '  - Debt Facilities: %', debt_count;
    RAISE NOTICE '  - Equity Partners: %', equity_count;
    RAISE NOTICE '  - Waterfall Tiers: %', waterfall_count;
    RAISE NOTICE '  - Draw Schedule Items: %', draw_count;
END $$;

COMMIT;
