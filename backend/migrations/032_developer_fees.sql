-- Migration 032: Developer Fees Table
-- Phase 5: Capitalization Tab - Developer operations

CREATE TABLE IF NOT EXISTS landscape.developer_fees (
  id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  fee_type VARCHAR(50), -- acquisition, development, asset_management, disposition
  fee_description VARCHAR(500),
  basis_type VARCHAR(50), -- percent_of_cost, percent_of_value, flat_fee
  basis_value NUMERIC(12,2),
  calculated_amount NUMERIC(15,2),
  payment_timing VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending', -- pending, accrued, paid
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_developer_fees_project ON landscape.developer_fees(project_id);

COMMENT ON TABLE landscape.developer_fees IS 'Developer fees and compensation tracking';
COMMENT ON COLUMN landscape.developer_fees.basis_type IS 'How fee is calculated: percent_of_cost, percent_of_value, or flat_fee';
