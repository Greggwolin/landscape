-- Give a price an as-of date.
--
-- WHY
-- ---
-- Gregg, 2026-09-11: "normally, i'd set todays price for each lot type, then let
-- the inflation assumptions take over in the model." That workflow needs the
-- model to know what day "today" is, and `land_use_pricing` has never carried
-- one.
--
-- What happens without it, measured 2026-09-11:
--   * A parcel WITH a sale period escalates from period 0 — so "today's price"
--     silently means "the price at period 0". Defensible, stated nowhere.
--   * A parcel WITHOUT one escalates from the pricing row's `created_at`
--     (apps/sales_absorption/batch_recalc.py). Updating the price does not move
--     that date, so a figure typed today is inflated from whenever the row was
--     first inserted. Six of Peoria Meadows' 43 parcels are on that path, and
--     three other projects are entirely on it.
--
-- NULLABLE, NO DEFAULT, on purpose. A date the user did not choose is exactly
-- the invented assumption the guard exists to stop. NULL keeps today's behavior
-- unchanged; the register asks for the date rather than inventing one.

ALTER TABLE landscape.land_use_pricing
    ADD COLUMN IF NOT EXISTS price_effective_date DATE;

COMMENT ON COLUMN landscape.land_use_pricing.price_effective_date IS
    'The date this price is stated in. NULL = not set by the user; never defaulted. Inflation runs forward from here.';
