# Landscape Financial Engine – Schema Design & Implementation Plan

**Version:** 1.0
**Date:** 2025-10-13
**Purpose:** Unified database schema supporting land development, income property, and mixed-use modeling with ARGUS Enterprise parity

---

## Table of Contents
1. [Schema Overview](#schema-overview)
2. [Core Entity Model](#core-entity-model)
3. [Income & Lease Model](#income--lease-model)
4. [Financial Model](#financial-model)
5. [Calculation Engine](#calculation-engine)
6. [Implementation Phases](#implementation-phases)
7. [ARGUS Parity Mapping](#argus-parity-mapping)

---

## Schema Overview

### Design Principles
- Normalized relational structure with clear foreign key relationships
- Support for both land development and income property modeling
- Version control on all financial entities
- JSONB for flexible metadata without schema changes
- Computed columns and materialized views for performance
- Audit trail: `created_at`, `created_by`, `updated_at`, `updated_by`

### Schema Namespace
All tables reside in the `landscape` schema.

---

## Core Entity Model

### Existing Tables (Enhanced)

#### `tbl_project`
Primary container for all project data.

**Existing Fields:** ✓ (already has project_id, name, location, etc.)

**New Fields Required:**
```sql
ALTER TABLE landscape.tbl_project ADD COLUMN IF NOT EXISTS
  project_type VARCHAR(50) DEFAULT 'Land Development', -- 'Land Development', 'Income Property', 'Mixed Use'
  financial_model_type VARCHAR(50) DEFAULT 'Development', -- 'Development', 'Stabilized', 'Value-Add'
  analysis_start_date DATE,
  analysis_end_date DATE,
  calculation_frequency VARCHAR(20) DEFAULT 'Monthly', -- 'Monthly', 'Quarterly', 'Annual'
  discount_rate_pct NUMERIC(5,2) DEFAULT 10.00,
  cost_of_capital_pct NUMERIC(5,2),
  schema_version INTEGER DEFAULT 1,
  last_calculated_at TIMESTAMP WITH TIME ZONE;
```

#### `tbl_area`
Planning areas within a project. ✓ Exists

#### `tbl_phase`
Development phases. ✓ Exists

**New Fields Required:**
```sql
ALTER TABLE landscape.tbl_phase ADD COLUMN IF NOT EXISTS
  phase_status VARCHAR(50) DEFAULT 'Planning', -- 'Planning', 'Approved', 'Under Construction', 'Completed', 'On Hold'
  phase_start_date DATE,
  phase_completion_date DATE,
  absorption_start_date DATE;
```

#### `tbl_parcel`
Land parcels/buildings. ✓ Exists

**New Fields Required:**
```sql
ALTER TABLE landscape.tbl_parcel ADD COLUMN IF NOT EXISTS
  parcel_name VARCHAR(255),
  building_name VARCHAR(255),
  building_class VARCHAR(20), -- 'A', 'B', 'C'
  year_built INTEGER,
  year_renovated INTEGER,
  rentable_sf NUMERIC(12,2),
  common_area_sf NUMERIC(12,2),
  load_factor_pct NUMERIC(5,2),
  parking_spaces INTEGER,
  parking_ratio NUMERIC(5,2), -- spaces per 1,000 SF
  is_income_property BOOLEAN DEFAULT false,
  property_metadata JSONB DEFAULT '{}';
```

### New Core Tables

#### `tbl_lot`
Individual units/lots within parcels (NEW - critical for lot-level tracking).

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_lot (
  lot_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parcel_id INTEGER NOT NULL REFERENCES tbl_parcel(parcel_id) ON DELETE CASCADE,
  phase_id INTEGER REFERENCES tbl_phase(phase_id),
  project_id INTEGER NOT NULL REFERENCES tbl_project(project_id),

  -- Identification
  lot_number VARCHAR(50),
  unit_number VARCHAR(50),
  suite_number VARCHAR(50),

  -- Physical Characteristics
  unit_type VARCHAR(50), -- 'SFD-40', 'SFD-50', 'Townhome', 'Office Suite', 'Retail Space'
  lot_sf NUMERIC(12,2),
  unit_sf NUMERIC(12,2),
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  floor_number INTEGER,

  -- Pricing
  base_price NUMERIC(15,2),
  price_psf NUMERIC(10,2),
  options_price NUMERIC(15,2),
  total_price NUMERIC(15,2),

  -- Status & Timing
  lot_status VARCHAR(50) DEFAULT 'Available', -- 'Available', 'Reserved', 'Sold', 'Closed', 'Leased', 'Vacant'
  sale_date DATE,
  close_date DATE,
  lease_id INTEGER, -- FK to tbl_lease when applicable

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(project_id, lot_number)
);

CREATE INDEX idx_lot_parcel ON landscape.tbl_lot(parcel_id);
CREATE INDEX idx_lot_status ON landscape.tbl_lot(project_id, lot_status);
```

---

## Income & Lease Model

### Primary Tables

#### `tbl_lease`
Master lease register (convert from mock to real table).

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_lease (
  lease_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,
  parcel_id INTEGER REFERENCES tbl_parcel(parcel_id),
  lot_id INTEGER REFERENCES tbl_lot(lot_id),

  -- Tenant Information
  tenant_name VARCHAR(255) NOT NULL,
  tenant_contact VARCHAR(255),
  tenant_email VARCHAR(255),
  tenant_phone VARCHAR(50),
  tenant_classification VARCHAR(50), -- 'Anchor', 'Major', 'Inline', 'Kiosk'

  -- Lease Terms
  lease_status VARCHAR(50) DEFAULT 'Speculative', -- 'Contract', 'Speculative', 'Month-to-Month', 'Holdover', 'Expired'
  lease_type VARCHAR(50), -- 'Office', 'Retail', 'Industrial', 'Residential', 'Mixed Use'
  suite_number VARCHAR(50),
  floor_number INTEGER,

  -- Dates
  lease_execution_date DATE,
  lease_commencement_date DATE NOT NULL,
  rent_start_date DATE,
  lease_expiration_date DATE NOT NULL,
  lease_term_months INTEGER NOT NULL,

  -- Space
  leased_sf NUMERIC(12,2) NOT NULL,
  usable_sf NUMERIC(12,2),

  -- Renewal Options
  number_of_renewal_options INTEGER DEFAULT 0,
  renewal_option_term_months INTEGER,
  renewal_notice_months INTEGER,
  renewal_probability_pct NUMERIC(5,2) DEFAULT 50.00,

  -- Termination
  early_termination_allowed BOOLEAN DEFAULT false,
  termination_notice_months INTEGER,
  termination_penalty_amount NUMERIC(15,2),

  -- Security
  security_deposit_amount NUMERIC(15,2),
  security_deposit_months INTEGER,

  -- Flags
  affects_occupancy BOOLEAN DEFAULT true,
  expansion_rights BOOLEAN DEFAULT false,
  right_of_first_refusal BOOLEAN DEFAULT false,

  -- Clauses
  exclusive_use_clause TEXT,
  co_tenancy_clause TEXT,
  radius_restriction VARCHAR(255),

  -- Metadata
  notes TEXT,
  lease_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(100),

  CONSTRAINT chk_lease_dates CHECK (lease_expiration_date >= lease_commencement_date)
);

CREATE INDEX idx_lease_project ON landscape.tbl_lease(project_id);
CREATE INDEX idx_lease_parcel ON landscape.tbl_lease(parcel_id);
CREATE INDEX idx_lease_status ON landscape.tbl_lease(lease_status, affects_occupancy);
CREATE INDEX idx_lease_expiration ON landscape.tbl_lease(lease_expiration_date);
```

#### `tbl_base_rent`
Rent schedule periods (ARGUS equivalent: Rent Steps).

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_base_rent (
  base_rent_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES tbl_lease(lease_id) ON DELETE CASCADE,

  period_number INTEGER NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,

  -- Rent Structure
  rent_type VARCHAR(50) DEFAULT 'Fixed', -- 'Fixed', 'Free', 'Percentage', 'Market', 'Turnover'
  base_rent_psf_annual NUMERIC(10,2),
  base_rent_annual NUMERIC(15,2),
  base_rent_monthly NUMERIC(15,2),

  -- Percentage Rent (for retail)
  percentage_rent_rate NUMERIC(5,2), -- % of gross sales
  percentage_rent_breakpoint NUMERIC(15,2), -- natural breakpoint
  percentage_rent_annual NUMERIC(15,2), -- calculated

  -- Free Rent
  free_rent_months INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(lease_id, period_number),
  CONSTRAINT chk_base_rent_dates CHECK (period_end_date >= period_start_date)
);

CREATE INDEX idx_base_rent_lease ON landscape.tbl_base_rent(lease_id);
CREATE INDEX idx_base_rent_dates ON landscape.tbl_base_rent(period_start_date, period_end_date);
```

#### `tbl_escalation`
Rent escalation rules.

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_escalation (
  escalation_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES tbl_lease(lease_id) ON DELETE CASCADE,

  escalation_type VARCHAR(50) NOT NULL, -- 'Fixed Percentage', 'CPI', 'Fixed Dollar', 'Stepped'
  escalation_pct NUMERIC(5,2),
  escalation_frequency VARCHAR(50) DEFAULT 'Annual', -- 'Annual', 'Monthly', 'One-Time'
  compound_escalation BOOLEAN DEFAULT true,

  -- CPI-specific
  cpi_index VARCHAR(100), -- 'CPI-U', 'CPI-W'
  cpi_floor_pct NUMERIC(5,2),
  cpi_cap_pct NUMERIC(5,2),
  tenant_cpi_share_pct NUMERIC(5,2) DEFAULT 100.00,

  -- Fixed Dollar
  annual_increase_amount NUMERIC(15,2),

  -- Stepped Schedule
  step_schedule JSONB, -- [{step_start_date, step_amount}, ...]

  first_escalation_date DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_escalation_lease ON landscape.tbl_escalation(lease_id);
```

#### `tbl_recovery`
Expense recovery structures (CAM, Tax, Insurance).

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_recovery (
  recovery_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES tbl_lease(lease_id) ON DELETE CASCADE,

  recovery_structure VARCHAR(50) DEFAULT 'Triple Net', -- 'None', 'Single Net', 'Double Net', 'Triple Net', 'Modified Gross', 'Full Service'
  expense_cap_pct NUMERIC(5,2), -- annual cap on increases

  -- Recovery Categories (stored as JSONB for flexibility)
  categories JSONB NOT NULL, -- [{name, included, cap, basis}, ...]
  -- Example: [
  --   {name: 'CAM', included: true, cap: 4, basis: 'Pro Rata'},
  --   {name: 'Taxes', included: true, cap: 3, basis: 'Stop'},
  --   {name: 'Insurance', included: true, cap: 2, basis: 'Pro Rata'}
  -- ]

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(lease_id)
);

CREATE INDEX idx_recovery_lease ON landscape.tbl_recovery(lease_id);
```

#### `tbl_additional_income`
Parking, signage, percentage rent, etc.

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_additional_income (
  additional_income_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES tbl_lease(lease_id) ON DELETE CASCADE,

  -- Parking
  parking_spaces INTEGER DEFAULT 0,
  parking_rate_monthly NUMERIC(10,2),
  parking_annual NUMERIC(15,2), -- calculated

  -- Other Income Items (flexible structure)
  other_income JSONB DEFAULT '[]', -- [{label, amount, frequency}, ...]

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(lease_id)
);

CREATE INDEX idx_additional_income_lease ON landscape.tbl_additional_income(lease_id);
```

#### `tbl_tenant_improvement`
TI/LC allowances and costs.

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_tenant_improvement (
  tenant_improvement_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES tbl_lease(lease_id) ON DELETE CASCADE,

  allowance_psf NUMERIC(10,2),
  allowance_total NUMERIC(15,2),
  actual_cost NUMERIC(15,2),
  landlord_contribution NUMERIC(15,2),
  reimbursement_structure VARCHAR(50) DEFAULT 'Upfront', -- 'Upfront', 'Amortized', 'Blend'
  amortization_months INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(lease_id)
);

CREATE INDEX idx_ti_lease ON landscape.tbl_tenant_improvement(lease_id);
```

#### `tbl_leasing_commission`
Broker commissions.

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_leasing_commission (
  commission_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES tbl_lease(lease_id) ON DELETE CASCADE,

  base_commission_pct NUMERIC(5,2),
  renewal_commission_pct NUMERIC(5,2),

  -- Tiered commissions
  tiers JSONB DEFAULT '[]', -- [{breakpoint_psf, rate_pct}, ...]

  commission_amount NUMERIC(15,2), -- calculated

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(lease_id)
);

CREATE INDEX idx_commission_lease ON landscape.tbl_leasing_commission(lease_id);
```

---

## Financial Model

### Budget & Cost Tables

#### `tbl_budget` (Existing - Enhanced)
Already exists, links to phases.

**Enhancement:** Add expense categorization for operating vs capital.

```sql
ALTER TABLE landscape.tbl_budget ADD COLUMN IF NOT EXISTS
  expense_type VARCHAR(50) DEFAULT 'Capital', -- 'Capital', 'Operating'
  budget_timing_method VARCHAR(50) DEFAULT 'Lump Sum'; -- 'Lump Sum', 'S-Curve', 'Linear', 'Custom'
```

#### `tbl_operating_expense`
Ongoing property operating expenses (for income properties).

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_operating_expense (
  expense_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,
  parcel_id INTEGER REFERENCES tbl_parcel(parcel_id),

  expense_category VARCHAR(100) NOT NULL, -- 'Management Fee', 'Utilities', 'Repairs & Maintenance', 'Insurance', 'Property Tax', 'Marketing'
  expense_subcategory VARCHAR(100),

  -- Amount Structure
  amount_type VARCHAR(50) DEFAULT 'Annual', -- 'Annual', 'Monthly', 'Per SF', 'Percentage of Revenue'
  amount NUMERIC(15,2),
  amount_psf NUMERIC(10,2),
  percentage_of_revenue NUMERIC(5,2),

  -- Recoverable?
  is_recoverable BOOLEAN DEFAULT true,
  recovery_pool VARCHAR(50), -- 'CAM', 'Operating', 'Tax', 'Insurance'

  -- Growth
  annual_growth_pct NUMERIC(5,2) DEFAULT 3.00,

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_opex_project ON landscape.tbl_operating_expense(project_id);
CREATE INDEX idx_opex_category ON landscape.tbl_operating_expense(expense_category);
```

### Financing Tables

#### `tbl_loan`
Debt facilities (construction, permanent, mezzanine).

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_loan (
  loan_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,

  loan_name VARCHAR(255) NOT NULL,
  loan_type VARCHAR(50) NOT NULL, -- 'Construction', 'Permanent', 'Bridge', 'Mezzanine'
  lender_name VARCHAR(255),

  -- Principal
  commitment_amount NUMERIC(15,2) NOT NULL,
  loan_to_cost_pct NUMERIC(5,2),
  loan_to_value_pct NUMERIC(5,2),

  -- Interest
  interest_rate_pct NUMERIC(6,3) NOT NULL,
  interest_type VARCHAR(50) DEFAULT 'Floating', -- 'Fixed', 'Floating'
  interest_index VARCHAR(50), -- 'SOFR', 'Prime', 'Fixed'
  interest_spread_bps INTEGER,

  -- Fees
  origination_fee_pct NUMERIC(5,2),
  exit_fee_pct NUMERIC(5,2),
  unused_fee_pct NUMERIC(5,2),

  -- Terms
  loan_term_months INTEGER,
  amortization_months INTEGER,
  interest_only_months INTEGER DEFAULT 0,

  -- Dates
  loan_start_date DATE,
  loan_maturity_date DATE,

  -- Reserve
  interest_reserve_amount NUMERIC(15,2),
  interest_reserve_funded_upfront BOOLEAN DEFAULT false,

  -- Payment
  payment_frequency VARCHAR(50) DEFAULT 'Monthly', -- 'Monthly', 'Quarterly'

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loan_project ON landscape.tbl_loan(project_id);
CREATE INDEX idx_loan_type ON landscape.tbl_loan(loan_type);
```

#### `tbl_equity`
Equity contributions and structure.

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_equity (
  equity_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,

  equity_name VARCHAR(255) NOT NULL,
  equity_class VARCHAR(50) NOT NULL, -- 'Class A', 'Class B', 'GP', 'LP', 'Sponsor', 'Investor'
  equity_tier INTEGER DEFAULT 1, -- for waterfall sequencing

  commitment_amount NUMERIC(15,2) NOT NULL,
  funded_amount NUMERIC(15,2) DEFAULT 0,

  -- Preferred Return
  preferred_return_pct NUMERIC(5,2),
  preferred_return_compounds BOOLEAN DEFAULT false,

  -- Promote/Carried Interest
  promote_pct NUMERIC(5,2), -- after pref return
  promote_tier_2_threshold NUMERIC(15,2), -- IRR threshold for tier 2 promote
  promote_tier_2_pct NUMERIC(5,2),

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_equity_project ON landscape.tbl_equity(project_id);
CREATE INDEX idx_equity_tier ON landscape.tbl_equity(project_id, equity_tier);
```

#### `tbl_waterfall`
Cash flow distribution waterfall definitions.

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_waterfall (
  waterfall_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,

  waterfall_name VARCHAR(255) NOT NULL,

  -- Tier definitions stored as ordered JSONB array
  tiers JSONB NOT NULL,
  -- Example structure:
  -- [
  --   {tier: 1, description: 'Return of Capital', equity_class: 'All', pct: 100},
  --   {tier: 2, description: 'Preferred Return (8%)', equity_class: 'Class A', pct: 100, hurdle_irr: 8},
  --   {tier: 3, description: 'Catch-Up', equity_class: 'GP', pct: 100, until_gp_reaches_pct: 20},
  --   {tier: 4, description: 'Split', equity_class_splits: [{class: 'GP', pct: 20}, {class: 'LP', pct: 80}]}
  -- ]

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_waterfall_project ON landscape.tbl_waterfall(project_id);
```

---

## Calculation Engine

### Timeline & Cash Flow Tables

#### `tbl_calculation_period`
Time periods for cash flow modeling. ✓ Exists

**Enhancement:**
```sql
ALTER TABLE landscape.tbl_calculation_period ADD COLUMN IF NOT EXISTS
  period_type VARCHAR(50) DEFAULT 'Monthly', -- 'Monthly', 'Quarterly', 'Annual'
  fiscal_year INTEGER,
  fiscal_quarter INTEGER;
```

#### `tbl_cashflow`
Calculated cash flows by period (materialized).

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_cashflow (
  cashflow_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,
  period_id INTEGER NOT NULL REFERENCES tbl_calculation_period(period_id) ON DELETE CASCADE,

  -- Dimensional slicing
  parcel_id INTEGER REFERENCES tbl_parcel(parcel_id),
  phase_id INTEGER REFERENCES tbl_phase(phase_id),
  lot_id INTEGER REFERENCES tbl_lot(lot_id),
  lease_id INTEGER REFERENCES tbl_lease(lease_id),

  cashflow_category VARCHAR(100) NOT NULL, -- 'Revenue', 'Operating Expense', 'Capital Expense', 'Financing', 'Distribution'
  cashflow_subcategory VARCHAR(100),

  -- Amounts
  amount NUMERIC(15,2) NOT NULL,
  cumulative_amount NUMERIC(15,2),

  -- Calculation Metadata
  calculation_method VARCHAR(50), -- 'S-Curve', 'Linear', 'Lump Sum', 'Lease Schedule'
  source_table VARCHAR(100),
  source_id INTEGER,

  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uq_cashflow_period_source UNIQUE(project_id, period_id, cashflow_category, cashflow_subcategory, source_table, source_id)
);

CREATE INDEX idx_cashflow_project ON landscape.tbl_cashflow(project_id, period_id);
CREATE INDEX idx_cashflow_category ON landscape.tbl_cashflow(cashflow_category);
CREATE INDEX idx_cashflow_parcel ON landscape.tbl_cashflow(parcel_id, period_id);
CREATE INDEX idx_cashflow_lease ON landscape.tbl_cashflow(lease_id, period_id);
```

#### `tbl_cashflow_summary`
Aggregated financial metrics by period.

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_cashflow_summary (
  summary_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,
  period_id INTEGER NOT NULL REFERENCES tbl_calculation_period(period_id) ON DELETE CASCADE,

  -- Income Statement
  gross_revenue NUMERIC(15,2) DEFAULT 0,
  vacancy_loss NUMERIC(15,2) DEFAULT 0,
  credit_loss NUMERIC(15,2) DEFAULT 0,
  effective_gross_income NUMERIC(15,2) DEFAULT 0,

  operating_expenses NUMERIC(15,2) DEFAULT 0,
  net_operating_income NUMERIC(15,2) DEFAULT 0,

  -- Below-line items
  capital_expenditures NUMERIC(15,2) DEFAULT 0,
  tenant_improvements NUMERIC(15,2) DEFAULT 0,
  leasing_commissions NUMERIC(15,2) DEFAULT 0,

  debt_service NUMERIC(15,2) DEFAULT 0,
  interest_expense NUMERIC(15,2) DEFAULT 0,
  principal_payment NUMERIC(15,2) DEFAULT 0,

  -- Cash flows
  cash_flow_before_tax NUMERIC(15,2) DEFAULT 0,
  equity_contributions NUMERIC(15,2) DEFAULT 0,
  equity_distributions NUMERIC(15,2) DEFAULT 0,

  net_cash_flow NUMERIC(15,2) DEFAULT 0,
  cumulative_net_cash_flow NUMERIC(15,2) DEFAULT 0,

  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(project_id, period_id)
);

CREATE INDEX idx_summary_project ON landscape.tbl_cashflow_summary(project_id, period_id);
```

#### `tbl_project_metrics`
Final project-level return metrics.

```sql
CREATE TABLE IF NOT EXISTS landscape.tbl_project_metrics (
  metrics_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES tbl_project(project_id) ON DELETE CASCADE,

  -- Investment Metrics
  total_equity_invested NUMERIC(15,2),
  total_debt_proceeds NUMERIC(15,2),
  total_project_cost NUMERIC(15,2),

  -- Returns
  project_irr_pct NUMERIC(6,3),
  equity_irr_pct NUMERIC(6,3),
  levered_irr_pct NUMERIC(6,3),
  unlevered_irr_pct NUMERIC(6,3),

  equity_multiple NUMERIC(6,3),

  -- Value Metrics
  stabilized_noi NUMERIC(15,2),
  exit_cap_rate_pct NUMERIC(5,2),
  exit_value NUMERIC(15,2),

  residual_land_value_per_acre NUMERIC(15,2),
  residual_land_value_per_unit NUMERIC(15,2),

  -- Debt Coverage
  peak_debt NUMERIC(15,2),
  avg_dscr NUMERIC(6,3),
  min_dscr NUMERIC(6,3),

  -- Timing
  development_duration_months INTEGER,
  absorption_duration_months INTEGER,

  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  calculation_version INTEGER DEFAULT 1,

  UNIQUE(project_id, calculation_version)
);

CREATE INDEX idx_metrics_project ON landscape.tbl_project_metrics(project_id);
```

---

## Implementation Phases

### Phase 1: Schema Foundation ✓
**Timeline:** Days 1-3
**Deliverables:**
- [ ] Run migration script to create all new tables
- [ ] Add new columns to existing tables
- [ ] Create indexes and foreign key constraints
- [ ] Populate enumerations and lookup tables
- [ ] Create database functions for common calculations

**SQL Migration File:** `migrations/001_financial_engine_schema.sql`

### Phase 2: API Endpoints
**Timeline:** Days 4-7
**Deliverables:**
- [ ] CRUD APIs for all new tables
- [ ] `/api/project/[id]/cashflow` - GET cash flow timeline
- [ ] `/api/project/[id]/summary` - GET financial summary
- [ ] `/api/project/[id]/calculate` - POST trigger recalculation
- [ ] `/api/lease/[id]/*` - Convert from mock to database-backed
- [ ] Validation middleware for financial constraints

### Phase 3A: Land & Development Logic
**Timeline:** Days 8-10
**Deliverables:**
- [ ] S-curve distribution engine
- [ ] Lot-level absorption modeling
- [ ] Parcel & phase cash flow aggregation
- [ ] NPV/IRR calculation functions
- [ ] Residual land value solver

### Phase 3B: Income & Lease Modeling
**Timeline:** Days 11-14
**Deliverables:**
- [ ] Rent schedule generation with escalations
- [ ] Expense recovery calculations
- [ ] Vacancy & credit loss modeling
- [ ] NOI calculation by period
- [ ] WALT (Weighted Average Lease Term) calculator
- [ ] Lease rollover assumptions

### Phase 3C: Financing & Waterfall
**Timeline:** Days 15-17
**Deliverables:**
- [ ] Loan draw schedule generator
- [ ] Debt service calculator (P&I)
- [ ] Interest reserve tracker
- [ ] Equity waterfall distribution engine
- [ ] Multi-tier promote calculator
- [ ] DSCR calculation by period

### Phase 4: UI Integration
**Timeline:** Days 18-22
**Deliverables:**
- [ ] React data grid for lease entry (Handsontable or similar)
- [ ] Budget editor with timing curves
- [ ] Cash flow timeline chart (Recharts)
- [ ] Financial summary dashboard
- [ ] Sensitivity analysis inputs

### Phase 5: Validation & Benchmarking
**Timeline:** Days 23-25
**Deliverables:**
- [ ] Unit tests for calculation functions
- [ ] Integration tests for API endpoints
- [ ] ARGUS benchmark comparison script
- [ ] Variance tolerance reporting (±0.01%)

### Phase 6: Reporting & Exports
**Timeline:** Days 26-28
**Deliverables:**
- [ ] PDF export (React-PDF or similar)
- [ ] Excel export (XLSX)
- [ ] ARGUS-style cash flow report template
- [ ] Executive summary template

### Phase 7: AI Enhancements
**Timeline:** Days 29-31
**Deliverables:**
- [ ] Lease document extraction (using existing AI infrastructure)
- [ ] Market benchmark comparison
- [ ] Auto-commentary for metrics
- [ ] Assumption validation against market data

### Phase 8: ARGUS Parity Verification
**Timeline:** Days 32-35
**Deliverables:**
- [ ] Field-by-field ARGUS comparison
- [ ] Test portfolio of benchmark deals
- [ ] Documentation of parity status
- [ ] Known limitations & roadmap

---

## ARGUS Parity Mapping

### ARGUS Developer → Landscape Mapping

| ARGUS Concept | Landscape Table(s) | Status |
|--------------|-------------------|--------|
| Project | `tbl_project` | ✓ Existing |
| Parcel | `tbl_parcel` | ✓ Existing |
| Phase | `tbl_phase` | ✓ Existing |
| Product Type | `tbl_landuse`, `res_lot_product` | ✓ Existing |
| Budget Line | `tbl_budget`, `core_fin_fact_budget` | ✓ Existing |
| Cost Timing | S-curve engine (to build) | ⧗ Phase 3A |
| Absorption | Lot-level sales schedule | ⧗ Phase 3A |

### ARGUS Enterprise (Income) → Landscape Mapping

| ARGUS Concept | Landscape Table(s) | Status |
|--------------|-------------------|--------|
| Lease | `tbl_lease` | ⧗ Phase 1 |
| Rent Schedule | `tbl_base_rent` | ⧗ Phase 1 |
| Rent Steps | `tbl_base_rent` periods | ⧗ Phase 1 |
| Escalations | `tbl_escalation` | ⧗ Phase 1 |
| Recoveries | `tbl_recovery` | ⧗ Phase 1 |
| Operating Expenses | `tbl_operating_expense` | ⧗ Phase 1 |
| Expense Pools | Recovery pool field | ⧗ Phase 1 |
| Vacancy & Credit Loss | Calculation engine | ⧗ Phase 3B |
| TI/LC | `tbl_tenant_improvement`, `tbl_leasing_commission` | ⧗ Phase 1 |
| Cash Flow | `tbl_cashflow`, `tbl_cashflow_summary` | ⧗ Phase 1 |
| Loan | `tbl_loan` | ⧗ Phase 1 |
| Waterfall | `tbl_waterfall`, `tbl_equity` | ⧗ Phase 1 |
| Returns (IRR, EM) | `tbl_project_metrics` | ⧗ Phase 1 |

### Key ARGUS Features Requiring Custom Logic

1. **Expense Recovery Calculation**
   - Base Year / Stop / Pro Rata methods
   - Pool allocations (CAM vs Tax vs Insurance)
   - Caps and floors

2. **CPI Escalations**
   - Index lookups (need market data integration)
   - Floor/cap application
   - Tenant share percentage

3. **Percentage Rent**
   - Breakpoint calculations
   - Natural vs artificial breakpoint
   - Tenant sales tracking integration

4. **Turnover Rent**
   - Market rent reversion
   - Downtime modeling
   - Re-leasing costs

5. **Multi-Tenant Aggregation**
   - Rent roll summaries
   - WALT calculations
   - Rollover schedules

---

## Next Steps

1. **Review & Approve Schema Design**
2. **Generate Migration SQL Script**
3. **Execute Phase 1 Migration**
4. **Begin Phase 2 API Implementation**

---

**Document Maintained By:** Claude Code
**Last Updated:** 2025-10-13
**Related Files:**
- `migrations/001_financial_engine_schema.sql` (to be created)
- `src/types/financial-engine.ts` (to be created)
- `src/lib/financial-engine/` (calculation engine, to be created)
