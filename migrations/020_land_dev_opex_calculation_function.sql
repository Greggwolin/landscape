BEGIN;

CREATE OR REPLACE FUNCTION landscape.calculate_land_dev_opex(
  p_project_id BIGINT,
  p_calculation_basis VARCHAR(50),
  p_unit_amount NUMERIC(10,2)
) RETURNS NUMERIC AS $$
DECLARE
  v_unsold_parcels INTEGER;
  v_unsold_acres NUMERIC(12,4);
  v_total_parcels INTEGER;
  v_pct_unsold NUMERIC(7,4);
  v_calculated_amount NUMERIC(14,4);
  v_unit_amount NUMERIC(10,2) := COALESCE(p_unit_amount, 0);
BEGIN
  IF p_calculation_basis = 'FIXED_AMOUNT' THEN
    RETURN v_unit_amount;
  END IF;

  WITH parcel_status AS (
    SELECT
      p.parcel_id,
      p.acres_gross,
      COALESCE(ce.closing_date, NULL) AS actual_closing_date
    FROM landscape.tbl_parcel p
    LEFT JOIN LATERAL (
      SELECT MIN(ce.closing_date) AS closing_date
      FROM landscape.tbl_parcel_sale_event pse
      JOIN landscape.tbl_closing_event ce
        ON ce.sale_event_id = pse.sale_event_id
      WHERE pse.parcel_id = p.parcel_id
    ) ce ON TRUE
    WHERE p.project_id = p_project_id
  )
  SELECT COUNT(*) FILTER (
           WHERE actual_closing_date IS NULL OR actual_closing_date > CURRENT_DATE
         ),
         COALESCE(SUM(acres_gross) FILTER (
           WHERE actual_closing_date IS NULL OR actual_closing_date > CURRENT_DATE
         ), 0),
         COUNT(*)
  INTO v_unsold_parcels, v_unsold_acres, v_total_parcels
  FROM parcel_status;

  IF v_total_parcels > 0 THEN
    v_pct_unsold := (v_unsold_parcels::NUMERIC / v_total_parcels::NUMERIC) * 100;
  ELSE
    v_pct_unsold := 0;
  END IF;

  CASE p_calculation_basis
    WHEN 'PER_UNSOLD_PARCEL' THEN
      v_calculated_amount := v_unit_amount * COALESCE(v_unsold_parcels, 0);
    WHEN 'PER_UNSOLD_ACRE' THEN
      v_calculated_amount := v_unit_amount * COALESCE(v_unsold_acres, 0);
    WHEN 'PER_PCT_UNSOLD' THEN
      v_calculated_amount := v_unit_amount * (COALESCE(v_pct_unsold, 0) / 100);
    ELSE
      v_calculated_amount := 0;
  END CASE;

  RETURN COALESCE(v_calculated_amount, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION landscape.calculate_land_dev_opex IS
'Calculates operating expense amounts for land development projects based on unsold parcels using tbl_closing_event actual closing dates.';

COMMIT;
