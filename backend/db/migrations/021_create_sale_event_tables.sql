-- ============================================================================
-- Migration 021: Create Sale Event and Closing Event Tables
-- ============================================================================
-- Purpose: Create tbl_parcel_sale_event and tbl_closing_event tables
--          These replace the virtual "sale phase" system with proper
--          sale contract tracking and multi-closing support
-- Date: 2025-11-14
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Create tbl_parcel_sale_event (parent sale contract)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_parcel_sale_event (
  sale_event_id         BIGSERIAL PRIMARY KEY,
  project_id            INTEGER NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  parcel_id             BIGINT NOT NULL,
  phase_id              INTEGER,

  -- Sale contract details
  sale_type             VARCHAR(50) NOT NULL CHECK (sale_type IN ('single_closing', 'multi_closing', 'structured_sale', 'bulk_assignment')),
  buyer_entity          VARCHAR(200),
  buyer_contact_id      INTEGER,
  contract_date         DATE,
  total_lots_contracted INTEGER NOT NULL,
  base_price_per_lot    NUMERIC(12,2),
  price_escalation_formula TEXT,

  -- Deposit and escrow
  deposit_amount        NUMERIC(12,2),
  deposit_date          DATE,
  deposit_terms         VARCHAR(100),
  deposit_applied_to_purchase BOOLEAN DEFAULT TRUE,
  has_escrow_holdback   BOOLEAN DEFAULT FALSE,
  escrow_holdback_amount NUMERIC(12,2),
  escrow_release_terms  TEXT,

  -- Custom overrides (apply to all closings in this sale)
  commission_pct        NUMERIC(5,2),
  closing_cost_per_unit NUMERIC(12,2),
  onsite_cost_pct       NUMERIC(5,2),
  has_custom_overrides  BOOLEAN DEFAULT FALSE,

  -- Status
  sale_status           VARCHAR(50) DEFAULT 'pending' CHECK (sale_status IN ('pending', 'active', 'closed', 'cancelled')),
  notes                 TEXT,

  -- Audit
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),

  CONSTRAINT sale_event_units_positive CHECK (total_lots_contracted > 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_event_project ON landscape.tbl_parcel_sale_event(project_id);
CREATE INDEX IF NOT EXISTS idx_sale_event_parcel ON landscape.tbl_parcel_sale_event(parcel_id);
CREATE INDEX IF NOT EXISTS idx_sale_event_type ON landscape.tbl_parcel_sale_event(sale_type);
CREATE INDEX IF NOT EXISTS idx_sale_event_status ON landscape.tbl_parcel_sale_event(sale_status);

COMMENT ON TABLE landscape.tbl_parcel_sale_event IS 'Master sale contract records for parcels (replaces virtual sale phases)';
COMMENT ON COLUMN landscape.tbl_parcel_sale_event.sale_type IS 'Type: single_closing, multi_closing, structured_sale, bulk_assignment';
COMMENT ON COLUMN landscape.tbl_parcel_sale_event.total_lots_contracted IS 'Total units/lots in this sale contract';
COMMENT ON COLUMN landscape.tbl_parcel_sale_event.commission_pct IS 'Custom commission % override (e.g., 3.0 = 3%)';
COMMENT ON COLUMN landscape.tbl_parcel_sale_event.closing_cost_per_unit IS 'Custom closing cost per unit override (e.g., $750)';
COMMENT ON COLUMN landscape.tbl_parcel_sale_event.onsite_cost_pct IS 'Custom onsite cost % override (e.g., 6.5 = 6.5%)';

-- ============================================================================
-- PART 2: Create tbl_closing_event (individual closings/takedowns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_closing_event (
  closing_id            BIGSERIAL PRIMARY KEY,
  sale_event_id         BIGINT NOT NULL REFERENCES landscape.tbl_parcel_sale_event(sale_event_id) ON DELETE CASCADE,

  -- Closing identification
  closing_sequence      INTEGER NOT NULL,
  closing_date          DATE NOT NULL,
  lots_closed           INTEGER NOT NULL,

  -- Price calculation (populated by backend)
  base_price_per_unit   NUMERIC(12,2),
  inflated_price_per_unit NUMERIC(12,2),
  uom_code              VARCHAR(10),

  -- Gross value
  gross_proceeds        NUMERIC(15,2),
  gross_value           NUMERIC(15,2),

  -- Deductions (calculated by backend)
  onsite_costs          NUMERIC(15,2),
  less_commissions_amount NUMERIC(12,2),
  commission_amount     NUMERIC(15,2),
  less_closing_costs    NUMERIC(12,2),
  closing_costs         NUMERIC(15,2),
  less_improvements_credit NUMERIC(12,2),

  -- Net proceeds
  net_proceeds          NUMERIC(15,2),

  -- Cumulative tracking
  cumulative_lots_closed INTEGER,
  lots_remaining        INTEGER,

  -- Escrow
  escrow_release_amount NUMERIC(12,2),
  escrow_release_date   DATE,

  -- Audit
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),

  CONSTRAINT closing_units_positive CHECK (lots_closed > 0),
  CONSTRAINT closing_sequence_positive CHECK (closing_sequence > 0),
  UNIQUE(sale_event_id, closing_sequence)
);

CREATE INDEX IF NOT EXISTS idx_closing_sale_event ON landscape.tbl_closing_event(sale_event_id);
CREATE INDEX IF NOT EXISTS idx_closing_date ON landscape.tbl_closing_event(closing_date);
CREATE INDEX IF NOT EXISTS idx_closing_sequence ON landscape.tbl_closing_event(sale_event_id, closing_sequence);

COMMENT ON TABLE landscape.tbl_closing_event IS 'Individual closing/takedown records within a sale event';
COMMENT ON COLUMN landscape.tbl_closing_event.closing_sequence IS 'Closing number within sale (1, 2, 3, ...)';
COMMENT ON COLUMN landscape.tbl_closing_event.lots_closed IS 'Number of units/lots closing in this takedown';
COMMENT ON COLUMN landscape.tbl_closing_event.inflated_price_per_unit IS 'Price per unit after applying growth rate from base date to closing date';
COMMENT ON COLUMN landscape.tbl_closing_event.gross_value IS 'Gross sale value (lots_closed × inflated_price_per_unit)';
COMMENT ON COLUMN landscape.tbl_closing_event.net_proceeds IS 'Net proceeds after all deductions';

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================

-- Test: Check tables exist
-- SELECT * FROM landscape.tbl_parcel_sale_event LIMIT 1;
-- SELECT * FROM landscape.tbl_closing_event LIMIT 1;
