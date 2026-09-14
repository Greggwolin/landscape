-- Reverses 20260913_pricing_effective_date.up.sql.
-- Dropping the column discards any dates users have entered; that is the cost of
-- the rollback and is why the column is additive and nullable in the first place.

ALTER TABLE landscape.land_use_pricing
    DROP COLUMN IF EXISTS price_effective_date;
