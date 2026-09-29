-- 20260929_market_data_revisions_and_geo_codes.up.sql
-- Session: MQ-MKTDATA-S1 (chat MQ, 2026-09-29). Branch feat/market-data-platform.
--
-- Slice 1 of "market data in Landscaper" (plan: _cowork/_specs/MARKET-DATA-IN-LANDSCAPER-SPEC-2026-09-29.md).
-- Four things, in one transaction:
--
--   1. KEEP EVERY REVISION. public.market_data stays the current-value table (every
--      reader keeps working unchanged). A trigger copies the prior value into
--      public.market_data_revision whenever a re-fetch changes a figure, so a revised
--      publisher number no longer erases the one it replaced.
--
--   2. PER-GEOGRAPHY PUBLISHER CODES. public.series_geo_alias holds codes that cannot be
--      derived from a template (FRED's own metro permit IDs, Case-Shiller's 20 metros).
--      The runner refuses to use a fixed-place code for any geography below the nation
--      unless it is listed here (services/market_ingest_py/market_ingest/provider_codes.py).
--
--   3. QUARANTINE THE PHOENIX FIGURES STORED UNDER OTHER PLACES. Until today several
--      metro series carried a Phoenix-only publisher code and were fetched for every
--      metro, so Tucson (MSA, city, Pima County) and Los Angeles were stored with
--      Phoenix's payrolls, home prices and permits. Measured 2026-09-29: 215 rows.
--      They are MOVED (copied, then deleted) into public.market_data_quarantine_20260929,
--      never destroyed; the down migration puts them back.
--
--   4. FIX THE CODES. Templates that never resolved ({AREA_CODE}, {PLACE_CODE}), BLS codes
--      of the wrong length, and fixed-place codes are replaced with templates verified
--      against the live BLS and FRED APIs 2026-09-29. New series for the public half of
--      the Phoenix housing dashboard are added as templates, so they fill for ANY tracked
--      geography of their level.

BEGIN;

-- ── 1. revisions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_data_revision (
    revision_id     bigserial PRIMARY KEY,
    series_id       bigint      NOT NULL,
    geo_id          text        NOT NULL,
    date            date        NOT NULL,
    old_value       numeric,
    new_value       numeric,
    old_rev_tag     text,
    new_rev_tag     text,
    old_first_seen  timestamptz,           -- market_data.created_at of the replaced row
    replaced_at     timestamptz NOT NULL DEFAULT now(),
    note            text                   -- set by hand when a change is a correction, not a publisher revision
);
ALTER TABLE public.market_data_revision ADD COLUMN IF NOT EXISTS note text;
CREATE INDEX IF NOT EXISTS market_data_revision_key_idx
    ON public.market_data_revision (series_id, geo_id, date, replaced_at);

COMMENT ON TABLE public.market_data_revision IS
  'Every value a publisher later revised. market_data holds the current figure; this holds each figure it replaced, with when. Written only by trigger trg_market_data_keep_revision.';

CREATE OR REPLACE FUNCTION public.fn_market_data_keep_revision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.value IS DISTINCT FROM OLD.value THEN
        INSERT INTO public.market_data_revision
            (series_id, geo_id, date, old_value, new_value, old_rev_tag, new_rev_tag, old_first_seen)
        VALUES
            (OLD.series_id, OLD.geo_id, OLD.date, OLD.value, NEW.value, OLD.rev_tag, NEW.rev_tag, OLD.created_at);
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_market_data_keep_revision ON public.market_data;
CREATE TRIGGER trg_market_data_keep_revision
    BEFORE UPDATE ON public.market_data
    FOR EACH ROW EXECUTE FUNCTION public.fn_market_data_keep_revision();

-- ── 2. per-geography codes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.series_geo_alias (
    series_id            bigint NOT NULL REFERENCES public.market_series(series_id) ON DELETE CASCADE,
    geo_id               text   NOT NULL REFERENCES public.geo_xwalk(geo_id) ON DELETE CASCADE,
    provider             text   NOT NULL,
    provider_series_code text   NOT NULL,
    note                 text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (series_id, geo_id, provider)
);
COMMENT ON TABLE public.series_geo_alias IS
  'Publisher codes for one series at one geography, where no template can derive them. A code here was checked by hand for exactly that place.';

-- ── 3. quarantine ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_data_quarantine_20260929 (LIKE public.market_data INCLUDING DEFAULTS);
ALTER TABLE public.market_data_quarantine_20260929 ADD COLUMN IF NOT EXISTS reason text;

WITH phx AS (
    SELECT d.series_id, d.date, d.value
      FROM public.market_data d
      JOIN public.market_series s USING (series_id)
     WHERE s.series_code IN ('HPI_MSA', 'PAYEMS_MSA', 'PERMIT_MSA_1UNIT') AND d.geo_id = '38060'
), bad AS (
    SELECT d.*
      FROM public.market_data d
      JOIN public.market_series s USING (series_id)
     WHERE s.series_code IN ('HPI_MSA', 'PAYEMS_MSA', 'PERMIT_MSA_1UNIT')
       AND d.geo_id <> '38060'
       AND (
             -- Tucson metro, Tucson city, Pima County: every row since the Phoenix code went in
             (d.geo_id IN ('46060', '04-77000', '04019') AND d.date >= DATE '2023-01-01')
             -- anywhere else: rows identical to Phoenix's for the same month
          OR EXISTS (SELECT 1 FROM phx p WHERE p.series_id = d.series_id AND p.date = d.date AND p.value = d.value)
       )
)
INSERT INTO public.market_data_quarantine_20260929
SELECT bad.*, 'Phoenix figure stored under another geography: fixed-place publisher code (see provider_codes.py)'
  FROM bad;

DELETE FROM public.market_data d
 USING public.market_data_quarantine_20260929 q
 WHERE d.series_id = q.series_id AND d.geo_id = q.geo_id AND d.date = q.date;

-- ── 4. codes ───────────────────────────────────────────────────────────────────
-- Snapshot what is about to change, for the down migration.
CREATE TABLE IF NOT EXISTS public.series_alias_backup_20260929 AS TABLE public.series_alias;
CREATE TABLE IF NOT EXISTS public.market_series_backup_20260929 AS TABLE public.market_series;

-- helper: set (insert or replace) one provider code for a series
CREATE OR REPLACE FUNCTION pg_temp.set_alias(p_series bigint, p_provider text, p_code text) RETURNS void
LANGUAGE sql AS $$
    INSERT INTO public.series_alias (series_id, provider, provider_series_code)
    VALUES (p_series, p_provider, p_code)
    ON CONFLICT (series_id, provider) DO UPDATE SET provider_series_code = EXCLUDED.provider_series_code;
$$;

-- 4a. BLS codes that were the wrong length or never resolved
SELECT pg_temp.set_alias(10,  'BLS', 'LAS{LAUS_AREA}03');          -- LAUS_STATE_UNRATE (SA, as AZUR)
-- Metro unemployment exists only unadjusted at BLS for every metro (LASMT… does not exist,
-- checked 2026-09-29). The series was labelled SA and its Phoenix history came from FRED's
-- PHOE004UR (SA). So the SA history moves to its own frozen series and series 11 becomes NSA,
-- matching the dashboard's PHOE004URN. Rows are moved, not deleted.
INSERT INTO public.market_series (series_code, series_name, category, units, frequency, seasonal, source,
                                  coverage_level, notes, is_active)
SELECT 'LAUS_MSA_UNRATE_SA_LEGACY', series_name || ' (seasonally adjusted, history to 2026-09-29)', category, units,
       frequency, 'SA', source, coverage_level,
       'Frozen 2026-09-29: SA history moved out of LAUS_MSA_UNRATE when that series became NSA. Not refreshed.', FALSE
  FROM public.market_series WHERE series_id = 11
ON CONFLICT DO NOTHING;
UPDATE public.market_data SET series_id = (SELECT series_id FROM public.market_series WHERE series_code = 'LAUS_MSA_UNRATE_SA_LEGACY')
 WHERE series_id = 11;
UPDATE public.market_series SET seasonal = 'NSA', updated_at = now() WHERE series_id = 11;
SELECT pg_temp.set_alias(11,  'BLS', 'LAU{LAUS_AREA}03');          -- LAUS_MSA_UNRATE (NSA, as PHOE004URN)
DELETE FROM public.series_alias WHERE series_id = 11 AND provider = 'FRED';   -- was PHOE004UR (Phoenix only)
SELECT pg_temp.set_alias(12,  'BLS', 'LAU{LAUS_AREA}03');          -- LAUS_PLACE_UNRATE (cities over 25,000)
SELECT pg_temp.set_alias(73,  'BLS', 'LAU{LAUS_AREA}05');          -- LAUS_PLACE_EMPLOYED

UPDATE public.market_series SET source = 'BLS', updated_at = now() WHERE series_id IN (8, 267, 283, 284);
-- SMS = seasonally adjusted. Verified 2026-09-29: BLS SMS04380600000000001 Aug 2026 = 2,482.3,
-- identical to FRED PHOE004NA, so the dashboard's Phoenix payroll series is this code.
SELECT pg_temp.set_alias(8,   'BLS', 'SMS{CES_AREA}0000000001');   -- CES_STATE_TOTAL (SA)
SELECT pg_temp.set_alias(267, 'BLS', 'SMS{CES_AREA}0000000001');   -- PAYEMS_MSA (SA)
DELETE FROM public.series_alias WHERE series_id IN (8, 267) AND provider = 'FRED';
SELECT pg_temp.set_alias(283, 'BLS', 'LAU{LAUS_AREA}03');          -- LAUS_COUNTY_UNRATE
SELECT pg_temp.set_alias(284, 'BLS', 'LAU{LAUS_AREA}05');          -- LAUS_COUNTY_EMP

-- 4b. FRED fixed-place codes -> templates
SELECT pg_temp.set_alias(268, 'FRED', 'ATNHPIUS{CBSA_CODE}Q');     -- HPI_MSA
SELECT pg_temp.set_alias(273, 'FRED', '{STATE_ABBR}POP');          -- POP_STATE
SELECT pg_temp.set_alias(286, 'FRED', '{STATE_ABBR}NA');           -- PAYEMS_STATE
SELECT pg_temp.set_alias(280, 'FRED', '{STATE_ABBR}BP1FHSA');      -- (code AZBP1FHSA kept; now every state)
SELECT pg_temp.set_alias(275, 'FRED', 'MEHOINUS{STATE_ABBR}A646N');-- (code MEHOINUSAZA646N kept; every state)
UPDATE public.market_series SET series_name = 'State 1-unit private housing permits (SA)', updated_at = now() WHERE series_id = 280;
UPDATE public.market_series SET series_name = 'State median household income', updated_at = now() WHERE series_id = 275;

-- 4c. codes with no template: move to per-geography rows
INSERT INTO public.series_geo_alias (series_id, geo_id, provider, provider_series_code, note) VALUES
    (269, '38060', 'FRED', 'PHOE004BP1FHSA', 'FRED metro permit IDs are not derivable from the CBSA; Phoenix only until the Census BPS metro feed lands'),
    (266, '38060', 'FRED', 'PHXPOP',         'FRED metro population ID, Phoenix'),
    (281, '04013', 'FRED', 'AZMARI3POP',     'FRED county population ID, Maricopa County')
ON CONFLICT DO NOTHING;
DELETE FROM public.series_alias WHERE series_id IN (266, 269, 281) AND provider = 'FRED';

-- 4d. retire a template that can never resolve (superseded by the named sector series below)
UPDATE public.market_series SET is_active = FALSE, updated_at = now(),
       notes = coalesce(notes || ' ', '') || '[retired 2026-09-29: template {SUPERSECTOR} never resolved; replaced by EMP_MSA_* / EMP_STATE_* series]'
 WHERE series_id = 13;

-- 4e. new series — the public half of the Phoenix housing dashboard, as templates
CREATE OR REPLACE FUNCTION pg_temp.add_series(
    p_code text, p_name text, p_cat text, p_units text, p_freq text, p_seasonal text,
    p_source text, p_cov text, p_provider text, p_template text, p_note text) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE v_id bigint;
BEGIN
    SELECT series_id INTO v_id FROM public.market_series
     WHERE series_code = p_code AND seasonal IS NOT DISTINCT FROM p_seasonal;
    IF v_id IS NULL THEN
        INSERT INTO public.market_series (series_code, series_name, category, units, frequency, seasonal,
                                          source, coverage_level, notes, is_active)
        VALUES (p_code, p_name, p_cat, p_units, p_freq, p_seasonal, p_source, p_cov, p_note, TRUE)
        RETURNING series_id INTO v_id;
    END IF;
    IF p_template IS NOT NULL THEN
        PERFORM pg_temp.set_alias(v_id, p_provider, p_template);
    END IF;
    RETURN v_id;
END $$;

-- National (FRED)
SELECT pg_temp.add_series('PERMIT1NSA','US 1-unit permits','Housing Supply','Thousands of units','M','NSA','FRED','US','FRED','PERMIT1NSA','dashboard: US_Permits_SF_NSA');
SELECT pg_temp.add_series('PERMIT5NSA','US 5+ unit permits','Housing Supply','Thousands of units','M','NSA','FRED','US','FRED','PERMIT5NSA','dashboard: US_Permits_5F_NSA');
SELECT pg_temp.add_series('HOUST1F','US 1-unit starts','Housing Supply','Thousands of units, annual rate','M','SA','FRED','US','FRED','HOUST1F','dashboard: US_Starts_SF_SA');
SELECT pg_temp.add_series('HOUST1FNSA','US 1-unit starts','Housing Supply','Thousands of units','M','NSA','FRED','US','FRED','HOUST1FNSA','dashboard: US_Starts_SF_NSA');
SELECT pg_temp.add_series('HOUST5F','US 5+ unit starts','Housing Supply','Thousands of units, annual rate','M','SA','FRED','US','FRED','HOUST5F','dashboard: US_Starts_5F_SA');
SELECT pg_temp.add_series('HOUST5FNSA','US 5+ unit starts','Housing Supply','Thousands of units','M','NSA','FRED','US','FRED','HOUST5FNSA','dashboard: US_Starts_5F_NSA');
SELECT pg_temp.add_series('HOUSTNSA','US total starts','Housing Supply','Thousands of units','M','NSA','FRED','US','FRED','HOUSTNSA','dashboard: US_Starts_Total_NSA');
SELECT pg_temp.add_series('MSACSR','US new-home months of supply','HOUSING','Months','M','SA','FRED','US','FRED','MSACSR','dashboard: US_NewSales_MonthsSupply');
SELECT pg_temp.add_series('DPRIME','Bank prime loan rate','Interest Rates','Percent','D',NULL,'FRED','US','FRED','DPRIME','dashboard: PrimeRate');
SELECT pg_temp.add_series('SOFR30DAYAVG','SOFR 30-day average','Interest Rates','Percent','D',NULL,'FRED','US','FRED','SOFR30DAYAVG','dashboard: SOFR_30DayAvg');
SELECT pg_temp.add_series('SOFR90DAYAVG','SOFR 90-day average','Interest Rates','Percent','D',NULL,'FRED','US','FRED','SOFR90DAYAVG','dashboard: SOFR_90DayAvg');
SELECT pg_temp.add_series('GS10','10-year Treasury, monthly average','Interest Rates','Percent','M',NULL,'FRED','US','FRED','GS10','dashboard: UST10Y');
SELECT pg_temp.add_series('CSUSHPINSA','Case-Shiller US national index','PRICES_RATES','Index Jan 2000=100','M','NSA','FRED','US','FRED','CSUSHPINSA','dashboard: CaseShiller_US. S&P copyright: redistribution terms unconfirmed');
SELECT pg_temp.add_series('MICH','UMich expected inflation, next 12 months','Sentiment','Percent','M','NSA','FRED','US','FRED','MICH','dashboard: UMich_InflExp_1yr');
SELECT pg_temp.add_series('HPIPONM226S','FHFA purchase-only index, US','PRICES_RATES','Index Jan 1991=100','M','SA','FRED','US','FRED','HPIPONM226S','dashboard: US_FHFA_HPI_PO_SA');
SELECT pg_temp.add_series('UMICH_INFL_5Y','UMich expected inflation, 5-10 years','Sentiment','Percent','M','NSA','UMICH','US',NULL,NULL,'dashboard: UMich_InflExp_5yr. Not on FRED; read from sca.isr.umich.edu tbmpx1px5.csv');

-- State (FRED templates)
SELECT pg_temp.add_series('STATE_PERMITS_1U_NSA','State 1-unit private housing permits','Housing Supply','Units','M','NSA','FRED','STATE','FRED','{STATE_ABBR}BP1FH','dashboard: AZ_Permits_SF_NSA');
SELECT pg_temp.add_series('STATE_PERMITS_TOTAL','State total private housing permits','Housing Supply','Units','M','NSA','FRED','STATE','FRED','{STATE_ABBR}BPPRIV','dashboard: AZ_Permits_Total_NSA');
SELECT pg_temp.add_series('STATE_PERMITS_TOTAL_SA','State total private housing permits','Housing Supply','Units','M','SA','FRED','STATE','FRED','{STATE_ABBR}BPPRIVSA','dashboard: AZ_Permits_Total_SA');
SELECT pg_temp.add_series('STATE_HPI_FHFA_AT','FHFA all-transactions house price index, state','PRICES_RATES','Index 1980Q1=100','Q','NSA','FRED','STATE','FRED','{STATE_ABBR}STHPI','dashboard: Arizona_HPI');

-- Metro employment by sector (BLS CES, any metro)
SELECT pg_temp.add_series('EMP_MSA_CONSTRUCTION','Metro employment: construction (incl. mining & logging where combined)','LABOR','Thousands of persons','M','NSA','BLS','MSA','BLS','SMU{CES_AREA}2000000001','dashboard: PhxMSA_Construction_Emp (SA there; NSA here)');
SELECT pg_temp.add_series('EMP_MSA_MANUFACTURING','Metro employment: manufacturing','LABOR','Thousands of persons','M','NSA','BLS','MSA','BLS','SMU{CES_AREA}3000000001','dashboard: PhxMSA_Manufacturing_Emp');
SELECT pg_temp.add_series('EMP_MSA_INFORMATION','Metro employment: information','LABOR','Thousands of persons','M','NSA','BLS','MSA','BLS','SMU{CES_AREA}5000000001','dashboard: PhxMSA_Information_Emp');
SELECT pg_temp.add_series('EMP_MSA_FINANCIAL','Metro employment: financial activities','LABOR','Thousands of persons','M','NSA','BLS','MSA','BLS','SMU{CES_AREA}5500000001','dashboard: PhxMSA_Financial_Emp');
SELECT pg_temp.add_series('EMP_MSA_PROF_BUS','Metro employment: professional & business services','LABOR','Thousands of persons','M','NSA','BLS','MSA','BLS','SMU{CES_AREA}6000000001','dashboard: PhxMSA_ProfBusServices_Emp');
SELECT pg_temp.add_series('EMP_MSA_LEISURE_HOSP','Metro employment: leisure & hospitality','LABOR','Thousands of persons','M','NSA','BLS','MSA','BLS','SMU{CES_AREA}7000000001','dashboard: PhxMSA_LeisureHosp_Emp');

-- Metro series with no template: per-geography codes only
DO $$
DECLARE v bigint;
BEGIN
    v := pg_temp.add_series('PERMIT_MSA_1UNIT_NSA','Metro 1-unit permits','Housing Supply','Units','M','NSA','FRED','MSA',NULL,NULL,'dashboard: PHXMSA_Permits_SF_NSA. FRED metro IDs are per-place');
    INSERT INTO public.series_geo_alias VALUES (v,'38060','FRED','PHOE004BP1FH','Phoenix') ON CONFLICT DO NOTHING;
    v := pg_temp.add_series('PERMIT_MSA_TOTAL','Metro total permits','Housing Supply','Units','M','NSA','FRED','MSA',NULL,NULL,'dashboard: PHXMSA_Permits_Total_NSA');
    INSERT INTO public.series_geo_alias VALUES (v,'38060','FRED','PHOE004BPPRIV','Phoenix') ON CONFLICT DO NOTHING;
    v := pg_temp.add_series('PERMIT_MSA_TOTAL_SA','Metro total permits','Housing Supply','Units','M','SA','FRED','MSA',NULL,NULL,'dashboard: PHXMSA_Permits_Total_SA');
    INSERT INTO public.series_geo_alias VALUES (v,'38060','FRED','PHOE004BPPRIVSA','Phoenix') ON CONFLICT DO NOTHING;
    v := pg_temp.add_series('CASE_SHILLER_METRO','S&P Case-Shiller metro home price index','PRICES_RATES','Index Jan 2000=100','M','NSA','FRED','MSA',NULL,NULL,'dashboard: Phoenix_HPI. Only the 20 Case-Shiller metros. S&P copyright: redistribution terms unconfirmed');
    INSERT INTO public.series_geo_alias VALUES (v,'38060','FRED','PHXRNSA','Phoenix') ON CONFLICT DO NOTHING;
    INSERT INTO public.series_geo_alias VALUES (v,'31080','FRED','LXXRNSA','Los Angeles') ON CONFLICT DO NOTHING;
END $$;

-- County employed (BLS) already exists as LAUS_COUNTY_EMP (284); nothing to add.

COMMIT;
