-- Create table to persist Market Assumptions selections
-- Apply in Neon (psql or console) connected to your database

create schema if not exists landscape;

create table if not exists landscape.market_assumptions (
  project_id integer primary key,
  commission_basis text,
  demand_unit text,
  uom text,
  updated_at timestamptz not null default now()
);

comment on table landscape.market_assumptions is 'Stores UI selections for Market Assumptions per project.';
comment on column landscape.market_assumptions.commission_basis is 'Lookup code from list commission_basis (e.g., NET, GROSS)';
comment on column landscape.market_assumptions.demand_unit is 'Lookup code from list housing_demand_unit (e.g., UNIT_YR)';
comment on column landscape.market_assumptions.uom is 'Lookup code from list uom (e.g., LS, SF, UNIT)';

