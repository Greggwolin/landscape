-- Migration: Acquisition Price Summary View
-- Creates a view that calculates total acquisition cost from ledger when closing date exists
-- Date: 2026-02-02
-- Session: VB

-- ============================================================================
-- Create View: vw_project_acquisition_summary
-- ============================================================================

CREATE OR REPLACE VIEW landscape.vw_project_acquisition_summary AS
SELECT
    p.project_id,
    p.project_name,
    p.asking_price,

    -- Check if closing date exists in ledger
    EXISTS(
        SELECT 1 FROM landscape.tbl_acquisition a
        WHERE a.project_id = p.project_id AND a.event_type = 'Closing Date'
    ) as has_closing_date,

    -- Get closing date if exists
    (
        SELECT a.event_date
        FROM landscape.tbl_acquisition a
        WHERE a.project_id = p.project_id AND a.event_type = 'Closing Date'
        ORDER BY a.event_date DESC
        LIMIT 1
    ) as closing_date,

    -- Calculate total acquisition cost (only if closing date exists)
    CASE
        WHEN EXISTS(
            SELECT 1 FROM landscape.tbl_acquisition a
            WHERE a.project_id = p.project_id AND a.event_type = 'Closing Date'
        )
        THEN (
            SELECT COALESCE(
                SUM(CASE
                    WHEN event_type IN ('Deposit', 'Fee', 'Closing Costs', 'Adjustment') THEN COALESCE(amount, 0)
                    WHEN event_type IN ('Credit', 'Refund') THEN -COALESCE(amount, 0)
                    ELSE 0
                END), 0
            )
            FROM landscape.tbl_acquisition a
            WHERE a.project_id = p.project_id
              AND a.is_applied_to_purchase = true
              AND a.event_type IN ('Deposit', 'Fee', 'Credit', 'Refund', 'Adjustment', 'Closing Costs')
        )
        ELSE NULL
    END as total_acquisition_cost,

    -- Breakdown by category
    (
        SELECT COALESCE(SUM(amount), 0)
        FROM landscape.tbl_acquisition a
        WHERE a.project_id = p.project_id
          AND a.is_applied_to_purchase = true
          AND a.event_type = 'Closing Costs'
    ) as land_cost,

    (
        SELECT COALESCE(SUM(amount), 0)
        FROM landscape.tbl_acquisition a
        WHERE a.project_id = p.project_id
          AND a.is_applied_to_purchase = true
          AND a.event_type = 'Fee'
    ) as total_fees,

    (
        SELECT COALESCE(SUM(amount), 0)
        FROM landscape.tbl_acquisition a
        WHERE a.project_id = p.project_id
          AND a.is_applied_to_purchase = true
          AND a.event_type = 'Deposit'
    ) as total_deposits,

    (
        SELECT COALESCE(SUM(amount), 0)
        FROM landscape.tbl_acquisition a
        WHERE a.project_id = p.project_id
          AND a.is_applied_to_purchase = true
          AND a.event_type IN ('Credit', 'Refund')
    ) as total_credits,

    -- Effective price for valuation (calculated takes precedence over asking)
    COALESCE(
        CASE
            WHEN EXISTS(
                SELECT 1 FROM landscape.tbl_acquisition a
                WHERE a.project_id = p.project_id AND a.event_type = 'Closing Date'
            )
            THEN (
                SELECT COALESCE(
                    SUM(CASE
                        WHEN event_type IN ('Deposit', 'Fee', 'Closing Costs', 'Adjustment') THEN COALESCE(amount, 0)
                        WHEN event_type IN ('Credit', 'Refund') THEN -COALESCE(amount, 0)
                        ELSE 0
                    END), 0
                )
                FROM landscape.tbl_acquisition a
                WHERE a.project_id = p.project_id
                  AND a.is_applied_to_purchase = true
                  AND a.event_type IN ('Deposit', 'Fee', 'Credit', 'Refund', 'Adjustment', 'Closing Costs')
            )
            ELSE NULL
        END,
        p.asking_price
    ) as effective_acquisition_price,

    -- Price source indicator
    CASE
        WHEN EXISTS(
            SELECT 1 FROM landscape.tbl_acquisition a
            WHERE a.project_id = p.project_id AND a.event_type = 'Closing Date'
        ) AND (
            SELECT COUNT(*)
            FROM landscape.tbl_acquisition a
            WHERE a.project_id = p.project_id
              AND a.is_applied_to_purchase = true
              AND a.event_type IN ('Deposit', 'Fee', 'Credit', 'Refund', 'Adjustment', 'Closing Costs')
        ) > 0
        THEN 'calculated'
        WHEN p.asking_price IS NOT NULL
        THEN 'asking'
        ELSE NULL
    END as price_source

FROM landscape.tbl_project p
WHERE p.is_active = true;

-- Add comment
COMMENT ON VIEW landscape.vw_project_acquisition_summary IS
'Calculates total acquisition cost from ledger when closing date exists, with fallback to asking price';

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Test the view
SELECT
    project_id,
    project_name,
    asking_price,
    has_closing_date,
    total_acquisition_cost,
    effective_acquisition_price,
    price_source
FROM landscape.vw_project_acquisition_summary
WHERE project_id IN (7, 17, 42)
ORDER BY project_id;
