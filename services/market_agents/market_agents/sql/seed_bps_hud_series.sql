-- =============================================================================
-- Series registration for Census BPS + HUD + FRED expanded agents
-- These must exist in public.market_series before the agents can write data.
-- Run once on setup. Idempotent via ON CONFLICT DO NOTHING.
--
-- Actual column names: series_code, series_name, source, category,
--   subcategory, units, frequency, seasonal, coverage_level
-- Unique constraint: (series_code, seasonal)
-- =============================================================================

-- ── Census Building Permits (BPS) ───────────────────────────────────────────
-- Monthly place-level and county-level permit counts
-- Note: PERMIT_TOTAL, PERMIT_1UNIT, PERMIT_5PLUS already exist — ON CONFLICT safe

INSERT INTO public.market_series (series_code, source, series_name, units, frequency, seasonal, category, coverage_level)
VALUES
  ('PERMIT_TOTAL',    'BPS', 'Total Buildings Authorized (Permits)',        'count', 'monthly', NULL, 'Housing Supply', 'CITY'),
  ('PERMIT_UNITS',    'BPS', 'Total Units Authorized (Permits)',            'count', 'monthly', NULL, 'Housing Supply', 'CITY'),
  ('PERMIT_1UNIT',    'BPS', 'Single-Family Buildings Authorized',          'count', 'monthly', NULL, 'Housing Supply', 'CITY'),
  ('PERMIT_1UNIT_U',  'BPS', 'Single-Family Units Authorized',              'count', 'monthly', NULL, 'Housing Supply', 'CITY'),
  ('PERMIT_2TO4',     'BPS', '2-4 Unit Buildings Authorized',               'count', 'monthly', NULL, 'Housing Supply', 'CITY'),
  ('PERMIT_5PLUS',    'BPS', '5+ Unit Buildings Authorized',                'count', 'monthly', NULL, 'Housing Supply', 'CITY'),
  ('PERMIT_5PLUS_U',  'BPS', '5+ Unit Units Authorized',                    'count', 'monthly', NULL, 'Housing Supply', 'CITY')
ON CONFLICT (series_code, seasonal) DO NOTHING;


-- ── HUD Fair Market Rents ───────────────────────────────────────────────────
-- Annual FMR by bedroom count + income limits (4-person household)

INSERT INTO public.market_series (series_code, source, series_name, units, frequency, seasonal, category, coverage_level)
VALUES
  ('HUD_FMR_0BR',     'HUD', 'Fair Market Rent, Efficiency (0BR)',                  'usd_monthly', 'annual', NULL, 'Rents', 'COUNTY'),
  ('HUD_FMR_1BR',     'HUD', 'Fair Market Rent, 1 Bedroom',                         'usd_monthly', 'annual', NULL, 'Rents', 'COUNTY'),
  ('HUD_FMR_2BR',     'HUD', 'Fair Market Rent, 2 Bedroom',                         'usd_monthly', 'annual', NULL, 'Rents', 'COUNTY'),
  ('HUD_FMR_3BR',     'HUD', 'Fair Market Rent, 3 Bedroom',                         'usd_monthly', 'annual', NULL, 'Rents', 'COUNTY'),
  ('HUD_FMR_4BR',     'HUD', 'Fair Market Rent, 4 Bedroom',                         'usd_monthly', 'annual', NULL, 'Rents', 'COUNTY'),
  ('HUD_IL_VLI_4P',   'HUD', 'Very Low Income Limit, 4-person family (50% AMI)',    'usd_annual',  'annual', NULL, 'Income', 'COUNTY'),
  ('HUD_IL_LI_4P',    'HUD', 'Low Income Limit, 4-person family (80% AMI)',         'usd_annual',  'annual', NULL, 'Income', 'COUNTY'),
  ('HUD_IL_MOD_4P',   'HUD', 'Moderate Income Limit, 4-person (80% AMI proxy)',     'usd_annual',  'annual', NULL, 'Income', 'COUNTY')
ON CONFLICT (series_code, seasonal) DO NOTHING;


-- ── FRED expanded bundles (new series from Round 2) ─────────────────────────
-- May already exist if seeded by prior FRED runs; ON CONFLICT safe.

INSERT INTO public.market_series (series_code, source, series_name, units, frequency, seasonal, category, coverage_level)
VALUES
  -- Treasury yields
  ('DGS2',           'FRED', '2-Year Treasury Constant Maturity Rate',        'percent', 'daily',     NULL, 'Interest Rates', 'US'),
  ('DGS10',          'FRED', '10-Year Treasury Constant Maturity Rate',       'percent', 'daily',     NULL, 'Interest Rates', 'US'),
  ('DGS30',          'FRED', '30-Year Treasury Constant Maturity Rate',       'percent', 'daily',     NULL, 'Interest Rates', 'US'),
  ('T10Y2Y',         'FRED', '10Y-2Y Treasury Spread',                       'percent', 'daily',     NULL, 'Interest Rates', 'US'),
  -- Lending / credit
  ('SOFR',           'FRED', 'Secured Overnight Financing Rate',             'percent', 'daily',     NULL, 'Interest Rates', 'US'),
  ('DRTSCILM',       'FRED', 'SLOOS: Net % Tightening - Large/Mid CRE',     'percent', 'quarterly', NULL, 'Lending', 'US'),
  ('DRTSCIS',        'FRED', 'SLOOS: Net % Tightening - Small CRE',         'percent', 'quarterly', NULL, 'Lending', 'US'),
  ('DRTSCLCC',       'FRED', 'SLOOS: Net % Tightening - Construction',      'percent', 'quarterly', NULL, 'Lending', 'US'),
  -- GDP / sentiment
  ('GDPC1',          'FRED', 'Real GDP (chained 2017 $)',                    'usd_billion', 'quarterly', 'SA', 'GDP', 'US'),
  ('A191RL1Q225SBEA','FRED', 'Real GDP Growth Rate (annualized)',            'percent',     'quarterly', 'SA', 'GDP', 'US'),
  ('UMCSENT',        'FRED', 'Univ. of Michigan Consumer Sentiment',        'index',       'monthly',   NULL, 'Sentiment', 'US'),
  -- Housing supply (national)
  ('PERMIT',         'FRED', 'New Building Permits (SA, total)',             'units_thousands', 'monthly', 'SA', 'Housing Supply', 'US'),
  ('PERMITNSA',      'FRED', 'New Building Permits (NSA, total)',            'units_thousands', 'monthly', 'NSA','Housing Supply', 'US'),
  ('PERMIT1',        'FRED', 'New Building Permits, Single-Family',         'units_thousands', 'monthly', 'SA', 'Housing Supply', 'US'),
  ('PERMIT5',        'FRED', 'New Building Permits, 5+ Units',              'units_thousands', 'monthly', 'SA', 'Housing Supply', 'US'),
  ('HOUST',          'FRED', 'Housing Starts (SA, total)',                   'units_thousands', 'monthly', 'SA', 'Housing Supply', 'US'),
  ('COMPUTSA',       'FRED', 'Housing Completions (SA, total)',              'units_thousands', 'monthly', 'SA', 'Housing Supply', 'US')
ON CONFLICT (series_code, seasonal) DO NOTHING;
